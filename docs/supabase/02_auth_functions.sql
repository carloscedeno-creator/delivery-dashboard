-- ============================================
-- Authentication Functions
-- Funciones para autenticación y gestión de sesiones
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

-- Crear tipo compuesto para evitar ambigüedad
DROP TYPE IF EXISTS authenticate_user_result CASCADE;
CREATE TYPE authenticate_user_result AS (
    user_id UUID,
    user_email VARCHAR(255),
    display_name VARCHAR(255),
    role VARCHAR(50),
    is_active BOOLEAN
);

-- Función para autenticar usuario (verificar email y password)
DROP FUNCTION IF EXISTS authenticate_user(VARCHAR(255), VARCHAR(255));

CREATE FUNCTION authenticate_user(
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255)
)
RETURNS SETOF authenticate_user_result
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_result authenticate_user_result;
BEGIN
    -- Buscar el usuario y actualizar last_login_at en una sola operación
    UPDATE public.app_users au
    SET last_login_at = NOW()
    WHERE au.email = authenticate_user.p_email
        AND au.password_hash = authenticate_user.p_password_hash
        AND au.is_active = true
    RETURNING au.id INTO v_user_id;
    
    -- Si se encontró, construir el resultado y retornarlo
    IF v_user_id IS NOT NULL THEN
        SELECT 
            au.id,
            au.email,
            au.display_name,
            au.role,
            au.is_active
        INTO 
            v_result.user_id,
            v_result.user_email,
            v_result.display_name,
            v_result.role,
            v_result.is_active
        FROM public.app_users au
        WHERE au.id = v_user_id;
        
        RETURN NEXT v_result;
    END IF;
    
    RETURN;
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
        u.id AS user_id,
        u.email AS email,
        u.display_name AS display_name,
        u.role AS role
    FROM user_sessions s
    INNER JOIN app_users u ON s.user_id = u.id
    WHERE s.token = p_token
        AND s.expires_at > NOW()
        AND u.is_active = true;
    
    -- Actualizar last_activity_at si la sesión es válida
    UPDATE user_sessions us
    SET last_activity_at = NOW()
    WHERE us.token = p_token
        AND us.expires_at > NOW();
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
        u.id AS id,
        u.email AS email,
        u.display_name AS display_name,
        u.role AS role,
        u.is_active AS is_active,
        u.last_login_at AS last_login_at,
        u.created_at AS created_at
    FROM app_users u
    WHERE u.id = p_user_id;
END;
$$;

-- Otorgar permisos para RPC
GRANT EXECUTE ON FUNCTION get_user_by_id TO anon, authenticated, service_role;

