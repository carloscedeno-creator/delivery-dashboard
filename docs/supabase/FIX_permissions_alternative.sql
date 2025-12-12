-- ============================================
-- FIX ALTERNATIVO: Corregir permisos usando ALTER FUNCTION
-- Si REVOKE no funciona, intenta recrear las funciones sin permisos para anon
-- ============================================

-- Opción 1: Intentar REVOKE de nuevo (por si acaso)
REVOKE EXECUTE ON FUNCTION get_all_users() FROM anon;
REVOKE EXECUTE ON FUNCTION approve_user(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION deactivate_user(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION update_user_role(UUID, VARCHAR) FROM anon;

-- Opción 2: Si REVOKE no funciona, necesitamos recrear las funciones
-- sin otorgar permisos a anon desde el principio

-- Recrear get_all_users sin permisos para anon
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

-- Solo otorgar a authenticated y service_role (NO anon)
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated, service_role;

-- Recrear approve_user sin permisos para anon
CREATE OR REPLACE FUNCTION approve_user(p_user_id UUID)
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

GRANT EXECUTE ON FUNCTION approve_user(UUID) TO authenticated, service_role;

-- Recrear deactivate_user sin permisos para anon
CREATE OR REPLACE FUNCTION deactivate_user(p_user_id UUID)
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

GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated, service_role;

-- Recrear update_user_role sin permisos para anon
CREATE OR REPLACE FUNCTION update_user_role(p_user_id UUID, p_new_role VARCHAR(50))
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

GRANT EXECUTE ON FUNCTION update_user_role(UUID, VARCHAR) TO authenticated, service_role;
