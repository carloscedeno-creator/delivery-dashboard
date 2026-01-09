# 🔍 Guía de Validación de Integridad de Datos

## 📋 Objetivo

Esta guía te ayuda a validar que los datos sincronizados desde Jira a Supabase son consistentes y completos después de implementar el retry con exponential backoff.

---

## 🚀 Validaciones Rápidas (5 minutos)

### 1. Validar que el Sync Funciona

```bash
# Ejecutar sync manualmente
cd jira-supabase-sync
npm run sync

# Verificar que no hay errores de rate limiting
# Buscar en los logs: "Rate limit (429)" o "retry-after"
```

**Qué buscar:**
- ✅ Sync completa sin errores
- ✅ Si hay rate limiting, debe mostrar mensajes de retry y espera
- ✅ No debe fallar completamente por rate limiting

### 2. Validar Retry Helper

```bash
# Ejecutar tests del retry helper
npm test tests/retry-helper.test.js
```

**Qué buscar:**
- ✅ Todos los tests pasan (8 tests)
- ✅ Validación de exponential backoff
- ✅ Validación de rate limiting con retry-after

---

## 🔬 Validaciones Detalladas (15 minutos)

### 1. Ejecutar Script de Validación SQL

**Opción A: Ejecutar manualmente en Supabase SQL Editor**

1. Abre Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `scripts/validar-integridad-datos.sql`
3. Ejecuta el script completo
4. Revisa los resultados

**Opción B: Usar script Node.js**

```bash
node scripts/validar-integridad-supabase.js
```

**Qué buscar en los resultados:**

#### ✅ Validaciones que DEBEN pasar (0 resultados):
- Sprints cerrados sin end_date
- Sprints cerrados sin complete_date (puede haber algunos históricos)
- Sprints con fechas inconsistentes
- Issues en sprints cerrados sin status_at_sprint_close (solo si fueron removidos ANTES del cierre)
- issue_sprints sin issue asociado (datos huérfanos)
- issue_sprints sin sprint asociado (datos huérfanos)

#### ⚠️ Validaciones que pueden tener resultados (revisar caso por caso):
- Issues con SP aumentados durante sprint (puede ser válido)
- Issues con SP actual diferente a SP al cierre (normal si el ticket cambió después del cierre)
- Issues con status_at_sprint_close no reconocido (revisar si necesita agregarse a status_definitions)

### 2. Validar Sprint Específico

```bash
# Validar un sprint específico
node scripts/validar-integridad-supabase.js --sprint <sprint_id>
```

**Qué revisar:**
- ✅ `total_issues` debe incluir todos los issues que estuvieron en el sprint
- ✅ `issues_al_cierre` debe ser <= `total_issues`
- ✅ `issues_removidos` = `total_issues` - `issues_al_cierre`
- ✅ `sp_committed` debe coincidir con la suma de `story_points_at_start` de issues al cierre
- ✅ `sp_completed` debe coincidir con la suma de `story_points_at_close` de issues completados al cierre

---

## 📊 Validaciones de Métricas (10 minutos)

### 1. Comparar Planning Accuracy

**Query SQL:**

```sql
-- Comparar Planning Accuracy calculado vs manual
SELECT 
  sv.sprint_id,
  s.sprint_name,
  sq.squad_name,
  sv.sp_committed as sp_committed_velocity,
  sv.sp_completed as sp_completed_velocity,
  -- Cálculo manual
  SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END) as sp_committed_manual,
  SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END) as sp_completed_manual,
  -- Diferencia
  ABS(COALESCE(sv.sp_committed, 0) - SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END)) as diff_committed,
  ABS(COALESCE(sv.sp_completed, 0) - SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END)) as diff_completed
FROM sprint_velocity sv
INNER JOIN sprints s ON sv.sprint_id = s.id
INNER JOIN squads sq ON sv.squad_id = sq.id
LEFT JOIN issue_sprints is_rel ON sv.sprint_id = is_rel.sprint_id AND sv.squad_id = is_rel.squad_id
WHERE s.state = 'closed'
GROUP BY sv.sprint_id, s.sprint_name, sq.squad_name, sv.sp_committed, sv.sp_completed
HAVING ABS(COALESCE(sv.sp_committed, 0) - SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END)) > 0.1
   OR ABS(COALESCE(sv.sp_completed, 0) - SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END)) > 0.1
ORDER BY diff_committed DESC, diff_completed DESC;
```

**Qué buscar:**
- ✅ `diff_committed` y `diff_completed` deben ser < 0.1 (casi cero)
- ⚠️ Si hay diferencias grandes, revisar:
  - ¿Se están filtrando tickets removidos correctamente?
  - ¿Los cálculos de RPC están usando `story_points_at_close` para sprints cerrados?

---

## 🧪 Validaciones de Retry (Simulación)

### 1. Monitorear Logs Durante Sync

```bash
# Ejecutar sync y monitorear logs
npm run sync 2>&1 | tee sync-log.txt

# Buscar patrones de retry
grep -i "retry\|429\|rate limit\|backoff" sync-log.txt
```

**Qué buscar:**
- ✅ Si hay rate limiting (429), debe mostrar mensajes de espera según `retry-after`
- ✅ Debe mostrar mensajes de reintento con delays exponenciales
- ✅ No debe fallar completamente por rate limiting

### 2. Validar con Sprint Grande

```bash
# Buscar un sprint con muchos issues (>100)
# Ejecutar sync y verificar que maneja paginación correctamente
npm run sync
```

**Qué buscar:**
- ✅ Debe mostrar múltiples páginas siendo obtenidas
- ✅ Debe haber delays de 200ms entre páginas
- ✅ No debe fallar por rate limiting

---

## 📝 Checklist de Validación Completa

### Antes de Validar
- [ ] Sync reciente ejecutado (últimos 30 minutos)
- [ ] Acceso a Supabase SQL Editor
- [ ] Acceso a logs del sync

### Validaciones Básicas
- [ ] Tests del retry helper pasan (8/8)
- [ ] Sync completa sin errores fatales
- [ ] No hay datos huérfanos (issue_sprints sin issue/sprint)

### Validaciones de Integridad
- [ ] Sprints cerrados tienen `end_date` y `complete_date`
- [ ] Issues en sprints cerrados tienen `status_at_sprint_close` (excepto removidos)
- [ ] Story points consistentes entre `current_story_points` y `story_points_at_close`
- [ ] Status reconocidos en `status_definitions`

### Validaciones de Métricas
- [ ] Planning Accuracy coincide entre cálculo RPC y manual
- [ ] Capacity Accuracy coincide entre cálculo RPC y manual
- [ ] Sprint Velocity coincide con datos de `issue_sprints`

### Validaciones de Retry
- [ ] Retry funciona correctamente con rate limiting simulado
- [ ] Exponential backoff funciona correctamente
- [ ] Delay entre páginas funciona (200ms)

---

## 🆘 Qué Hacer Si Encuentras Problemas

### Problema: Datos inconsistentes

1. **Ejecutar sync completo:**
   ```bash
   npm run force-full-sync
   ```

2. **Re-ejecutar validaciones SQL**

3. **Si persiste, revisar:**
   - ¿Hay tickets removidos del sprint antes del cierre?
   - ¿Los cálculos están usando `status_at_sprint_close` correctamente?
   - ¿Los story points están usando `story_points_at_close` para sprints cerrados?

### Problema: Rate limiting frecuente

1. **Revisar configuración de delays:**
   - Verificar que delay entre páginas es 200ms
   - Verificar que retry respeta `retry-after` header

2. **Ajustar configuración si es necesario:**
   - Aumentar delay entre páginas si es necesario
   - Revisar límites de rate de Jira

### Problema: Tests fallan

1. **Ejecutar tests individualmente:**
   ```bash
   npm test tests/retry-helper.test.js -- --grep "nombre del test"
   ```

2. **Revisar logs de error**

3. **Verificar que retry-helper.js está correctamente importado**

---

## 📚 Referencias

- [Script SQL de Validación](../scripts/validar-integridad-datos.sql)
- [Script Node.js de Validación](../scripts/validar-integridad-supabase.js)
- [Tests de Retry Helper](../tests/retry-helper.test.js)
- [Documentación de Retry Helper](../src/utils/retry-helper.js)

---

## ✅ Resultado Esperado

Después de todas las validaciones, deberías tener:

1. ✅ **Sync resiliente** - No falla por rate limiting
2. ✅ **Datos consistentes** - Todas las validaciones pasan
3. ✅ **Métricas precisas** - Planning Accuracy y Capacity Accuracy correctos
4. ✅ **Retry funcionando** - Reintentos automáticos con exponential backoff
