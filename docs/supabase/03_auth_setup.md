# 🔐 Configuración del Sistema de Autenticación

## 📋 Descripción

Sistema de autenticación completo con roles y sesiones para el Delivery Dashboard.

## 🗄️ Tablas de Base de Datos

### 1. `app_users`
Tabla principal de usuarios con los siguientes campos:
- `id` (UUID): Identificador único
- `email` (VARCHAR): Email único del usuario
- `password_hash` (VARCHAR): Hash de la contraseña
- `display_name` (VARCHAR): Nombre para mostrar
- `role` (VARCHAR): Rol del usuario (admin, 3amigos, Stakeholder, PM, Regular)
- `is_active` (BOOLEAN): Si el usuario está activo
- `last_login_at` (TIMESTAMP): Último inicio de sesión
- `created_at` (TIMESTAMP): Fecha de creación
- `updated_at` (TIMESTAMP): Última actualización

### 2. `user_sessions`
Tabla de sesiones activas:
- `id` (UUID): Identificador único
- `user_id` (UUID): Referencia al usuario
- `token` (VARCHAR): Token de sesión único
- `expires_at` (TIMESTAMP): Fecha de expiración
- `created_at` (TIMESTAMP): Fecha de creación
- `last_activity_at` (TIMESTAMP): Última actividad

## 🔧 Instalación

### Paso 1: Ejecutar Scripts SQL

1. **Crear las tablas:**
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- docs/supabase/01_auth_schema.sql
   ```

2. **Crear las funciones:**
   ```sql
   -- Ejecutar en Supabase SQL Editor
   -- docs/supabase/02_auth_functions.sql
   ```

### Paso 2: Crear Usuario de Prueba

```sql
-- Ejemplo: Crear usuario admin
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'admin@example.com',
    'YWRtaW4xMjM=', -- Base64 de 'admin123' (temporal, usar bcrypt en producción)
    'Administrador',
    'admin'
);

-- Ejemplo: Crear usuario PM
INSERT INTO app_users (email, password_hash, display_name, role)
VALUES (
    'pm@example.com',
    'cG0xMjM=', -- Base64 de 'pm123'
    'Product Manager',
    'PM'
);
```

**Nota:** En producción, usar `bcrypt` o similar para hashear contraseñas. Por ahora usamos Base64 como placeholder.

## 👥 Roles Disponibles

- **admin**: Administrador del sistema
- **3amigos**: Rol especial (3amigos)
- **Stakeholder**: Stakeholder del proyecto
- **PM**: Product Manager
- **Regular**: Usuario regular

## 🔑 Funciones Disponibles

### `create_user(p_email, p_password_hash, p_display_name, p_role)`
Crea un nuevo usuario.

### `authenticate_user(p_email, p_password_hash)`
Autentica un usuario y retorna sus datos.

### `create_session(p_user_id, p_token, p_expires_in_hours)`
Crea una nueva sesión para un usuario.

### `validate_session(p_token)`
Valida un token de sesión y retorna los datos del usuario.

### `logout_session(p_token)`
Cierra una sesión específica.

### `logout_all_sessions(p_user_id)`
Cierra todas las sesiones de un usuario.

### `get_user_by_id(p_user_id)`
Obtiene información de un usuario por ID.

## 🚀 Uso en el Frontend

El sistema de autenticación está integrado en:
- `src/utils/authService.js`: Servicio de autenticación
- `src/components/Login.jsx`: Componente de login
- `index.html`: Integración en la aplicación principal

### Ejemplo de uso:

```javascript
import { login, logout, getCurrentUser, hasRole } from './src/utils/authService.js';

// Login
const result = await login('admin@example.com', 'admin123');
if (result.success) {
    console.log('Usuario autenticado:', result.user);
}

// Obtener usuario actual
const user = getCurrentUser();
console.log('Usuario actual:', user);

// Verificar rol
if (hasRole('admin')) {
    console.log('Es administrador');
}

// Logout
await logout();
```

## 🔒 Seguridad

**IMPORTANTE:** El sistema actual usa Base64 para hashear contraseñas, lo cual **NO es seguro para producción**.

Para producción, se debe:
1. Usar `bcrypt` o `argon2` para hashear contraseñas
2. Implementar HTTPS
3. Usar JWT tokens en lugar de tokens simples
4. Implementar rate limiting
5. Agregar validación de contraseñas fuertes
6. Implementar recuperación de contraseña

## 📝 Notas

- Por ahora **no hay restricciones** de acceso según roles
- Las sesiones expiran después de 24 horas por defecto
- Las sesiones expiradas se limpian automáticamente al validar
