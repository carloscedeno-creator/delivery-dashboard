# 🔐 Sistema de Autenticación

## 📋 Descripción General

Sistema de autenticación completo implementado para el Delivery Dashboard con:
- Tablas de base de datos en Supabase
- Componente de Login
- Gestión de sesiones
- Roles de usuario (admin, 3amigos, Stakeholder, PM, Regular)
- Sin restricciones por ahora (estructura lista para futuras restricciones)

## 🗄️ Estructura de Base de Datos

### Tablas

1. **`app_users`**: Usuarios del sistema
   - `id` (UUID): Identificador único
   - `email` (VARCHAR): Email único
   - `password_hash` (VARCHAR): Hash de contraseña
   - `display_name` (VARCHAR): Nombre para mostrar
   - `role` (VARCHAR): Rol (admin, 3amigos, Stakeholder, PM, Regular)
   - `is_active` (BOOLEAN): Usuario activo
   - `last_login_at` (TIMESTAMP): Último login
   - `created_at`, `updated_at` (TIMESTAMP): Auditoría

2. **`user_sessions`**: Sesiones activas
   - `id` (UUID): Identificador único
   - `user_id` (UUID): Referencia a usuario
   - `token` (VARCHAR): Token de sesión
   - `expires_at` (TIMESTAMP): Expiración
   - `created_at`, `last_activity_at` (TIMESTAMP): Auditoría

## 🚀 Instalación

### Paso 1: Ejecutar Scripts SQL en Supabase

1. Abre el SQL Editor en Supabase
2. Ejecuta en orden:
   - `docs/supabase/01_auth_schema.sql` - Crea las tablas
   - `docs/supabase/02_auth_functions.sql` - Crea las funciones
   - `docs/supabase/04_auth_example_users.sql` - Crea usuarios de prueba (opcional)

### Paso 2: Verificar Instalación

```sql
-- Verificar tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('app_users', 'user_sessions');

-- Verificar funciones creadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%user%' OR routine_name LIKE '%session%';
```

## 👥 Usuarios de Prueba

Después de ejecutar `04_auth_example_users.sql`, puedes usar:

| Email | Password | Rol |
|-------|----------|-----|
| admin@antigravity.com | admin123 | admin |
| 3amigos@antigravity.com | 3amigos123 | 3amigos |
| stakeholder@antigravity.com | stakeholder123 | Stakeholder |
| pm@antigravity.com | pm123 | PM |
| regular@antigravity.com | regular123 | Regular |

### Usuario Admin Principal

Para crear el usuario admin principal, ejecuta `05_create_admin_carlos.sql`:

| Email | Password | Rol |
|-------|----------|-----|
| carlos.cedeno@agenticdream.com | Miranda*14 | admin |

## 🔑 Funciones Disponibles

### `authenticate_user(p_email, p_password_hash)`
Autentica un usuario y actualiza `last_login_at`.

### `create_session(p_user_id, p_token, p_expires_in_hours)`
Crea una nueva sesión (default: 24 horas).

### `validate_session(p_token)`
Valida un token y actualiza `last_activity_at`.

### `logout_session(p_token)`
Cierra una sesión específica.

### `logout_all_sessions(p_user_id)`
Cierra todas las sesiones de un usuario.

## 💻 Uso en el Frontend

### Componente Login

El componente `Login` se muestra automáticamente si no hay sesión activa.

### Servicio de Autenticación

```javascript
// En src/utils/authService.js
import { login, logout, getCurrentUser, hasRole } from './src/utils/authService.js';

// Login
const result = await login('admin@antigravity.com', 'admin123');
if (result.success) {
    console.log('Usuario:', result.user);
}

// Obtener usuario actual
const user = getCurrentUser();
console.log('Usuario:', user);

// Verificar rol
if (hasRole('admin')) {
    // Hacer algo solo para admin
}

// Logout
await logout();
```

## 🎨 Interfaz

### Pantalla de Login
- Formulario con email y contraseña
- Validación de campos
- Mensajes de error
- Loading state durante autenticación

### Navbar
- Muestra nombre y rol del usuario (desktop)
- Botón de logout
- Menú responsive

## 🔒 Seguridad

### ⚠️ IMPORTANTE - Desarrollo vs Producción

**Estado Actual (Desarrollo):**
- Contraseñas hasheadas con Base64 (NO seguro)
- Tokens simples (NO JWT)
- Sin HTTPS requerido
- Sin rate limiting

**Para Producción:**
1. ✅ Usar `bcrypt` o `argon2` para hashear contraseñas
2. ✅ Implementar JWT tokens
3. ✅ Requerir HTTPS
4. ✅ Agregar rate limiting
5. ✅ Validación de contraseñas fuertes
6. ✅ Recuperación de contraseña
7. ✅ 2FA (opcional)

### Migración a Producción

```sql
-- Ejemplo: Actualizar password_hash a bcrypt
-- (requiere extensión pgcrypto)
UPDATE app_users 
SET password_hash = crypt('nueva_password', gen_salt('bf'))
WHERE email = 'usuario@example.com';
```

## 📝 Notas

- **Sin restricciones**: Por ahora, todos los roles tienen acceso completo
- **Sesiones**: Expiran después de 24 horas
- **Limpieza automática**: Sesiones expiradas se limpian al validar
- **LocalStorage**: La sesión se guarda en `localStorage` como `auth_session`

## 🔄 Flujo de Autenticación

1. Usuario ingresa email y password
2. Se hashea la contraseña (Base64 temporal)
3. Se llama a `authenticate_user()` en Supabase
4. Si es válido, se crea una sesión con `create_session()`
5. Se guarda token y datos del usuario en `localStorage`
6. El dashboard se muestra con el usuario autenticado
7. Al validar sesión, se llama a `validate_session()` periódicamente
8. Al hacer logout, se llama a `logout_session()` y se limpia `localStorage`

## 🐛 Troubleshooting

### Error: "Supabase no está configurado"
- Verifica que `window.SUPABASE_CONFIG` esté definido en `index.html`
- Verifica que el cliente de Supabase se haya inicializado

### Error: "Credenciales inválidas"
- Verifica que el usuario exista en `app_users`
- Verifica que el password_hash sea correcto (Base64 de la contraseña)
- Verifica que `is_active = true`

### Error: "Error al crear sesión"
- Verifica que la función `create_session` exista en Supabase
- Verifica permisos RLS en `user_sessions`

### La sesión no persiste
- Verifica que `localStorage` esté habilitado en el navegador
- Verifica que no haya errores de CORS
