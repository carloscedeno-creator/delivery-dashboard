-- ============================================
-- FIX: Exponer funciones como RPC
-- Ejecuta esto en Supabase SQL Editor para exponer las funciones como RPC
-- ============================================

-- Otorgar permisos para que las funciones sean accesibles como RPC
GRANT EXECUTE ON FUNCTION create_user TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION authenticate_user TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_session TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION validate_session TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION logout_session TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION logout_all_sessions TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_by_id TO anon, authenticated, service_role;

-- Nota: Si las funciones no existen, ejecuta primero:
-- docs/supabase/02_auth_functions.sql
