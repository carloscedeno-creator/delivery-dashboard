-- ============================================
-- Ejemplo: Crear Usuarios de Prueba
-- ============================================

-- IMPORTANTE: Las contraseñas están hasheadas con Base64 (NO SEGURO para producción)
-- En producción, usar bcrypt o similar

-- Usuario Admin
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'admin@antigravity.com',
    'YWRtaW4xMjM=', -- Base64 de 'admin123'
    'Administrador',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Usuario 3amigos
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    '3amigos@antigravity.com',
    'M2FtaWdvczEyMw==', -- Base64 de '3amigos123'
    '3 Amigos',
    '3amigos'
)
ON CONFLICT (email) DO NOTHING;

-- Usuario Stakeholder
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'stakeholder@antigravity.com',
    'c3Rha2Vob2xkZXIxMjM=', -- Base64 de 'stakeholder123'
    'Stakeholder',
    'Stakeholder'
)
ON CONFLICT (email) DO NOTHING;

-- Usuario PM
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'pm@antigravity.com',
    'cG0xMjM=', -- Base64 de 'pm123'
    'Product Manager',
    'PM'
)
ON CONFLICT (email) DO NOTHING;

-- Usuario Regular
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'regular@antigravity.com',
    'cmVndWxhcjEyMw==', -- Base64 de 'regular123'
    'Usuario Regular',
    'Regular'
)
ON CONFLICT (email) DO NOTHING;

-- Verificar usuarios creados
SELECT id, email, display_name, role, is_active, created_at
FROM app_users
ORDER BY role, display_name;
