-- ============================================
-- FIX: Corregir permisos de get_all_users
-- Esta función NO debe estar disponible para anon
-- ============================================

-- Revocar permisos de anon
REVOKE EXECUTE ON FUNCTION get_all_users FROM anon;

-- Asegurar que solo authenticated y service_role tengan acceso
GRANT EXECUTE ON FUNCTION get_all_users TO authenticated, service_role;

-- Verificar que approve_user y deactivate_user tampoco estén disponibles para anon
REVOKE EXECUTE ON FUNCTION approve_user FROM anon;
REVOKE EXECUTE ON FUNCTION deactivate_user FROM anon;
REVOKE EXECUTE ON FUNCTION update_user_role FROM anon;

-- Asegurar permisos correctos
GRANT EXECUTE ON FUNCTION approve_user TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deactivate_user TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_user_role TO authenticated, service_role;
