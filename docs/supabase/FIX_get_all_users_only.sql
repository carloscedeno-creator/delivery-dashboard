-- ============================================
-- FIX: Crear solo la función get_all_users()
-- Ejecuta esto si las tablas ya existen pero falta la función
-- ============================================

-- Eliminar la función si existe con parámetros (por si acaso)
DROP FUNCTION IF EXISTS get_all_users(VARCHAR);
DROP FUNCTION IF EXISTS get_all_users();

-- Crear la función get_all_users SIN PARÁMETROS (como espera el código)
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

-- Otorgar permisos (solo authenticated y service_role, NO anon)
GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION get_all_users() FROM anon;

-- Verificar que se creó correctamente
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'get_all_users';
