-- ============================================
-- FIX FINAL: Recrear get_all_users sin ambigüedad
-- Eliminar y recrear la función completamente
-- ============================================

-- Primero eliminar la función existente si existe
DROP FUNCTION IF EXISTS get_all_users(VARCHAR);
DROP FUNCTION IF EXISTS get_all_users();

-- Recrear get_all_users con validación de sesión (sin ambigüedad)
CREATE OR REPLACE FUNCTION get_all_users(p_session_token VARCHAR(500))
RETURNS TABLE (
    user_id UUID,
    user_email VARCHAR(255),
    user_display_name VARCHAR(255),
    user_role VARCHAR(50),
    user_is_active BOOLEAN,
    user_last_login_at TIMESTAMP WITH TIME ZONE,
    user_created_at TIMESTAMP WITH TIME ZONE
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
        app_users.id,
        app_users.email,
        app_users.display_name,
        app_users.role,
        app_users.is_active,
        app_users.last_login_at,
        app_users.created_at
    FROM app_users
    ORDER BY app_users.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users(VARCHAR) TO anon, authenticated, service_role;
