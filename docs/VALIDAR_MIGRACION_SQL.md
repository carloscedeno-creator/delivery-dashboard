# ✅ Validar Migración SQL: calculate_squad_sprint_sp_done

## 🎯 Objetivo

Validar que la migración SQL se aplicó correctamente y que los KPIs muestran valores consistentes.

---

## ✅ Paso 1: Verificar Funciones SQL

### Verificar función helper `is_status_completed`

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la función existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'is_status_completed';
```

**Resultado esperado:** Deberías ver la función con código que usa `status_definitions`.

### Verificar función principal `calculate_squad_sprint_sp_done`

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la función usa is_status_completed
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'calculate_squad_sprint_sp_done';
```

**Resultado esperado:** Deberías ver que la función usa `is_status_completed()` en lugar de lógica hardcodeada como `status = 'DONE'`.

---

## ✅ Paso 2: Probar Función con Datos Reales

### Obtener IDs de Squad y Sprint

Ejecuta en Supabase SQL Editor:

```sql
-- Obtener un squad_id y sprint_id reales para probar
SELECT 
    s.id as squad_id,
    s.squad_name,
    sp.id as sprint_id,
    sp.sprint_name,
    sp.state,
    sp.start_date,
    sp.end_date
FROM squads s
CROSS JOIN sprints sp
WHERE sp.squad_id = s.id
ORDER BY sp.start_date DESC
LIMIT 5;
```

### Probar la Función RPC

Ejecuta en Supabase SQL Editor (reemplaza los UUIDs con valores reales del paso anterior):

```sql
-- Probar la función con datos reales
SELECT calculate_squad_sprint_sp_done(
  'squad-uuid-aqui'::UUID,
  'sprint-uuid-aqui'::UUID
) as sp_done;
```

**Resultado esperado:** Deberías obtener un valor numérico (SP Done) sin errores.

### Comparar con Cálculo Manual

Ejecuta en Supabase SQL Editor para verificar que los valores son consistentes:

```sql
-- Comparar con cálculo manual usando is_status_completed
SELECT 
    COALESCE(SUM(COALESCE(i.current_story_points, 0)), 0) as manual_sp_done
FROM issues i
INNER JOIN issue_sprints is_rel ON i.id = is_rel.issue_id
WHERE is_rel.sprint_id = 'sprint-uuid-aqui'::UUID
    AND i.squad_id = 'squad-uuid-aqui'::UUID
    AND (
        is_status_completed(i.current_status, true)
        OR is_status_completed(is_rel.status_at_sprint_close, true)
    );
```

**Resultado esperado:** El valor debería ser similar al de la función RPC (puede haber diferencias menores por filtros adicionales).

---

## ✅ Paso 3: Validar en Dashboard

### Verificar Team Capacity

1. Ve al dashboard: http://localhost:5173 (o tu URL)
2. Navega a **Team Capacity**
3. Selecciona un squad y sprint
4. Verifica que el valor de **SP Done** se muestra correctamente
5. Compara con valores anteriores para asegurar consistencia

### Verificar Otros Módulos

1. **Projects Metrics:**
   - Verifica que los issues "Done" se muestran correctamente
   - Compara con valores anteriores

2. **Developer Metrics:**
   - Verifica que Dev Done Rate se calcula correctamente
   - Compara con valores anteriores

3. **Sprint Burndown:**
   - Verifica que los issues completados se muestran correctamente
   - Compara con valores anteriores

---

## ✅ Paso 4: Verificar Consistencia Entre Módulos

### Comparar Valores de SP Done

Ejecuta en Supabase SQL Editor:

```sql
-- Comparar SP Done entre diferentes métodos de cálculo
SELECT 
    sp.sprint_name,
    s.squad_name,
    -- Usando función RPC
    calculate_squad_sprint_sp_done(s.id, sp.id) as rpc_sp_done,
    -- Usando cálculo directo con is_status_completed
    (
        SELECT COALESCE(SUM(COALESCE(i.current_story_points, 0)), 0)
        FROM issues i
        INNER JOIN issue_sprints is_rel ON i.id = is_rel.issue_id
        WHERE is_rel.sprint_id = sp.id
            AND i.squad_id = s.id
            AND (
                is_status_completed(i.current_status, true)
                OR is_status_completed(is_rel.status_at_sprint_close, true)
            )
    ) as manual_sp_done
FROM sprints sp
INNER JOIN squads s ON sp.squad_id = s.id
WHERE sp.state = 'closed'
ORDER BY sp.end_date DESC
LIMIT 10;
```

**Resultado esperado:** Los valores deberían ser similares (puede haber diferencias menores por filtros adicionales en la función RPC).

---

## ✅ Paso 5: Verificar que Status Definitions Está Poblada

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que status_definitions tiene datos
SELECT 
    normalized_name,
    is_completed,
    is_dev_done,
    is_production_done,
    category
FROM status_definitions
ORDER BY display_order;
```

**Resultado esperado:** Deberías ver múltiples filas con definiciones de estatus.

---

## ⚠️ Si Hay Problemas

### Error: "function is_status_completed does not exist"

**Causa:** La función helper no se creó correctamente.

**Solución:**
1. Verifica que ejecutaste TODO el contenido del archivo SQL
2. Ejecuta solo la parte de creación de `is_status_completed` primero
3. Verifica que la tabla `status_definitions` existe

### Error: "function calculate_squad_sprint_sp_done does not exist"

**Causa:** La función principal no se actualizó.

**Solución:**
1. Verifica que ejecutaste TODO el contenido del archivo SQL
2. Verifica que no hubo errores durante la ejecución
3. Ejecuta solo la parte de actualización de `calculate_squad_sprint_sp_done`

### Valores Inconsistentes

**Causa:** Puede haber diferencias por filtros adicionales en la función RPC.

**Solución:**
1. Revisa los filtros en la función RPC (sprints cerrados, fechas, etc.)
2. Compara con valores históricos para verificar que son razonables
3. Verifica que `status_definitions` tiene las definiciones correctas

---

## 📋 Checklist de Validación

- [ ] Función `is_status_completed` existe en Supabase
- [ ] Función `calculate_squad_sprint_sp_done` usa `is_status_completed`
- [ ] Función RPC retorna valores sin errores
- [ ] Valores en Team Capacity son consistentes
- [ ] Valores en Projects Metrics son consistentes
- [ ] Valores en Developer Metrics son consistentes
- [ ] Valores en Sprint Burndown son consistentes
- [ ] Tabla `status_definitions` está poblada

---

## 🎯 Resultado Esperado

Después de validar:

- ✅ **Consistencia:** Todos los cálculos de SP Done usan la misma lógica
- ✅ **Mantenibilidad:** Cambios en definiciones de estatus se reflejan automáticamente
- ✅ **Extensibilidad:** Fácil agregar nuevos estatus sin modificar funciones

---

## 🔗 Referencias

- **Migración SQL:** `docs/supabase/update_calculate_sp_done_function.sql`
- **Aplicar Migración:** `docs/APLICAR_MIGRACION_CALCULATE_SP_DONE.md`
- **Plan de 2 Días:** `jira-supabase-sync/docs/PLAN_2_DIAS_COMPLETO.md`
