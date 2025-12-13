# Desplegar Edge Function desde el Dashboard de Supabase

Como el CLI no está disponible, puedes desplegar la función directamente desde el dashboard.

## Método: Crear función desde el código

1. **Ve a Edge Functions en Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/functions

2. **Haz clic en "Create a new function"** o **"New Function"**

3. **Dale un nombre**: `send-password-reset-email`

4. **Copia y pega el código** del archivo `supabase/functions/send-password-reset-email/index.ts`

5. **Haz clic en "Deploy"** o **"Save"**

6. **Después de desplegar**, ve a la función y busca la pestaña **"Settings"** o **"Secrets"**

7. **Agrega las variables de entorno ahí:**
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `APP_URL`

## Alternativa: Usar el template "Send Emails"

1. En la página de templates que estás viendo
2. Busca el template **"Send Emails"** (usa Resend API)
3. Haz clic en ese template
4. Reemplaza el código con el de `supabase/functions/send-password-reset-email/index.ts`
5. Despliega
