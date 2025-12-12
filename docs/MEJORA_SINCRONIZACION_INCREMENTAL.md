# 🔄 Mejora: Sincronización Incremental por Delta

## 📋 Cambios Realizados

### 1. Mejora en `fetchUpdatedIssues` (jira-client.js)

**Antes:**
```javascript
// Solo buscaba tickets actualizados
const query = `${baseQuery} AND updated >= "${dateStr}" ${orderByClause}`;
```

**Ahora:**
```javascript
// Busca tickets actualizados O creados (delta completo)
const deltaCondition = `(updated >= "${dateStr}" OR created >= "${dateStr}")`;
const query = `${baseQuery} AND ${deltaCondition} ${orderByClause}`;
```

### 2. Sincronización Incremental Mejorada

La sincronización ahora captura:
- ✅ **Tickets actualizados** desde la última sync
- ✅ **Tickets nuevos creados** desde la última sync (aunque no se hayan actualizado)

Esto resuelve el problema de tickets como **ODSO-328** que fueron creados pero no actualizados después de la última sincronización.

## 🔄 Funcionamiento de la Sincronización

### Ejecución Periódica

El servicio se ejecuta automáticamente cada **30 minutos** (configurable):

```javascript
// src/index.js
const cronExpression = `*/${config.sync.intervalMinutes} * * * *`;
cron.schedule(cronExpression, async () => {
  await runSync();
});
```

### Proceso de Sincronización Incremental

1. **Obtener última sincronización** desde `data_sync_log`
2. **Buscar tickets delta** usando JQL:
   ```jql
   Project = "ODSO" AND issuetype != "Sub-task" 
   AND (updated >= "YYYY-MM-DD" OR created >= "YYYY-MM-DD")
   ORDER BY created DESC
   ```
3. **Procesar solo tickets del delta** (no todos los tickets)
4. **Upsert en Supabase** (actualiza si existe, inserta si no existe)
5. **Registrar sincronización** en `data_sync_log`

### Upsert (No Reescritura)

El código usa **upsert** en lugar de delete + insert:

```javascript
// src/processors/issue-processor.js
const issueId = await supabaseClient.upsertIssue(squadId, issueData);
```

```javascript
// src/clients/supabase-client.js
await this.client
  .from('issues')
  .upsert({ ... }, {
    onConflict: 'issue_key',  // Actualiza si existe, inserta si no
  })
```

Esto garantiza:
- ✅ **No se pierden datos** existentes
- ✅ **Solo se actualizan** campos modificados
- ✅ **Se insertan** tickets nuevos
- ✅ **Operación atómica** (transaccional)

## 📊 Beneficios

### Antes (Solo `updated >= date`)
- ❌ Tickets nuevos sin actualizar no se capturaban
- ❌ Requería sync completa para tickets nuevos
- ❌ Podía perder tickets como ODSO-328

### Ahora (`updated >= date OR created >= date`)
- ✅ Captura todos los tickets nuevos
- ✅ Captura todos los tickets actualizados
- ✅ Sincronización incremental completa
- ✅ No requiere sync completa para tickets nuevos

## ⚙️ Configuración

### Intervalo de Sincronización

Configurable en `.env`:
```env
SYNC_INTERVAL_MINUTES=30
```

### Primera Sincronización

Si no hay `lastSync`, se ejecuta una **sincronización completa**:
```javascript
if (!lastSync) {
  jiraIssues = await jiraClient.fetchAllIssues(jqlQuery);
} else {
  jiraIssues = await jiraClient.fetchUpdatedIssues(jqlQuery, lastSync);
}
```

## 🔍 Verificación

Para verificar que la sincronización incremental funciona:

1. **Ver logs del servicio:**
   ```bash
   # Ver logs en tiempo real
   tail -f logs/sync.log
   ```

2. **Verificar en Supabase:**
   ```sql
   -- Ver última sincronización
   SELECT * FROM data_sync_log 
   ORDER BY started_at DESC 
   LIMIT 5;
   ```

3. **Verificar tickets capturados:**
   ```sql
   -- Tickets creados hoy
   SELECT issue_key, summary, created_date, updated_date 
   FROM issues 
   WHERE created_date >= CURRENT_DATE
   ORDER BY created_date DESC;
   ```

## 📝 Notas Importantes

- **No se reescribe**: Solo se actualizan campos modificados
- **Operación atómica**: Upsert garantiza consistencia
- **Delta completo**: Captura creados + actualizados
- **Automático**: Se ejecuta cada 30 minutos sin intervención
- **Logs**: Todas las sincronizaciones se registran en `data_sync_log`

## 🚀 Próximos Pasos

1. ✅ **Implementado**: Sincronización incremental mejorada
2. ✅ **Implementado**: Captura de tickets nuevos
3. ✅ **Implementado**: Upsert (no reescritura)
4. ✅ **Implementado**: Ejecución periódica automática

**El servicio ahora capturará automáticamente tickets como ODSO-328 en la próxima sincronización.**
