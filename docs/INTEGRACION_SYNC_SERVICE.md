# Integración del Cálculo de Métricas con el Servicio de Sincronización

Este documento explica cómo integrar el cálculo automático de métricas con el servicio de sincronización de Jira.

## 🎯 Objetivo

Asegurar que las métricas analíticas se calculen automáticamente **inmediatamente después** de que se complete una sincronización de Jira.

## ✅ Solución Implementada: Trigger Automático

### Cómo Funciona

1. **El servicio de sincronización** (`jira-supabase-sync`) inserta un registro en `data_sync_log`:
   - Al inicio: `status = 'running'`
   - Al finalizar: `status = 'completed'`

2. **El trigger automático** (`after_sync_complete`) detecta cuando:
   - Se inserta un registro con `status = 'completed'`
   - O se actualiza un registro de otro status a `'completed'`

3. **El trigger ejecuta** `calculate_all_metrics()` automáticamente

### Ventajas

- ✅ **Completamente automático** - No requiere cambios en el código del servicio
- ✅ **Inmediato** - Se ejecuta en la misma transacción
- ✅ **Confiable** - Si el trigger falla, no afecta la sincronización
- ✅ **Sin dependencias externas** - Todo en la base de datos

## 📋 Instalación

### Paso 1: Aplicar Funciones SQL

Ejecuta en Supabase SQL Editor:
```sql
-- docs/supabase/04_calculate_metrics_functions.sql
```

### Paso 2: Aplicar Trigger Automático

Ejecuta en Supabase SQL Editor:
```sql
-- docs/supabase/05_auto_calculate_metrics_trigger.sql
```

### Paso 3: Verificar

```bash
# Probar que el trigger funciona
npm run test-metrics OBD
```

## 🔧 Opciones de Integración

### Opción 1: Trigger Automático (Recomendada) ✅

**Ya implementada** - El trigger se ejecuta automáticamente.

**Ventajas:**
- No requiere cambios en el código del servicio
- Funciona para cualquier cliente que inserte en `data_sync_log`
- Ejecución inmediata

**Desventajas:**
- Si el trigger falla silenciosamente, puede no ser obvio

### Opción 2: Llamada Manual desde el Servicio

Si prefieres control explícito, puedes modificar el servicio de sincronización:

```javascript
// En jira-supabase-sync/src/sync/sync.js
// Después de logSync con status='completed':

// Opción A: Llamar función SQL directamente
const { error: metricsError } = await supabaseClient.client.rpc('calculate_all_metrics', {
  p_project_key: config.sync.projectKey.toUpperCase()
});

if (metricsError) {
  logger.warn('⚠️ Error calculando métricas automáticamente:', metricsError);
} else {
  logger.success('✅ Métricas calculadas exitosamente');
}

// Opción B: Usar función específica para última sync
const { data: metricsResult, error: metricsError } = await supabaseClient.client.rpc(
  'calculate_metrics_for_last_sync',
  { p_project_key: config.sync.projectKey.toUpperCase() }
);

if (metricsError) {
  logger.warn('⚠️ Error calculando métricas:', metricsError);
} else if (metricsResult && metricsResult.length > 0) {
  const result = metricsResult[0];
  logger.success(`✅ Métricas calculadas: ${result.sprints_processed} sprints, ${result.developers_processed} desarrolladores`);
}
```

**Ventajas:**
- Control explícito
- Puedes manejar errores y logging
- Puedes decidir cuándo calcular

**Desventajas:**
- Requiere modificar el código del servicio
- Solo funciona si el servicio llama la función

### Opción 3: Híbrida (Trigger + Verificación)

Usar el trigger automático pero agregar verificación en el servicio:

```javascript
// Después de logSync con status='completed':
await supabaseClient.logSync(projectId, 'full', 'completed', successCount);

// Esperar un momento para que el trigger se ejecute
await new Promise(resolve => setTimeout(resolve, 1000));

// Verificar que las métricas se calcularon
const { data: recentMetrics } = await supabaseClient.client
  .from('sprint_metrics')
  .select('calculated_at')
  .order('calculated_at', { ascending: false })
  .limit(1)
  .single();

if (recentMetrics && new Date(recentMetrics.calculated_at) > new Date(Date.now() - 5000)) {
  logger.success('✅ Métricas calculadas automáticamente por trigger');
} else {
  logger.warn('⚠️ Métricas no calculadas automáticamente, calculando manualmente...');
  // Calcular manualmente como fallback
  await supabaseClient.client.rpc('calculate_all_metrics', {
    p_project_key: config.sync.projectKey.toUpperCase()
  });
}
```

## 🧪 Verificar que Funciona

### 1. Verificar Trigger Existe

```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'after_sync_complete';
```

### 2. Simular Sincronización

```sql
-- Insertar registro de sync completada
INSERT INTO data_sync_log (
  project_id,
  sync_type,
  sync_started_at,
  sync_completed_at,
  status,
  issues_imported
) VALUES (
  (SELECT id FROM projects WHERE project_key = 'OBD'),
  'full',
  NOW() - INTERVAL '1 minute',
  NOW(),
  'completed',
  100
);
```

### 3. Verificar Métricas Calculadas

```sql
-- Ver métricas más recientes (deberían ser de hace menos de 1 minuto)
SELECT 
  sm.calculated_at,
  s.sprint_name,
  sm.total_story_points,
  sm.completed_story_points
FROM sprint_metrics sm
JOIN sprints s ON sm.sprint_id = s.id
WHERE sm.calculated_at > NOW() - INTERVAL '5 minutes'
ORDER BY sm.calculated_at DESC
LIMIT 5;
```

### 4. Ver Logs del Trigger

Los mensajes `RAISE NOTICE` del trigger aparecen en los logs de PostgreSQL, pero no son visibles en Supabase UI. Para verlos, necesitarías acceso directo a los logs de PostgreSQL.

## 🐛 Troubleshooting

### El trigger no se ejecuta

**Verificar:**
1. ¿El trigger existe?
   ```sql
   SELECT * FROM information_schema.triggers WHERE trigger_name = 'after_sync_complete';
   ```

2. ¿El servicio marca `status = 'completed'`?
   ```sql
   SELECT * FROM data_sync_log ORDER BY sync_started_at DESC LIMIT 5;
   ```

3. ¿Hay errores en el trigger?
   - Los errores se capturan pero no detienen el INSERT/UPDATE
   - Revisa los logs de PostgreSQL si tienes acceso

**Solución:**
- Usar función manual como fallback (ver Opción 2)

### Las métricas no se calculan correctamente

**Verificar:**
- ¿Hay datos en `issue_sprints`?
- ¿Los sprints tienen fechas correctas?
- ¿`status_at_sprint_close` está poblado?

**Solución:**
```sql
-- Recalcular manualmente
SELECT * FROM calculate_all_metrics('OBD');
```

### Quiero deshabilitar el trigger temporalmente

```sql
-- Deshabilitar trigger
ALTER TABLE data_sync_log DISABLE TRIGGER after_sync_complete;

-- Habilitar trigger
ALTER TABLE data_sync_log ENABLE TRIGGER after_sync_complete;
```

## 📝 Recomendación Final

**Usa el trigger automático (Opción 1)** porque:
- ✅ Es la solución más simple y robusta
- ✅ No requiere cambios en el código del servicio
- ✅ Funciona para cualquier cliente que sincronice datos
- ✅ Se ejecuta inmediatamente después de la sync

Si necesitas más control o el trigger no funciona en tu entorno, usa la **Opción 2** (llamada manual desde el servicio).

## 🔗 Referencias

- [Quick Start Guide](QUICK_START_METRICS.md)
- [Instalación Detallada](supabase/INSTALL_METRICS.md)
- [Funciones SQL](supabase/04_calculate_metrics_functions.sql)
- [Trigger Automático](supabase/05_auto_calculate_metrics_trigger.sql)
- [Funciones Manuales](supabase/06_alternative_manual_calculation.sql)


