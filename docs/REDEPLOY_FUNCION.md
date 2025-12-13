# 🔄 Redeployar Edge Function para Aplicar Variables

## ⚠️ Importante

**Las variables de entorno solo se aplican cuando se despliega la función.**

Aunque ya agregaste las variables en Supabase Dashboard, necesitas hacer un **Redeploy** para que la función las use.

## Pasos para Redeployar

### Opción 1: Desde el Dashboard (MÁS FÁCIL)

1. **Ve a Edge Functions:**
   - URL directa: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/functions
   - O navega: Menú lateral > **Edge Functions**

2. **Haz clic en la función `send-password-reset-email`**

3. **Busca el botón "Redeploy" o "Deploy"** (generalmente en la parte superior derecha)

4. **Haz clic en "Redeploy"**

5. **Espera a que termine el despliegue** (verás un indicador de progreso)

### Opción 2: Verificar que las Variables Estén Configuradas

Antes de redeployar, verifica que las variables estén en la lista:

1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions
2. Deberías ver en la lista:
   - ✅ `RESEND_API_KEY`
   - ✅ `RESEND_FROM_EMAIL`
   - ✅ `APP_URL`

## Después del Redeploy

Ejecuta el script de prueba para verificar:

```bash
node scripts/test-email-function.js
```

Deberías ver:

```
✅ La función está desplegada y responde
✅ Email enviado correctamente
🎉 ¡Todo funciona correctamente!
```

## Si Aún No Funciona

1. **Revisa los logs de la función:**
   - Edge Functions > `send-password-reset-email` > **Logs**
   - Busca errores relacionados con `RESEND_API_KEY` o `environment variable`

2. **Verifica que las variables tengan los valores correctos:**
   - `RESEND_API_KEY` debe empezar con `re_`
   - `RESEND_FROM_EMAIL` debe ser un email válido (ej: `onboarding@resend.dev`)
   - `APP_URL` debe ser la URL completa de tu app

3. **Asegúrate de haber hecho el Redeploy después de agregar las variables**
