# 🔐 Cómo Funcionan las Credenciales en Producción

## 📋 Resumen

**Las credenciales de Jira están en Supabase**, no en el `.env`. El servicio las consulta automáticamente desde la base de datos.

## 🔄 Flujo de Credenciales

### 1. **Credenciales de Jira → En Supabase** ✅

Las credenciales de Jira están almacenadas en la tabla `jira_credentials` en Supabase:

```sql
SELECT jira_domain, jira_email, is_active
FROM jira_credentials
WHERE is_active = true;
```

**Ya están configuradas:**
- ✅ `goavanto.atlassian.net` - Activo
- ✅ `agiledreamteam.atlassian.net` - Activo

### 2. **Solo Necesitas `SUPABASE_SERVICE_ROLE_KEY`** 🔑

En producción, solo necesitas configurar **UNA variable** en la plataforma de hosting:

```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### 3. **El Servicio Consulta Automáticamente** 🔄

Cuando el servicio se ejecuta:

1. Se conecta a Supabase usando `SUPABASE_SERVICE_ROLE_KEY`
2. Consulta todos los squads con `sync_enabled = true`
3. Para cada squad:
   - Obtiene el `jira_domain` del squad
   - **Consulta credenciales desde `jira_credentials`** usando ese dominio
   - Crea cliente de Jira con esas credenciales
   - Sincroniza los issues

## ✅ Variables en Producción

### Solo Necesitas Configurar:

```env
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

### Variables Opcionales (pueden estar vacías):

```env
JIRA_DOMAIN=          # Vacío = consulta desde BD
JIRA_EMAIL=           # Vacío = consulta desde BD
JIRA_API_TOKEN=       # Vacío = consulta desde BD
SYNC_INTERVAL_MINUTES=30
PROJECT_KEY=          # Vacío = todos los squads
```

## 🚀 Configuración en Plataforma de Hosting

### Vercel / Railway / Render

1. Ve a **Settings** → **Environment Variables**
2. Agrega **solo estas 2 variables**:

```
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

3. Las variables de Jira pueden estar **vacías** o **no existir**

**✅ Listo - El servicio consultará las credenciales desde Supabase automáticamente**

## 🔐 Seguridad

### ✅ Ventajas de Este Enfoque:

1. **Credenciales centralizadas** - Todas en Supabase
2. **No en Git** - Las credenciales nunca se suben al código
3. **Fácil actualización** - Cambias credenciales en Supabase, no en cada servidor
4. **Múltiples dominios** - Un solo servicio maneja todos los dominios
5. **Solo una variable secreta** - Solo `SUPABASE_SERVICE_ROLE_KEY` en la plataforma

### ⚠️ Importante:

- **`SUPABASE_SERVICE_ROLE_KEY`** es la única credencial que necesitas en la plataforma
- Las credenciales de Jira **ya están en Supabase** (tabla `jira_credentials`)
- El servicio las consulta automáticamente cuando las necesita

## 📝 Verificación

Después de configurar solo `SUPABASE_SERVICE_ROLE_KEY`, el servicio debería:

1. ✅ Conectarse a Supabase
2. ✅ Consultar squads desde `squads` table
3. ✅ Consultar credenciales desde `jira_credentials` para cada dominio
4. ✅ Sincronizar todos los squads automáticamente

## 🔄 Flujo Completo

```
1. Servicio inicia con SUPABASE_SERVICE_ROLE_KEY
   ↓
2. Se conecta a Supabase
   ↓
3. Consulta squads: SELECT * FROM squads WHERE sync_enabled = true
   ↓
4. Para cada squad:
   - Obtiene jira_domain
   - Consulta: SELECT * FROM jira_credentials WHERE jira_domain = ?
   - Crea cliente Jira con esas credenciales
   - Sincroniza issues
   ↓
5. Registra sync en data_sync_log
   ↓
6. Trigger automático calcula métricas
```

## ✅ Resumen

**No necesitas subir credenciales de Jira a la plataforma de hosting.**

- ✅ Credenciales de Jira → **En Supabase** (tabla `jira_credentials`)
- ✅ Solo necesitas → **`SUPABASE_SERVICE_ROLE_KEY`** en la plataforma
- ✅ El servicio → **Consulta automáticamente** desde Supabase

**Todo está centralizado y seguro.** 🔐


