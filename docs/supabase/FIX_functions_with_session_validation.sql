-- ============================================
-- FIX: Modificar funciones para usar validación de sesión personalizada
-- En lugar de auth.uid() (Supabase Auth), validamos el token de sesión
-- ============================================

-- Función helper para validar token y obtener user_id
CREATE OR REPLACE FUNCTION get_user_from_token(p_token VARCHAR(500))
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Limpiar sesiones expiradas
    PERFORM cleanup_expired_sessions();
    
    -- Obtener user_id del token válido
    SELECT s.user_id INTO v_user_id
    FROM user_sessions s
    INNER JOIN app_users u ON s.user_id = u.id
    WHERE s.token = p_token
        AND s.expires_at > NOW()
        AND u.is_active = true
    LIMIT 1;
    
    RETURN v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_from_token(VARCHAR) TO anon, authenticated, service_role;

-- Recrear get_all_users con validación de sesión
CREATE OR REPLACE FUNCTION get_all_users(p_session_token VARCHAR(500))
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
DECLARE
    v_user_id UUID;
    v_user_role VARCHAR(50);
BEGIN
    -- Validar token de sesión
    v_user_id := get_user_from_token(p_session_token);
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
    END IF;
    
    -- Verificar que el usuario tenga rol admin
    SELECT role INTO v_user_role
    FROM app_users
    WHERE id = v_user_id;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;
    
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

GRANT EXECUTE ON FUNCTION get_all_users(VARCHAR) TO anon, authenticated, service_role;

-- Recrear approve_user con validación de sesión
CREATE OR REPLACE FUNCTION approve_user(p_user_id UUID, p_session_token VARCHAR(500))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_user_role VARCHAR(50);
BEGIN
    -- Validar token de sesión
    v_current_user_id := get_user_from_token(p_session_token);
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
    END IF;
    
    -- Verificar que el usuario tenga rol admin
    SELECT role INTO v_current_user_role
    FROM app_users
    WHERE id = v_current_user_id;
    
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;
    
    UPDATE app_users
    SET is_active = true
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_user(UUID, VARCHAR) TO anon, authenticated, service_role;

-- Recrear deactivate_user con validación de sesión
CREATE OR REPLACE FUNCTION deactivate_user(p_user_id UUID, p_session_token VARCHAR(500))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_user_role VARCHAR(50);
BEGIN
    -- Validar token de sesión
    v_current_user_id := get_user_from_token(p_session_token);
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
    END IF;
    
    -- Verificar que el usuario tenga rol admin
    SELECT role INTO v_current_user_role
    FROM app_users
    WHERE id = v_current_user_id;
    
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;
    
    UPDATE app_users
    SET is_active = false
    WHERE id = p_user_id;
    
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION deactivate_user(UUID, VARCHAR) TO anon, authenticated, service_role;

-- Recrear update_user_role con validación de sesión
CREATE OR REPLACE FUNCTION update_user_role(p_user_id UUID, p_new_role VARCHAR(50), p_session_token VARCHAR(500))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_user_id UUID;
    v_current_user_role VARCHAR(50);
BEGIN
    -- Validar token de sesión
    v_current_user_id := get_user_from_token(p_session_token);
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
    END IF;
    
    -- Verificar que el usuario tenga rol admin
    SELECT role INTO v_current_user_role
    FROM app_users
    WHERE id = v_current_user_id;
    
    IF v_current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;
    
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

GRANT EXECUTE ON FUNCTION update_user_role(UUID, VARCHAR, VARCHAR) TO anon, authenticated, service_role;
