-- ============================================
-- FIX: Agregar validación de autenticación dentro de las funciones
-- Esto asegura que solo usuarios autenticados puedan usar estas funciones
-- ============================================

-- Recrear get_all_users con validación de autenticación
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
    -- Verificar que el usuario esté autenticado
    -- En Supabase, auth.uid() retorna el UUID del usuario autenticado
    -- Si es NULL, significa que no hay usuario autenticado
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required';
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

GRANT EXECUTE ON FUNCTION get_all_users() TO authenticated, service_role;

-- Recrear approve_user con validación
CREATE OR REPLACE FUNCTION approve_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar autenticación
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required';
    END IF;
    
    UPDATE app_users
    SET is_active = true
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_user(UUID) TO authenticated, service_role;

-- Recrear deactivate_user con validación
CREATE OR REPLACE FUNCTION deactivate_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar autenticación
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required';
    END IF;
    
    UPDATE app_users
    SET is_active = false
    WHERE id = p_user_id;
    
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION deactivate_user(UUID) TO authenticated, service_role;

-- Recrear update_user_role con validación
CREATE OR REPLACE FUNCTION update_user_role(p_user_id UUID, p_new_role VARCHAR(50))
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar autenticación
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required';
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

GRANT EXECUTE ON FUNCTION update_user_role(UUID, VARCHAR) TO authenticated, service_role;
