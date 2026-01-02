# Supabase Setup for User Administration

## Required Database Functions

Para que el módulo de User Administration funcione, necesitas crear una función RPC en Supabase que devuelva todos los usuarios.

### Opción 1: Crear función RPC `get_all_users()`

Ejecuta este SQL en el SQL Editor de Supabase:

```sql
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
```

### Opción 2: Crear tabla `users` con trigger de sincronización

Si prefieres usar una tabla en lugar de una función RPC:

```sql
-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL,
    display_name text,
    role text DEFAULT 'Regular',
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura a usuarios autenticados
CREATE POLICY "Users can view all users"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

-- Trigger para sincronizar usuarios de auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, role, is_active, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Regular'),
        COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true),
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear usuario en tabla cuando se registra
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para actualizar last_login_at cuando el usuario inicia sesión
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger AS $$
BEGIN
    UPDATE public.users
    SET last_login_at = NEW.last_sign_in_at
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();
```

### Funciones adicionales para aprobar y desactivar usuarios

```sql
-- Función para aprobar usuario
CREATE OR REPLACE FUNCTION public.approve_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_active}',
        'true'::jsonb
    )
    WHERE id = p_user_id;
    
    -- Si usas tabla users, actualiza también
    UPDATE public.users
    SET is_active = true
    WHERE id = p_user_id;
END;
$$;

-- Función para desactivar usuario
CREATE OR REPLACE FUNCTION public.deactivate_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{is_active}',
        'false'::jsonb
    )
    WHERE id = p_user_id;
    
    -- Si usas tabla users, actualiza también
    UPDATE public.users
    SET is_active = false
    WHERE id = p_user_id;
END;
$$;

-- Función para actualizar rol de usuario
CREATE OR REPLACE FUNCTION public.update_user_role(p_user_id uuid, p_new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        to_jsonb(p_new_role)
    )
    WHERE id = p_user_id;
    
    -- Si usas tabla users, actualiza también
    UPDATE public.users
    SET role = p_new_role
    WHERE id = p_user_id;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION public.approve_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(uuid, text) TO authenticated;
```

## Notas

- La función RPC `get_all_users()` es la opción más simple y no requiere sincronización
- La tabla `users` requiere triggers para mantenerse sincronizada con `auth.users`
- Ambas opciones requieren que las funciones tengan `SECURITY DEFINER` para acceder a `auth.users`
- Asegúrate de configurar las políticas RLS apropiadas según tus necesidades de seguridad

