-- ============================================
-- Authentication Functions
-- Funciones para autenticación y gestión de sesiones
-- CON PERMISOS PARA RPC
-- ============================================

-- Función para crear un nuevo usuario
CREATE OR REPLACE FUNCTION create_user(
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
    INSERT INTO app_users (email, password_hash, display_name, role)
    VALUES (p_email, p_password_hash, p_display_name, p_role)
    RETURNING id INTO v_user_id;
    
    RETURN v_user_id;
END;
$$;

-- Otorgar permisos para RPC
GRANT EXECUTE ON FUNCTION create_user TO anon, authenticated, service_role;

-- Función para autenticar usuario (verificar email y password)
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
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.display_name,
        u.role,
        u.is_active
    FROM app_users u
    WHERE u.email = p_email
        AND u.password_hash = p_password_hash
        AND u.is_active = true;
    
    -- Actualizar last_login_at si se encontró el usuario
    UPDATE app_users
    SET last_login_at = NOW()
    WHERE email = p_email
        AND password_hash = p_password_hash
        AND is_active = true;
END;
$$;

-- Otorgar permisos para RPC
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

-- Otorgar permisos para RPC
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
    -- Limpiar sesiones expiradas primero
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
    
    -- Actualizar last_activity_at si la sesión es válida
    UPDATE user_sessions
    SET last_activity_at = NOW()
    WHERE token = p_token
        AND expires_at > NOW();
END;
$$;

-- Otorgar permisos para RPC
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

-- Otorgar permisos para RPC
GRANT EXECUTE ON FUNCTION logout_session TO anon, authenticated, service_role;

-- Función para cerrar todas las sesiones de un usuario
CREATE OR REPLACE FUNCTION logout_all_sessions(
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$;

-- Otorgar permisos para RPC
GRANT EXECUTE ON FUNCTION logout_all_sessions TO anon, authenticated, service_role;

-- Función para obtener información del usuario por ID
CREATE OR REPLACE FUNCTION get_user_by_id(
    p_user_id UUID
)
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
    WHERE u.id = p_user_id;
END;
$$;

-- Otorgar permisos para RPC
GRANT EXECUTE ON FUNCTION get_user_by_id TO anon, authenticated, service_role;
