-- ============================================
-- SETUP COMPLETO DE AUTENTICACIÓN Y ADMINISTRACIÓN DE USUARIOS
-- Ejecuta este script completo en Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTE 1: SCHEMA (TABLAS)
-- ============================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Regular' CHECK (role IN ('admin', '3amigos', 'Stakeholder', 'PM', 'Regular')),
    is_active BOOLEAN DEFAULT false, -- Requiere aprobación de admin
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para tokens de recuperación de contraseña
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at
    BEFORE UPDATE ON app_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security)
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Allow all on app_users" ON app_users;
CREATE POLICY "Allow all on app_users" ON app_users FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all on user_sessions" ON user_sessions;
CREATE POLICY "Allow all on user_sessions" ON user_sessions FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all on password_reset_tokens" ON password_reset_tokens;
CREATE POLICY "Allow all on password_reset_tokens" ON password_reset_tokens FOR ALL 
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

-- ============================================
-- PARTE 2: FUNCIONES BÁSICAS DE AUTENTICACIÓN
-- ============================================

-- Función para autenticar usuario
CREATE OR REPLACE FUNCTION authenticate_user(
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255)
)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR(255),
    display_name VARCHAR(255),
    role VARCHAR(50),
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT u.id INTO v_user_id
    FROM app_users u
    WHERE u.email = p_email
        AND u.password_hash = p_password_hash
        AND u.is_active = true;
    
    IF v_user_id IS NOT NULL THEN
        UPDATE app_users
        SET last_login_at = NOW()
        WHERE id = v_user_id;
        
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u.display_name,
            u.role,
            u.is_active
        FROM app_users u
        WHERE u.id = v_user_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION authenticate_user TO anon, authenticated, service_role;

-- Función para crear sesión
CREATE OR REPLACE FUNCTION create_session(
    p_user_id UUID,
    p_token VARCHAR(500),
    p_expires_in_hours INTEGER DEFAULT 24
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO user_sessions (user_id, token, expires_at)
    VALUES (p_user_id, p_token, NOW() + (p_expires_in_hours || ' hours')::INTERVAL)
    RETURNING id INTO v_session_id;
    
    RETURN v_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_session TO anon, authenticated, service_role;

-- Función para validar sesión
CREATE OR REPLACE FUNCTION validate_session(
    p_token VARCHAR(500)
)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR(255),
    display_name VARCHAR(255),
    role VARCHAR(50)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM cleanup_expired_sessions();
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.display_name,
        u.role
    FROM user_sessions s
    INNER JOIN app_users u ON s.user_id = u.id
    WHERE s.token = p_token
        AND s.expires_at > NOW()
        AND u.is_active = true;
    
    UPDATE user_sessions
    SET last_activity_at = NOW()
    WHERE token = p_token
        AND expires_at > NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION validate_session TO anon, authenticated, service_role;

-- Función para cerrar sesión
CREATE OR REPLACE FUNCTION logout_session(
    p_token VARCHAR(500)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM user_sessions WHERE token = p_token;
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION logout_session TO anon, authenticated, service_role;

-- ============================================
-- PARTE 3: FUNCIONES DE ADMINISTRACIÓN
-- ============================================

-- Función para registrar nuevo usuario
CREATE OR REPLACE FUNCTION register_user(
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255),
    p_display_name VARCHAR(255),
    p_role VARCHAR(50) DEFAULT 'Regular'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF EXISTS (SELECT 1 FROM app_users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    INSERT INTO app_users (email, password_hash, display_name, role, is_active)
    VALUES (p_email, p_password_hash, p_display_name, p_role, false)
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_user TO anon, authenticated, service_role;

-- Función para obtener todos los usuarios (SIN PARÁMETROS - como espera el código)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    display_name VARCHAR(255),
    role VARCHAR(50),
    is_active BOOLEAN,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.is_active,
        u.last_login_at,
        u.created_at
    FROM app_users u
    ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION get_all_users() FROM anon;

-- Función para aprobar usuario
CREATE OR REPLACE FUNCTION approve_user(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE app_users
    SET is_active = true
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_user TO authenticated, service_role;

-- Función para desactivar usuario
CREATE OR REPLACE FUNCTION deactivate_user(
    p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE app_users
    SET is_active = false
    WHERE id = p_user_id;
    
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION deactivate_user TO authenticated, service_role;

-- Función para actualizar rol de usuario
CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_new_role NOT IN ('admin', '3amigos', 'Stakeholder', 'PM', 'Regular') THEN
        RAISE EXCEPTION 'Invalid role';
    END IF;
    
    UPDATE app_users
    SET role = p_new_role
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_role TO authenticated, service_role;

-- Función para solicitar recuperación de contraseña
CREATE OR REPLACE FUNCTION request_password_reset(
    p_email VARCHAR(255)
)
RETURNS VARCHAR(500)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_token VARCHAR(500);
BEGIN
    SELECT id INTO v_user_id
    FROM app_users
    WHERE email = p_email AND is_active = true;
    
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_token := 'reset_' || gen_random_uuid()::TEXT || '_' || extract(epoch from now())::TEXT;
    
    DELETE FROM password_reset_tokens 
    WHERE user_id = v_user_id 
        AND (expires_at < NOW() OR used = true);
    
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (v_user_id, v_token, NOW() + INTERVAL '1 hour')
    RETURNING token INTO v_token;
    
    RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION request_password_reset TO anon, authenticated, service_role;

-- Función para resetear contraseña
CREATE OR REPLACE FUNCTION reset_password(
    p_token VARCHAR(500),
    p_new_password_hash VARCHAR(255)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT user_id INTO v_user_id
    FROM password_reset_tokens
    WHERE token = p_token
        AND expires_at > NOW()
        AND used = false;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    UPDATE app_users
    SET password_hash = p_new_password_hash
    WHERE id = v_user_id;
    
    UPDATE password_reset_tokens
    SET used = true
    WHERE token = p_token;
    
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_password TO anon, authenticated, service_role;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- 
-- Después de ejecutar este script, puedes crear un usuario admin manualmente:
-- 
-- INSERT INTO app_users (email, password_hash, display_name, role, is_active)
-- VALUES (
--     'admin@example.com',
--     'BASE64_ENCODED_PASSWORD',  -- Usa btoa('tu_password') en JavaScript
--     'Admin User',
--     'admin',
--     true
-- );
-- 
-- ============================================
