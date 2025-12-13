# 🔧 Solución: No Llega el Email de Password Reset

## Diagnóstico

El problema es que **la Edge Function está desplegada pero las variables de entorno no se aplicaron** porque falta hacer **Redeploy**.

## ✅ Solución Paso a Paso

### Paso 1: Verificar Variables de Entorno

1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions
2. Verifica que existan estas 3 variables:
   - ✅ `RESEND_API_KEY` (debe empezar con `re_`)
   - ✅ `RESEND_FROM_EMAIL` (ej: `onboarding@resend.dev`)
   - ✅ `APP_URL` (ej: `https://carloscedeno-creator.github.io/delivery-dashboard`)

### Paso 2: REDEPLOYAR la Función (CRÍTICO)

**⚠️ IMPORTANTE: Las variables solo se aplican cuando haces redeploy**

1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/functions
2. Haz clic en la función **`send-password-reset-email`**
3. Busca el botón **"Redeploy"** o **"Deploy"** (generalmente arriba a la derecha)
4. Haz clic en **"Redeploy"**
5. Espera a que termine (verás un indicador de progreso)

### Paso 3: Verificar que Funciona

Ejecuta el script de diagnóstico:

```bash
node scripts/diagnose-email-issue.js
```

Deberías ver:

```
✅ Usuario encontrado
✅ Token generado correctamente
✅ Email enviado correctamente!
🎉 ¡Todo funciona! Revisa el inbox
```

### Paso 4: Probar desde la Aplicación

1. Ve a la pantalla de login
2. Haz clic en **"Forgot Password?"**
3. Ingresa tu email: `carlos.cedeno@agenticdream.com`
4. Haz clic en **"Send Reset Link"**
5. Revisa tu inbox (puede tardar unos segundos)

## 🔍 Verificar Logs de la Función

Si aún no funciona después del redeploy:

1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/functions
2. Haz clic en **`send-password-reset-email`**
3. Ve a la pestaña **"Logs"**
4. Busca errores relacionados con:
   - `RESEND_API_KEY`
   - `environment variable`
   - `Failed to send email`

## ⚠️ Problemas Comunes

### 1. "RESEND_API_KEY environment variable is not set"

**Solución:** 
- Verifica que la variable esté en la lista de Secrets
- Asegúrate de haber hecho **Redeploy** después de agregarla

### 2. "Failed to send email: 401"

**Solución:**
- La API key de Resend es inválida
- Verifica que la key empiece con `re_`
- Obtén una nueva key en: https://resend.com/api-keys

### 3. "Failed to send email: 403"

**Solución:**
- El dominio no está verificado en Resend
- Usa `onboarding@resend.dev` como `RESEND_FROM_EMAIL` (funciona automáticamente)

### 4. El email llega pero el token no funciona

**Solución:**
- Verifica que ejecutaste `06_update_request_password_reset.sql` en Supabase SQL Editor
- Esta función actualizada retorna `token` y `display_name` correctamente

## 📝 Verificar Función SQL

Si el token es null, ejecuta este SQL en Supabase SQL Editor:

```sql
-- Verificar que la función esté actualizada
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'request_password_reset';

-- Si no retorna TABLE, ejecuta:
-- docs/supabase/06_update_request_password_reset.sql
```

## ✅ Checklist Final

- [ ] Variables de entorno configuradas en Supabase Dashboard
- [ ] **Redeploy de la función realizado** (CRÍTICO)
- [ ] Script de diagnóstico muestra "Email enviado correctamente"
- [ ] Email recibido en el inbox
- [ ] Token funciona al hacer clic en el enlace

## 🆘 Si Nada Funciona

1. Revisa los logs de la función en Supabase Dashboard
2. Ejecuta `node scripts/diagnose-email-issue.js` y comparte el output
3. Verifica que tu cuenta de Resend esté activa y tenga créditos
