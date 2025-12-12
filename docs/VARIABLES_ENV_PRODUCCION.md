# 🔐 Variables de Entorno para Producción

## 📋 Resumen

El archivo `.env` **NO se sube a Git**. En producción, configuras las variables directamente en la plataforma de hosting (Vercel, Railway, Render, etc.).

## ✅ Variables que Necesitas Configurar

Copia estas variables en el dashboard de tu plataforma de hosting:

```env
JIRA_DOMAIN=
JIRA_EMAIL=
JIRA_API_TOKEN=
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY_AQUI
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=
STORY_POINTS_FIELD_ID=customfield_10016
SPRINT_FIELD_ID=customfield_10020
LOG_LEVEL=info
DEBUG=false
```

## 🚀 Cómo Configurarlas por Plataforma

### Vercel

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com)
2. **Settings** → **Environment Variables**
3. Agrega cada variable una por una
4. Selecciona **Production**, **Preview**, y **Development**
5. Click **Save**

**✅ Listo - Las variables estarán disponibles en producción**

### Railway

1. Ve a tu proyecto en [Railway](https://railway.app)
2. Click en el proyecto → **Variables**
3. Agrega cada variable
4. Railway las aplica automáticamente

**✅ Listo - Las variables estarán disponibles**

### Render

1. Ve a tu Cron Job en [Render](https://render.com)
2. **Environment** → **Add Environment Variable**
3. Agrega cada variable
4. Click **Save Changes**

**✅ Listo - Las variables estarán disponibles**

## 📝 Template Rápido para Copiar

```
JIRA_DOMAIN=
JIRA_EMAIL=
JIRA_API_TOKEN=
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=
STORY_POINTS_FIELD_ID=customfield_10016
SPRINT_FIELD_ID=customfield_10020
LOG_LEVEL=info
DEBUG=false
```

## ⚠️ Importante

1. **`SUPABASE_SERVICE_ROLE_KEY`** - Debes obtenerlo de Supabase Dashboard
2. Las variables vacías (`JIRA_DOMAIN=`, `JIRA_EMAIL=`, etc.) deben estar **vacías** (no poner espacios)
3. Todas las plataformas encriptan las variables automáticamente
4. No necesitas el archivo `.env` en producción

## ✅ Verificación

Después de configurar las variables, el servicio debería:
- ✅ Conectarse a Supabase
- ✅ Consultar credenciales desde `jira_credentials`
- ✅ Sincronizar todos los squads automáticamente

## 🔄 Flujo Completo

1. **Código en Git** (sin `.env`)
2. **Plataforma clona el código**
3. **Variables configuradas en el dashboard** de la plataforma
4. **Servicio usa las variables** automáticamente
5. **Cron job ejecuta** cada 30 minutos
6. **Todo funciona** sin necesidad de `.env` en Git

**No necesitas subir el `.env` a Git. Todo se configura en la plataforma.** 🚀


