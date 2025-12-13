# Configuración de Envío de Emails - Supabase Edge Functions

Este documento explica cómo configurar el envío de emails de recuperación de contraseña usando Supabase Edge Functions y Resend.

## Prerequisitos

1. **Cuenta de Resend**: Regístrate en https://resend.com (plan gratuito disponible)
2. **Supabase CLI**: Instalado y configurado
3. **Dominio verificado en Resend**: Para enviar emails (puedes usar el dominio de prueba inicialmente)

## Paso 1: Obtener API Key de Resend

1. Ve a https://resend.com/api-keys
2. Crea una nueva API Key
3. Copia la clave (solo se muestra una vez)

## Paso 2: Verificar dominio en Resend (Opcional pero recomendado)

1. Ve a https://resend.com/domains
2. Agrega tu dominio
3. Configura los registros DNS según las instrucciones
4. Una vez verificado, puedes usar emails como `noreply@tudominio.com`

## Paso 3: Instalar Supabase CLI

```bash
npm install -g supabase
```

## Paso 4: Iniciar sesión en Supabase

```bash
supabase login
```

## Paso 5: Vincular tu proyecto

```bash
supabase link --project-ref sywkskwkexwwdzrbwinp
```

## Paso 6: Configurar variables de entorno

En el dashboard de Supabase:

1. Ve a **Edge Functions** > **Settings**
2. Agrega las siguientes variables de entorno:

   - **RESEND_API_KEY**: Tu API key de Resend
   - **RESEND_FROM_EMAIL**: Email desde el cual enviar (ej: `noreply@agenticdream.com` o `onboarding@resend.dev` para pruebas)
   - **APP_URL**: URL de tu aplicación (ej: `https://carloscedeno-creator.github.io/delivery-dashboard`)

## Paso 7: Desplegar la Edge Function

```bash
cd "d:\Agile Dream Team\Antigravity\delivery-dashboard"
supabase functions deploy send-password-reset-email
```

## Paso 8: Actualizar función SQL

Ejecuta el SQL en Supabase SQL Editor:

```sql
-- Archivo: docs/supabase/06_update_request_password_reset.sql
```

Esto actualiza la función `request_password_reset` para retornar también el `display_name` del usuario.

## Verificación

### Probar manualmente

```bash
curl -X POST https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/send-password-reset-email \
  -H "Authorization: Bearer tu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "reset_token_test",
    "display_name": "Test User"
  }'
```

### Probar desde la aplicación

1. Ve a la pantalla de login
2. Haz clic en "Forgot Password"
3. Ingresa un email válido
4. Verifica que recibas el email

## Estructura de Archivos

```
supabase/
└── functions/
    └── send-password-reset-email/
        ├── index.ts          # Código de la Edge Function
        └── README.md         # Documentación de la función
```

## Troubleshooting

### Error: "RESEND_API_KEY environment variable is not set"

- Verifica que hayas configurado la variable en Supabase Dashboard
- Asegúrate de haber desplegado la función después de configurar las variables

### Error: "Failed to send email"

- Verifica que tu API key de Resend sea válida
- Verifica que el email `RESEND_FROM_EMAIL` esté verificado en Resend
- Revisa los logs de la Edge Function en Supabase Dashboard

### El email no llega

- Revisa la carpeta de spam
- Verifica que el email de destino sea válido
- Revisa los logs de Resend en https://resend.com/emails

## Costos

- **Resend**: 
  - Plan gratuito: 3,000 emails/mes
  - Plan Pro: $20/mes para 50,000 emails
- **Supabase Edge Functions**: 
  - Incluido en el plan gratuito
  - Límite de invocaciones según tu plan

## Seguridad

- ✅ Los tokens de reset expiran en 1 hora
- ✅ Los tokens solo se pueden usar una vez
- ✅ No se revela si un email existe o no
- ✅ Los emails se envían de forma asíncrona
- ✅ La API key de Resend está almacenada de forma segura en Supabase

## Próximos pasos

- [ ] Configurar dominio personalizado en Resend
- [ ] Personalizar el diseño del email
- [ ] Agregar tracking de emails abiertos
- [ ] Implementar rate limiting para prevenir spam
