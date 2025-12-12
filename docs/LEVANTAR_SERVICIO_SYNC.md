# 🚀 Cómo Levantar el Servicio de Sincronización

Guía paso a paso para levantar el servicio que sincroniza Jira → Supabase automáticamente.

## 📋 Paso 1: Instalar Dependencias

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
npm install
```

## 🔐 Paso 2: Configurar Variables de Entorno

1. **Crea el archivo `.env`** en la carpeta `jira-supabase-sync`:

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
copy env.example .env
```

2. **Edita el archivo `.env`** con tus credenciales:

```env
# Jira Configuration
JIRA_DOMAIN=goavanto.atlassian.net
JIRA_EMAIL=carlos.cedeno@agenticdream.com
JIRA_API_TOKEN=TU_TOKEN_DE_JIRA_AQUI

# Supabase Configuration
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI

# Sync Configuration
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=obd
JQL_QUERY=project = "obd" AND issuetype != "Sub-task" ORDER BY created DESC

# Jira Field IDs
STORY_POINTS_FIELD_ID=customfield_10016
SPRINT_FIELD_ID=customfield_10020

# Logging
LOG_LEVEL=info
DEBUG=false
```

### 🔑 Obtener Credenciales

#### Jira API Token:
1. Ve a https://id.atlassian.com/manage-profile/security/api-tokens
2. Click en "Create API token"
3. Copia el token y pégalo en `JIRA_API_TOKEN`

#### Supabase Service Role Key:
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona el proyecto **"Delivery Metrics"**
3. Ve a **Settings** → **API**
4. Copia el **"service_role" key** (⚠️ **NUNCA** lo compartas públicamente)
5. Pégalo en `SUPABASE_SERVICE_ROLE_KEY`

## 🏃 Paso 3: Levantar el Servicio

### Opción A: Desarrollo (con auto-reload)

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
npm run dev
```

### Opción B: Producción

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
npm start
```

### Opción C: Sincronización Manual (Una Sola Vez)

```bash
cd "D:\Agile Dream Team\Cursor\GooglescriptsDelivery\jira-supabase-sync"
npm run sync
```

## ✅ Verificar que Funciona

### 1. Ver Logs en Consola

Deberías ver algo como:

```
🚀 Iniciando servicio de sincronización Jira → Supabase
⏰ Intervalo: cada 30 minutos
📅 Cron configurado: */30 * * * *
✅ Servicio iniciado. Presiona Ctrl+C para detener.
🆕 Primera sincronización: ejecutando sync completa
...
```

### 2. Verificar en Supabase

Después de unos minutos, ejecuta en Supabase SQL Editor:

```sql
-- Ver última sincronización
SELECT 
  sync_type,
  status,
  sync_completed_at,
  issues_imported,
  sync_started_at
FROM data_sync_log
ORDER BY sync_started_at DESC
LIMIT 1;
```

### 3. Verificar Métricas Calculadas

```sql
-- Ver métricas calculadas automáticamente
SELECT 
  COUNT(*) as total_metricas,
  MAX(calculated_at) as ultima_calculacion
FROM sprint_metrics;
```

## 🔄 Qué Pasa Después

Una vez levantado el servicio:

1. ✅ **Ejecuta sync inmediatamente** al iniciar
2. ✅ **Sincroniza cada 30 minutos** automáticamente
3. ✅ **Trigger calcula métricas** automáticamente después de cada sync
4. ✅ **Dashboard consume** las métricas automáticamente

**Todo es automático. Solo deja el servicio corriendo.**

## 🛑 Detener el Servicio

Presiona `Ctrl+C` en la terminal donde está corriendo.

## 🚢 Deploy en Producción (Opcional)

Si quieres que el servicio corra 24/7 sin tener tu computadora encendida:

### Opción 1: Vercel (Gratis)
- Conecta el repositorio a Vercel
- Configura variables de entorno
- Crea `vercel.json` con cron job

### Opción 2: Railway ($5/mes)
- Conecta repositorio
- Configura variables de entorno
- Railway detecta automáticamente el cron

### Opción 3: Render (Gratis con límites)
- Crea "Cron Job"
- Schedule: `*/30 * * * *`
- Command: `npm start`

## 🐛 Troubleshooting

### Error: "JIRA_API_TOKEN no está configurado"
- Verifica que el archivo `.env` existe
- Verifica que tiene `JIRA_API_TOKEN=tu_token`

### Error: "Unauthorized" de Jira
- Verifica que el email y token son correctos
- Verifica que tienes permisos en el proyecto de Jira

### Error: "Supabase connection failed"
- Verifica que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son correctos
- Verifica que el esquema de base de datos está aplicado

### El servicio no sincroniza
- Verifica que el servicio está corriendo (no se cerró)
- Revisa los logs en consola
- Verifica que las variables de entorno están correctas

## 📝 Notas

- El servicio debe estar **corriendo continuamente** para que sincronice cada 30 minutos
- Si lo cierras, deja de sincronizar
- Para producción, considera deployarlo en un servicio cloud (Vercel, Railway, Render)


