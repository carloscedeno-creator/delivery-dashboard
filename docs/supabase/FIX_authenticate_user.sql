-- ============================================
-- FIX: Corregir función authenticate_user
-- Ejecuta esto en Supabase SQL Editor
-- ============================================

CREATE OR REPLACE FUNCTION authenticate_user(
    p_email VARCHAR(255),
    p_password_hash VARCHAR(255)
)
RETURNS TABLE (
    user_id UUID,
    email VARCHAR(255),
    display_name VARCHAR(255),
    role VARCHAR(50),
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Buscar el usuario
    SELECT u.id INTO v_user_id
    FROM app_users u
    WHERE u.email = p_email
        AND u.password_hash = p_password_hash
        AND u.is_active = true;
    
    -- Si se encontró, actualizar last_login_at y retornar los datos
    IF v_user_id IS NOT NULL THEN
        UPDATE app_users
        SET last_login_at = NOW()
        WHERE id = v_user_id;
        
        RETURN QUERY
        SELECT 
            u.id,
            u.email,
            u.display_name,
            u.role,
            u.is_active
        FROM app_users u
        WHERE u.id = v_user_id;
    END IF;
END;
$$;

-- Asegurar permisos para RPC
GRANT EXECUTE ON FUNCTION authenticate_user TO anon, authenticated, service_role;
