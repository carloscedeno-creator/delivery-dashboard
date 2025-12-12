-- ============================================
-- Create Admin User: Carlos Cedeño
-- ============================================

-- Insertar usuario admin
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'carlos.cedeno@agenticdream.com',
    'TWlyYW5kYSoxNA==', -- Base64 de 'Miranda*14'
    'Carlos Cedeño',
    'admin'
)
ON CONFLICT (email) 
DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    is_active = true,
    updated_at = NOW();

-- Verificar usuario creado
SELECT id, email, display_name, role, is_active, created_at
FROM app_users
WHERE email = 'carlos.cedeno@agenticdream.com';
