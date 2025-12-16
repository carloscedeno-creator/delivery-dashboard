-- ============================================
-- CREATE get_all_users function
-- Función para obtener todos los usuarios (solo admin)
-- ============================================

-- Eliminar la función existente si existe
DROP FUNCTION IF EXISTS get_all_users(VARCHAR);
DROP FUNCTION IF EXISTS get_all_users();

-- Crear get_all_users con validación de sesión
-- Retorna los campos con los nombres que espera el frontend
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
    -- Buscar el user_id desde la tabla de sesiones
    SELECT user_id INTO v_user_id
    FROM user_sessions
    WHERE token = p_session_token
      AND expires_at > NOW();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Invalid or expired session';
    END IF;
    
    -- Verificar que el usuario tenga rol admin
    SELECT app_users.role INTO v_user_role
    FROM app_users
    WHERE app_users.id = v_user_id;
    
    IF v_user_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Admin role required';
    END IF;
    
    -- Retornar todos los usuarios con los nombres de columnas que espera el frontend
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

-- Otorgar permisos de ejecución
GRANT EXECUTE ON FUNCTION get_all_users(VARCHAR) TO anon, authenticated, service_role;

-- Comentario de la función
COMMENT ON FUNCTION get_all_users(VARCHAR) IS 'Obtiene todos los usuarios del sistema. Requiere rol admin y sesión válida.';
