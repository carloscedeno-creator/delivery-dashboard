# 🔧 Solución: Error 400 en Edge Function

## Problema

La Edge Function `send-password-reset-email` está devolviendo error **400 Bad Request**.

## Causa

El error 400 ocurre cuando:
1. El `token` es `null` o `undefined` cuando se invoca la función
2. El `email` está vacío o es inválido
3. El body del request no se está enviando correctamente

## Solución

### Paso 1: Verificar que la Función SQL esté Actualizada

Ejecuta este SQL en Supabase SQL Editor para verificar:

```sql
-- Verificar la función actual
SELECT 
    proname as function_name,
    pg_get_function_result(oid) as return_type,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'request_password_reset';
```

Si la función no retorna `TABLE (token VARCHAR(500), display_name VARCHAR(255))`, ejecuta:

```sql
-- Ejecutar el archivo: docs/supabase/06_update_request_password_reset.sql
```

O copia y pega directamente el contenido de `docs/supabase/06_update_request_password_reset.sql` en Supabase SQL Editor.

### Paso 2: Verificar que el Token se Genere Correctamente

Ejecuta este script de diagnóstico:

```bash
node scripts/diagnose-email-issue.js
```

Deberías ver:
```
✅ Token generado correctamente
   Token: reset_xxxxx...
```

Si ves `⚠️ Token es null o undefined`, entonces la función SQL no está actualizada.

### Paso 3: Verificar Logs de la Edge Function

1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/functions
2. Haz clic en `send-password-reset-email`
3. Ve a la pestaña **"Logs"**
4. Busca el error específico (debería decir algo como "Email and token are required")

### Paso 4: Verificar Variables de Entorno

Aunque el error 400 no está relacionado con las variables de entorno, asegúrate de que estén configuradas:

1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions
2. Verifica:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `APP_URL`

## Código Actualizado

He actualizado `authService.js` para:
- ✅ Validar que el token no sea null antes de llamar a la Edge Function
- ✅ Mejorar el logging de errores
- ✅ Validar que email y token estén presentes

## Verificación Final

Después de actualizar la función SQL:

1. Ejecuta: `node scripts/diagnose-email-issue.js`
2. Deberías ver: `✅ Email enviado correctamente!`
3. Prueba desde la app: Login > Forgot Password > Ingresa email

## Si Aún No Funciona

1. Revisa los logs de la Edge Function en Supabase Dashboard
2. Verifica que la función SQL `request_password_reset` retorne `TABLE` con `token` y `display_name`
3. Asegúrate de haber ejecutado `06_update_request_password_reset.sql` en Supabase SQL Editor
