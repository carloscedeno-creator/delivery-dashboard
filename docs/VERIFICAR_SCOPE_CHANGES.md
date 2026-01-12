# ✅ Verificar Scope Changes Funciona Correctamente

## 🎯 Objetivo

Verificar que la migración de scope changes se aplicó correctamente y que el sistema detecta y muestra cambios de scope.

---

## ✅ Paso 1: Verificar Tabla y Vista Creadas

Ejecuta en Supabase SQL Editor:

```sql
-- Verificar que la tabla existe
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'sprint_scope_changes';

-- Verificar que la vista existe
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'sprint_scope_changes_summary';
```

**Resultado esperado:** Deberías ver ambas (tabla y vista) en los resultados.

---

## ✅ Paso 2: Verificar Estructura de la Tabla

Ejecuta en Supabase SQL Editor:

```sql
-- Ver estructura de la tabla
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sprint_scope_changes'
ORDER BY ordinal_position;
```

**Resultado esperado:** Deberías ver todas las columnas:
- `id`, `sprint_id`, `issue_id`, `change_type`, `change_date`
- `story_points_before`, `story_points_after`
- `detected_at`, `created_at`, `updated_at`

---

## ✅ Paso 3: Probar Vista Summary

Ejecuta en Supabase SQL Editor:

```sql
-- Probar la vista con datos reales
SELECT *
FROM sprint_scope_changes_summary
ORDER BY start_date DESC
LIMIT 5;
```

**Resultado esperado:** Deberías obtener resultados sin errores (puede estar vacío si no hay cambios aún).

---

## ✅ Paso 4: Verificar en Dashboard

1. Ve al dashboard: http://localhost:5173 (o tu URL)
2. Navega a **Projects Metrics**
3. Selecciona un squad y sprint
4. Verifica que la sección **"Scope Changes"** se muestra
5. Deberías ver:
   - **Issues Added** (con SP agregados)
   - **Issues Removed** (con SP removidos)
   - **SP Changes** (con cambio neto)
   - Lista de cambios recientes (si hay)

---

## ✅ Paso 5: Ejecutar Sync para Detectar Cambios

Los cambios de scope se detectan automáticamente durante la sincronización. Para detectar cambios históricos:

1. Ejecuta el sync completo:
   ```bash
   cd jira-supabase-sync
   npm run sync
   ```

2. El sync detectará automáticamente:
   - Issues agregados después del inicio del sprint
   - Issues removidos antes del cierre del sprint
   - Cambios en Story Points durante el sprint

3. Verifica en los logs que se están detectando cambios:
   ```
   📝 Issue agregado al sprint detectado: sprint Sprint 81, issue PROJ-123
   📝 Issue removido del sprint detectado: sprint Sprint 81, issue PROJ-456
   📝 Cambio de SP detectado: sprint Sprint 81, issue PROJ-789, 5 → 8
   ```

---

## ✅ Paso 6: Verificar Datos en Base de Datos

Después de ejecutar el sync, verifica que los datos se guardaron:

Ejecuta en Supabase SQL Editor:

```sql
-- Ver cambios de scope detectados
SELECT 
    ssc.change_type,
    ssc.change_date,
    ssc.story_points_before,
    ssc.story_points_after,
    i.issue_key,
    sp.sprint_name
FROM sprint_scope_changes ssc
INNER JOIN issues i ON ssc.issue_id = i.id
INNER JOIN sprints sp ON ssc.sprint_id = sp.id
ORDER BY ssc.change_date DESC
LIMIT 20;
```

**Resultado esperado:** Deberías ver cambios detectados con sus detalles.

---

## ⚠️ Si Hay Problemas

### Error: "relation sprint_scope_changes does not exist"

**Causa:** La migración no se aplicó correctamente.

**Solución:**
1. Verifica que ejecutaste TODO el contenido del archivo SQL
2. Revisa si hubo errores durante la ejecución
3. Aplica la migración nuevamente

### No se muestran cambios en el dashboard

**Causa:** Puede que no haya cambios detectados aún o que el sync no se haya ejecutado.

**Solución:**
1. Ejecuta el sync completo para detectar cambios históricos
2. Verifica que hay datos en la tabla `sprint_scope_changes`
3. Verifica que el sprint seleccionado tiene cambios

### La vista retorna errores

**Causa:** Puede haber un problema con la vista o con las relaciones.

**Solución:**
1. Verifica que las tablas `sprints` e `issues` existen
2. Verifica que la vista se creó correctamente
3. Recrea la vista si es necesario

---

## 📋 Checklist de Verificación

- [ ] Tabla `sprint_scope_changes` existe
- [ ] Vista `sprint_scope_changes_summary` existe
- [ ] Estructura de tabla es correcta
- [ ] Vista retorna resultados sin errores
- [ ] Sección "Scope Changes" se muestra en dashboard
- [ ] Sync detecta cambios correctamente
- [ ] Datos se guardan en la tabla

---

## 🎯 Resultado Esperado

Después de verificar:

- ✅ **Tabla creada:** `sprint_scope_changes` existe y tiene la estructura correcta
- ✅ **Vista funcionando:** `sprint_scope_changes_summary` retorna datos correctamente
- ✅ **UI funcionando:** Dashboard muestra cambios de scope
- ✅ **Detección automática:** Sync detecta cambios durante sincronización

---

## 🔗 Referencias

- **Migración SQL:** `jira-supabase-sync/migrations/create_sprint_scope_changes_table.sql`
- **Detector:** `jira-supabase-sync/src/processors/scope-change-detector.js`
- **API:** `src/utils/projectMetricsApi.js`
- **UI:** `src/components/ProjectsMetrics.jsx`
- **Aplicar Migración:** `docs/APLICAR_MIGRACION_SCOPE_CHANGES.md`
