# Send Password Reset Email - Supabase Edge Function

Esta función envía emails de recuperación de contraseña usando Resend API.

## Configuración

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Iniciar sesión en Supabase

```bash
supabase login
```

### 3. Vincular tu proyecto

```bash
supabase link --project-ref tu-project-ref
```

### 4. Configurar variables de entorno

En el dashboard de Supabase, ve a **Edge Functions** > **Settings** y agrega:

- `RESEND_API_KEY`: Tu API key de Resend (obtén una en https://resend.com/api-keys)
- `RESEND_FROM_EMAIL`: Email desde el cual enviar (debe estar verificado en Resend)
- `APP_URL`: URL de tu aplicación (default: https://carloscedeno-creator.github.io/delivery-dashboard)

### 5. Desplegar la función

```bash
supabase functions deploy send-password-reset-email
```

## Uso

La función se llama automáticamente desde la función SQL `request_password_reset` usando `pg_net` o desde el frontend.

### Llamada manual (para testing)

```bash
curl -X POST https://tu-project-ref.supabase.co/functions/v1/send-password-reset-email \
  -H "Authorization: Bearer tu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "reset_token_123",
    "display_name": "John Doe"
  }'
```

## Estructura del Request

```json
{
  "email": "user@example.com",
  "token": "reset_token_abc123",
  "display_name": "John Doe" // opcional
}
```

## Respuesta

```json
{
  "success": true,
  "message": "Password reset email sent successfully",
  "resend_id": "email_id_from_resend"
}
```
