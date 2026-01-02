-- ============================================
-- Extended Authentication Functions
-- Funciones para registro, recuperación de contraseña y administración
-- ============================================

-- Función para registrar nuevo usuario (no activo por defecto)
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
    -- Verificar si el email ya existe
    IF EXISTS (SELECT 1 FROM app_users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email already registered';
    END IF;

    -- Crear usuario inactivo (requiere aprobación de admin)
    INSERT INTO app_users (email, password_hash, display_name, role, is_active)
    VALUES (p_email, p_password_hash, p_display_name, p_role, false)
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_user TO anon, authenticated, service_role;

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
    -- Buscar usuario
    SELECT id INTO v_user_id
    FROM app_users
    WHERE email = p_email AND is_active = true;
    
    IF v_user_id IS NULL THEN
        -- No revelar si el email existe o no por seguridad
        RETURN NULL;
    END IF;
    
    -- Generar token único
    v_token := 'reset_' || gen_random_uuid()::TEXT || '_' || extract(epoch from now())::TEXT;
    
    -- Limpiar tokens expirados o usados del usuario
    DELETE FROM password_reset_tokens 
    WHERE user_id = v_user_id 
        AND (expires_at < NOW() OR used = true);
    
    -- Crear nuevo token (válido por 1 hora)
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (v_user_id, v_token, NOW() + INTERVAL '1 hour')
    RETURNING token INTO v_token;
    
    RETURN v_token;
END;
$$;

GRANT EXECUTE ON FUNCTION request_password_reset TO anon, authenticated, service_role;

-- Función para resetear contraseña con token
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
    -- Buscar token válido
    SELECT user_id INTO v_user_id
    FROM password_reset_tokens
    WHERE token = p_token
        AND expires_at > NOW()
        AND used = false;
    
    IF v_user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Actualizar contraseña
    UPDATE app_users
    SET password_hash = p_new_password_hash
    WHERE id = v_user_id;
    
    -- Marcar token como usado
    UPDATE password_reset_tokens
    SET used = true
    WHERE token = p_token;
    
    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION reset_password TO anon, authenticated, service_role;

-- Función para aprobar usuario (solo admin)
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

-- Función para desaprobar usuario (solo admin)
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
    
    -- Cerrar todas las sesiones del usuario
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION deactivate_user TO authenticated, service_role;

-- Función para obtener todos los usuarios (para admin)
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

-- Solo authenticated y service_role pueden acceder (NO anon por seguridad)
GRANT EXECUTE ON FUNCTION get_all_users TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION get_all_users FROM anon;

-- Función para actualizar rol de usuario (solo admin)
CREATE OR REPLACE FUNCTION update_user_role(
    p_user_id UUID,
    p_new_role VARCHAR(50)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validar rol
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





