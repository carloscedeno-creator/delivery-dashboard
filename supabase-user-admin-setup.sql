-- =====================================================
-- Supabase User Administration Setup
-- =====================================================
-- Ejecuta este script completo en el SQL Editor de Supabase
-- Dashboard > SQL Editor > New Query > Paste > Run
-- =====================================================

-- Función para obtener todos los usuarios con sus metadatos
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (
    id uuid,
    email text,
    display_name text,
    role text,
    is_active boolean,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        COALESCE(
            u.raw_user_meta_data->>'display_name',
            u.raw_user_meta_data->>'full_name',
            split_part(u.email, '@', 1)
        ) as display_name,
        COALESCE(u.raw_user_meta_data->>'role', 'Regular')::text as role,
        COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) as is_active,
        u.last_sign_in_at as last_login_at,
        u.created_at
    FROM auth.users u
    ORDER BY u.created_at DESC;
END;
$$;

-- Otorgar permisos para ejecutar la función
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO anon;

-- Función para aprobar usuario
CREATE OR REPLACE FUNCTION public.approve_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_active}',
        'true'::jsonb
    )
    WHERE id = p_user_id;
END;
$$;

-- Función para desactivar usuario
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_active}',
        'false'::jsonb
    )
    WHERE id = p_user_id;
END;
$$;

-- Función para actualizar rol de usuario
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(p_new_role)
    )
    WHERE id = p_user_id;
END;
$$;

-- Otorgar permisos para las funciones de administración
GRANT EXECUTE ON FUNCTION public.approve_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;

-- Verificar que las funciones se crearon correctamente
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_all_users', 'approve_user', 'deactivate_user', 'update_user_role')
ORDER BY routine_name;

