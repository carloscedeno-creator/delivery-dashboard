# Instalación de Funciones de Cálculo de Métricas

Esta guía te ayudará a instalar las funciones SQL y el trigger automático para calcular métricas analíticas en Supabase.

## 📋 Requisitos Previos

1. ✅ Esquema de base de datos aplicado (`01_create_schema.sql`)
2. ✅ RLS configurado (`02_setup_rls.sql`)
3. ✅ Vistas creadas (`03_views_utiles.sql`)
4. ✅ Datos sincronizados desde Jira

## 🚀 Instalación Paso a Paso

### Paso 1: Aplicar Funciones de Cálculo

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `04_calculate_metrics_functions.sql`
5. Haz clic en **Run** (o presiona `Ctrl+Enter`)

**Verificación:**
```sql
-- Verificar que las funciones fueron creadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%metrics%'
ORDER BY routine_name;
```

Deberías ver:
- `calculate_all_metrics`
- `calculate_developer_sprint_metrics`
- `calculate_sprint_metrics`
- `get_historical_status_for_sprint`
- `get_initial_sp_for_sprint`
- `map_to_target_status`

### Paso 2: Aplicar Trigger Automático

1. En el mismo **SQL Editor**
2. Copia y pega el contenido de `05_auto_calculate_metrics_trigger.sql`
3. Haz clic en **Run**

**Verificación:**
```sql
-- Verificar que el trigger fue creado
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'after_sync_complete';
```

Deberías ver el trigger `after_sync_complete` en la tabla `data_sync_log`.

### Paso 3: Probar Manualmente (Opcional)

Antes de confiar en el trigger automático, puedes probar manualmente:

```sql
-- Calcular métricas para un proyecto específico
SELECT * FROM calculate_all_metrics('OBD');

-- O calcular métricas para un sprint específico
SELECT calculate_sprint_metrics('sprint-uuid-aqui');
```

## ✅ Verificación Final

### 1. Verificar que las métricas se están calculando

```sql
-- Ver métricas de sprint más recientes
SELECT 
  sm.calculated_at,
  s.sprint_name,
  sm.total_story_points,
  sm.completed_story_points,
  sm.total_tickets,
  sm.completed_tickets
FROM sprint_metrics sm
JOIN sprints s ON sm.sprint_id = s.id
ORDER BY sm.calculated_at DESC
LIMIT 10;
```

### 2. Verificar métricas de desarrollador

```sql
-- Ver métricas de desarrollador más recientes
SELECT 
  dsm.calculated_at,
  d.display_name,
  s.sprint_name,
  dsm.workload_sp,
  dsm.velocity_sp,
  dsm.carryover_sp
FROM developer_sprint_metrics dsm
JOIN developers d ON dsm.developer_id = d.id
JOIN sprints s ON dsm.sprint_id = s.id
ORDER BY dsm.calculated_at DESC
LIMIT 10;
```

### 3. Probar el trigger automático

El trigger se ejecutará automáticamente la próxima vez que:
- Se complete una sincronización exitosa
- El campo `status` en `data_sync_log` cambie a `'completed'`

Para simular esto (solo para pruebas):

```sql
-- Simular una sincronización completada
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

Después de ejecutar esto, verifica que las métricas se calcularon:

```sql
SELECT * FROM sprint_metrics 
WHERE calculated_at > NOW() - INTERVAL '5 minutes'
ORDER BY calculated_at DESC;
```

## 🔧 Troubleshooting

### Error: "function does not exist"

**Causa:** Las funciones no se aplicaron correctamente.

**Solución:**
1. Verifica que ejecutaste `04_calculate_metrics_functions.sql` completo
2. Revisa los errores en el SQL Editor
3. Asegúrate de que todas las funciones se crearon sin errores

### Error: "relation does not exist"

**Causa:** El esquema no está aplicado o las tablas no existen.

**Solución:**
1. Aplica primero `01_create_schema.sql`
2. Verifica que las tablas existen:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
     AND table_name IN ('sprints', 'issues', 'issue_sprints', 'sprint_metrics');
   ```

### Las métricas no se calculan automáticamente

**Causa:** El trigger no está funcionando o la sincronización no está marcando `status = 'completed'`.

**Solución:**
1. Verifica que el trigger existe (ver Paso 2)
2. Revisa los logs de sincronización:
   ```sql
   SELECT * FROM data_sync_log 
   ORDER BY sync_started_at DESC 
   LIMIT 5;
   ```
3. Si el `status` no es `'completed'`, el trigger no se ejecutará
4. Puedes calcular manualmente: `SELECT * FROM calculate_all_metrics('OBD');`

### Las métricas están en 0 o incorrectas

**Causa:** Los datos base no están correctos o faltan relaciones.

**Solución:**
1. Verifica que `issue_sprints` tiene datos:
   ```sql
   SELECT COUNT(*) FROM issue_sprints;
   ```
2. Verifica que `status_at_sprint_close` está poblado:
   ```sql
   SELECT COUNT(*) FROM issue_sprints 
   WHERE status_at_sprint_close IS NOT NULL;
   ```
3. Verifica que los sprints tienen fechas:
   ```sql
   SELECT sprint_name, start_date, end_date, state 
   FROM sprints 
   LIMIT 5;
   ```

## 📚 Próximos Pasos

Una vez instalado y verificado:

1. ✅ Las métricas se calcularán automáticamente después de cada sincronización
2. ✅ Puedes consultar métricas usando las vistas:
   - `v_sprint_metrics_complete`
   - `v_developer_sprint_metrics_complete`
3. ✅ El dashboard puede consumir estas métricas directamente desde Supabase

## 🔗 Referencias

- [Documentación de Cálculo de Métricas](../CALCULO_METRICAS_SUPABASE.md)
- [Script Node.js Alternativo](../../scripts/calculate-metrics.js)
- [Esquema de Base de Datos](../../../GooglescriptsDelivery/docs/supabase/01_create_schema.sql)


