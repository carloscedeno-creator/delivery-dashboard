# 🔐 Configuración del Archivo .env

## 📍 Ubicación

```
D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync\.env
```

## 📝 Variables Requeridas

### ✅ Ya Configuradas (No Cambiar)

```env
# Jira Configuration - VACÍAS para modo múltiples dominios
JIRA_DOMAIN=
JIRA_EMAIL=
JIRA_API_TOKEN=

# Supabase URL
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co

# Sync Configuration
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=  # Vacío = todos los squads

# Jira Field IDs
STORY_POINTS_FIELD_ID=customfield_10016
SPRINT_FIELD_ID=customfield_10020

# Logging
LOG_LEVEL=info
DEBUG=false
```

### ⚠️ Variable que DEBES Configurar

**`SUPABASE_SERVICE_ROLE_KEY`**

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona el proyecto **"Delivery Metrics"**
3. Ve a **Settings** → **API**
4. Copia el **"service_role" key** (el secreto, NO el anon key)
5. Pégalo en el `.env`:

```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🔄 Cómo Funciona

### Modo Múltiples Dominios (Actual)

Con `JIRA_DOMAIN` vacío, el servicio:

1. ✅ Consulta credenciales desde `jira_credentials` en Supabase
2. ✅ Obtiene todos los squads con `sync_enabled = true`
3. ✅ Sincroniza cada squad usando su dominio correspondiente:
   - **OBD, ODSO** → `goavanto.atlassian.net`
   - **APM, IN** → `agiledreamteam.atlassian.net`

### Modo Legacy (Un Solo Dominio)

Si llenas `JIRA_DOMAIN`, `JIRA_EMAIL` y `JIRA_API_TOKEN`, el servicio usará esas credenciales para un solo dominio.

## ✅ Verificación

Después de configurar, ejecuta:

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
npm start
```

Deberías ver:
```
🚀 Iniciando servicio de sincronización Jira → Supabase
🌐 Modo: Múltiples dominios (consultando desde BD)
⏰ Intervalo: cada 30 minutos
📋 Sincronizando 4 squad(s): OBD, ODSO, APM, IN
```

## 🔐 Seguridad

⚠️ **NUNCA** compartas el `SUPABASE_SERVICE_ROLE_KEY` públicamente.
⚠️ El archivo `.env` está en `.gitignore` y no se sube a Git.


