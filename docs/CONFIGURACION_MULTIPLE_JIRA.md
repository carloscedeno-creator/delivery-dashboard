# 🔄 Configuración para Múltiples Dominios de Jira

## 📊 Dominios Configurados

Tu base de datos tiene **2 dominios de Jira**:

1. **`goavanto.atlassian.net`**
   - Squads: **OBD**, **ODSO**

2. **`agiledreamteam.atlassian.net`**
   - Squads: **APM**, **IN**

## ⚙️ Configuración del .env

Para que el servicio sincronice **ambos dominios automáticamente**, deja las variables de Jira **vacías**:

```env
# Jira Configuration - VACÍAS para usar credenciales de la BD
JIRA_DOMAIN=
JIRA_EMAIL=
JIRA_API_TOKEN=

# Supabase Configuration
SUPABASE_URL=https://sywkskwkexwwdzrbwinp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# Sync Configuration
SYNC_INTERVAL_MINUTES=30
# Vacío = sincronizar TODOS los squads
PROJECT_KEY=
# O especifica un squad: PROJECT_KEY=obd
```

## 🔐 Credenciales en Base de Datos

Las credenciales están almacenadas en `jira_credentials`:

```sql
SELECT jira_domain, jira_email, is_active
FROM jira_credentials
WHERE is_active = true;
```

**Ambos dominios están configurados:**
- ✅ `goavanto.atlassian.net` - Activo
- ✅ `agiledreamteam.atlassian.net` - Activo

## 🔄 Cómo Funciona

Cuando `JIRA_DOMAIN` está **vacío**:

1. El servicio consulta todos los **squads** con `sync_enabled = true`
2. Para cada squad:
   - Obtiene el `jira_domain` del squad
   - Consulta credenciales desde `jira_credentials` usando ese dominio
   - Crea cliente de Jira con esas credenciales
   - Sincroniza issues del squad
   - Registra sync en `data_sync_log` con `squad_id`
3. El **trigger automático** calcula métricas para cada squad

## ✅ Resultado

- ✅ **Un solo servicio** sincroniza ambos dominios
- ✅ **Credenciales centralizadas** en la base de datos
- ✅ **Métricas automáticas** para cada dominio
- ✅ **No necesitas configurar nada en el .env** (solo Supabase)

## 📝 Nota Importante

**Las credenciales de Jira deben estar en la tabla `jira_credentials`** con:
- `jira_domain` = dominio de Jira
- `jira_email` = email de la cuenta
- `jira_api_token` = token de API
- `is_active` = true

Si faltan credenciales para algún dominio, el servicio mostrará un error y continuará con los demás.


