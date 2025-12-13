# ✅ Verificación de Edge Function

## Estado Actual

✅ **La función `send-password-reset-email` está desplegada correctamente**

⚠️ **Falta configurar las variables de entorno**

## Próximos Pasos

### 1. Configurar Variables de Entorno

Ve a esta URL directa:
```
https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions
```

O navega manualmente:
1. Supabase Dashboard > **Project Settings** (⚙️)
2. **Edge Functions** (en el submenú)
3. Busca la sección **"Secrets"** o **"Environment Variables"**

### 2. Agregar las 3 Variables

Haz clic en **"Add new secret"** y agrega:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `RESEND_API_KEY` | `re_...` | Tu API key de Resend (obtener de https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` | Email desde el cual se enviarán los correos |
| `APP_URL` | `https://carloscedeno-creator.github.io/delivery-dashboard` | URL de tu aplicación |

### 3. Redeployar la Función

Después de agregar las variables:

1. Ve a **Edge Functions** en el menú lateral
2. Haz clic en la función **`send-password-reset-email`**
3. Haz clic en **"Redeploy"** o **"Deploy"** para aplicar las variables

### 4. Verificar que Funciona

Ejecuta el script de prueba:

```bash
node scripts/test-email-function.js
```

O prueba desde la aplicación:
1. Ve a la pantalla de login
2. Haz clic en "Forgot Password?"
3. Ingresa un email válido (ej: `carlos.cedeno@agenticdream.com`)
4. Revisa el inbox del email

## Troubleshooting

### Si el email no llega:

1. **Revisa los logs de la función:**
   - Ve a Edge Functions > `send-password-reset-email` > **Logs**
   - Busca errores relacionados con Resend API

2. **Verifica la API key de Resend:**
   - Asegúrate de que la API key sea válida
   - Verifica que el dominio esté verificado en Resend (si usas un dominio personalizado)

3. **Verifica el email "from":**
   - Si usas `onboarding@resend.dev`, funciona automáticamente
   - Si usas un dominio personalizado, debe estar verificado en Resend

### Si la función no responde:

1. Verifica que esté desplegada:
   ```bash
   node scripts/test-email-function.js
   ```

2. Revisa los logs en Supabase Dashboard

3. Asegúrate de que las variables estén configuradas correctamente

## Estado Final Esperado

Cuando todo esté configurado correctamente, deberías ver:

```
✅ La función está desplegada y responde
✅ Email enviado correctamente
🎉 ¡Todo funciona correctamente!
```
