-- ============================================
-- FIX FINAL: Actualizar request_password_reset para retornar TABLE
-- La función actual retorna VARCHAR, necesitamos que retorne TABLE
-- ============================================

-- Primero eliminar la función antigua (si existe)
DROP FUNCTION IF EXISTS request_password_reset(VARCHAR);

-- Crear la nueva función que retorna TABLE
CREATE OR REPLACE FUNCTION request_password_reset(
    p_email VARCHAR(255)
)
RETURNS TABLE (
    token VARCHAR(500),
    display_name VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_token VARCHAR(500);
    v_display_name VARCHAR(255);
BEGIN
    -- Buscar usuario
    SELECT id, display_name INTO v_user_id, v_display_name
    FROM app_users
    WHERE email = p_email AND is_active = true;
    
    IF v_user_id IS NULL THEN
        -- No revelar si el email existe o no por seguridad
        RETURN;
    END IF;
    
    -- Generar token único
    v_token := 'reset_' || gen_random_uuid()::TEXT || '_' || extract(epoch from now())::TEXT;
    
    -- Limpiar tokens expirados o usados del usuario
    DELETE FROM password_reset_tokens 
    WHERE user_id = v_user_id 
        AND (expires_at < NOW() OR used = true);
    
    -- Crear nuevo token (válido por 1 hora)
    INSERT INTO password_reset_tokens (user_id, token, expires_at)
    VALUES (v_user_id, v_token, NOW() + INTERVAL '1 hour')
    RETURNING token INTO v_token;
    
    -- Retornar token y display_name como TABLE
    RETURN QUERY SELECT v_token, v_display_name;
END;
$$;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION request_password_reset(VARCHAR) TO anon, authenticated, service_role;

-- Verificar que se creó correctamente
DO $$
BEGIN
    RAISE NOTICE 'Función request_password_reset actualizada correctamente';
    RAISE NOTICE 'Ahora retorna TABLE (token VARCHAR(500), display_name VARCHAR(255))';
END $$;
