-- =====================================================
-- FIX: User Administration - Script Simple
-- =====================================================
-- Ejecuta este script COMPLETO en Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Paste > Run
-- =====================================================

-- PASO 1: Eliminar funciones existentes si existen (para recrearlas limpias)
DROP FUNCTION IF EXISTS public.get_all_users() CASCADE;
DROP FUNCTION IF EXISTS public.approve_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.deactivate_user(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_role(uuid, text) CASCADE;

-- PASO 2: Crear función get_all_users
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
SET search_path = public, auth
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

-- PASO 3: Crear función approve_user
CREATE OR REPLACE FUNCTION public.approve_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

-- PASO 4: Crear función deactivate_user
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

-- PASO 5: Crear función update_user_role
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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

-- PASO 6: Otorgar permisos (MUY IMPORTANTE)
GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users() TO anon;
GRANT EXECUTE ON FUNCTION public.approve_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;

-- PASO 7: Refrescar schema cache
NOTIFY pgrst, 'reload schema';

-- PASO 8: Verificar que se crearon correctamente
SELECT 
    routine_name,
    routine_type,
    routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('get_all_users', 'approve_user', 'deactivate_user', 'update_user_role')
ORDER BY routine_name;

-- Si ves 4 filas arriba, ¡todo está bien!
-- Si ves menos de 4, hubo un error al crear alguna función

