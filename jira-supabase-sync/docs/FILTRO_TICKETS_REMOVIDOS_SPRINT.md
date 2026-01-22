# Filtro de Tickets Removidos del Sprint

## 🎯 Problema Identificado

Se estaban tomando en cuenta tickets que fueron **removidos del sprint antes del cierre** en los cálculos de métricas. Esto causaba que:

1. **Planning Accuracy** se calculaba incorrectamente (incluía SP de tickets removidos)
2. **SP Completados** incluía tickets que no estaban en el sprint al momento del cierre
3. **SP Planificados (Commitment)** incluía tickets removidos antes del cierre

### Ejemplo del Problema (basado en fórmulas de Excel):

Las fórmulas de Excel mostraban que se contaban tickets que:
- Fueron movidos al siguiente sprint (`'Sprint Total'!P:P,"="&C7` para Sprint 1, que sería Sprint 2)
- Pero tenían fechas de resolución dentro del rango del sprint actual
- Esto es **incorrecto** porque esos tickets ya no estaban en el sprint al momento del cierre

## ✅ Solución Implementada

### Regla Fundamental:
**Para sprints cerrados, solo contar tickets con `status_at_sprint_close IS NOT NULL`**

- Si `status_at_sprint_close` es `NULL` → El ticket fue removido antes del cierre → **NO contar**
- Si `status_at_sprint_close` tiene valor → El ticket estaba en el sprint al cierre → **SÍ contar**

## 📝 Cambios Realizados

### 1. `src/utils/projectMetricsApi.js`
**Línea 238-267**: Agregado filtro en la query SQL para sprints cerrados

```javascript
// ANTES: Obtenía todos los registros sin filtrar
.eq('sprint_id', sprintId);

// DESPUÉS: Filtra por status_at_sprint_close IS NOT NULL para sprints cerrados
if (isSprintClosed && sprintCloseDate) {
  issueSprintsQuery = issueSprintsQuery.not('status_at_sprint_close', 'is', null);
}
```

**Impacto**: 
- ✅ Solo obtiene tickets que estaban en el sprint al momento del cierre
- ✅ Excluye tickets removidos antes del cierre desde la query SQL (más eficiente)

### 2. `src/services/teamHealthKPIService.js` - Planning Accuracy
**Línea 491-495**: Agregado filtro en la query SQL

```javascript
// ANTES: Obtenía todos los registros sin filtrar
.eq('sprint_id', sprintId)

// DESPUÉS: Filtra por status_at_sprint_close IS NOT NULL para sprints cerrados
if (sprintCloseDate) {
  issueSprintQuery = issueSprintQuery.not('status_at_sprint_close', 'is', null);
}
```

**Línea 514-518**: Corregido cálculo de `plannedSP` (Commitment)

```javascript
// ANTES: Sumaba story_points_at_start de TODOS los registros
plannedSP = issueSprintRows.reduce((sum, row) => {
  const spAtStart = Number(row.story_points_at_start) || 0;
  return sum + spAtStart;
}, 0);

// DESPUÉS: Solo suma story_points_at_start de tickets que estaban en el sprint al cierre
plannedSP = issueSprintRows.reduce((sum, row) => {
  // Si status_at_sprint_close es null, el ticket fue removido antes del cierre, excluirlo
  if (!row.status_at_sprint_close && sprintCloseDate) {
    return sum;
  }
  const spAtStart = Number(row.story_points_at_start) || 0;
  return sum + spAtStart;
}, 0);
```

**Impacto**:
- ✅ `plannedSP` (Commitment) solo cuenta tickets que estaban en el sprint al cierre
- ✅ `completedSP` ya estaba filtrado correctamente (solo tickets completados con status_at_sprint_close)

### 3. `src/services/teamHealthKPIService.js` - Capacity Accuracy
**Línea 1044-1048**: Agregado filtro en la query SQL

```javascript
// ANTES: Obtenía todos los registros sin filtrar
.eq('sprint_id', sprintId)

// DESPUÉS: Filtra por status_at_sprint_close IS NOT NULL para sprints cerrados
if (sprint && (sprint.state === 'closed' || sprintCloseDate)) {
  issueSprintQuery = issueSprintQuery.not('status_at_sprint_close', 'is', null);
}
```

**Impacto**:
- ✅ Todos los cálculos de Capacity Accuracy ahora solo usan tickets que estaban en el sprint al cierre
- ✅ `totalSPAtClose`, `deliveredSP`, `totalHoursAtClose`, `deliveredHours` son correctos

### 4. `src/services/teamHealthKPIService.js` - `calculateCompletedStoryPointsBatch`
**Línea 81-149**: Cambiado de usar `current_sprint` a usar `issue_sprints`

```javascript
// ANTES: Usaba current_sprint (incorrecto para sprints cerrados)
const { data: allIssues } = await supabase
  .from('issues')
  .select('current_story_points, current_status, current_sprint, status_by_sprint, issue_key')
  .in('current_sprint', sprintNames);

// DESPUÉS: Usa issue_sprints con filtro por status_at_sprint_close IS NOT NULL
const { data: issueSprintRows } = await supabase
  .from('issue_sprints')
  .select('issue_id, sprint_id, status_at_sprint_close, story_points_at_close')
  .in('sprint_id', filteredSprints.map(s => s.id))
  .not('status_at_sprint_close', 'is', null); // Solo tickets que estaban en el sprint al cierre
```

**Impacto**:
- ✅ Para sprints cerrados, usa `issue_sprints` (la "foto" al cierre) en lugar de `current_sprint`
- ✅ Solo cuenta tickets que estaban en el sprint al momento del cierre
- ✅ Usa `story_points_at_close` en lugar de `current_story_points` (más preciso)

### 5. `src/utils/developerMetricsApi.js`
**✅ Ya estaba correcto**: Línea 227 tiene `.not('status_at_sprint_close', 'is', null)`

## 🔍 Validación

### Cómo Verificar que Funciona:

1. **Para un sprint cerrado**, ejecutar esta query SQL:
```sql
-- Tickets que estaban en el sprint al cierre (deben contarse)
SELECT COUNT(*) as tickets_en_sprint_al_cierre
FROM issue_sprints
WHERE sprint_id = '<sprint_id>'
  AND status_at_sprint_close IS NOT NULL;

-- Tickets removidos antes del cierre (NO deben contarse)
SELECT COUNT(*) as tickets_removidos
FROM issue_sprints
WHERE sprint_id = '<sprint_id>'
  AND status_at_sprint_close IS NULL;
```

2. **Verificar Planning Accuracy**:
   - `plannedSP` debe ser igual a la suma de `story_points_at_start` de tickets con `status_at_sprint_close IS NOT NULL`
   - `completedSP` debe ser igual a la suma de `story_points_at_close` de tickets completados con `status_at_sprint_close IS NOT NULL`

3. **Comparar con Excel**:
   - Los valores ahora deben coincidir con las fórmulas de Excel que solo cuentan tickets que estaban en el sprint al cierre

## 📊 Impacto en Métricas

### Planning Accuracy:
- ✅ **Antes**: Incluía SP de tickets removidos → Accuracy inflado/incorrecto
- ✅ **Después**: Solo cuenta tickets que estaban en el sprint al cierre → Accuracy correcto

### Capacity Accuracy:
- ✅ **Antes**: Incluía capacidad de tickets removidos → Accuracy incorrecto
- ✅ **Después**: Solo cuenta tickets que estaban en el sprint al cierre → Accuracy correcto

### SP Completados:
- ✅ **Antes**: Podía incluir tickets removidos si se resolvían después
- ✅ **Después**: Solo cuenta tickets que estaban en el sprint al cierre y fueron completados

## 🚀 Próximos Pasos

1. ✅ Filtros agregados en queries SQL
2. ✅ Cálculos corregidos para excluir tickets removidos
3. ⏳ **Validar en producción** que los valores coinciden con Excel
4. ⏳ **Monitorear** que no hay tickets removidos siendo contados incorrectamente

## 📝 Notas Técnicas

- `status_at_sprint_close` es la "foto" del estado del ticket al momento del cierre del sprint
- Si es `NULL`, significa que el ticket fue removido del sprint antes del cierre
- Para sprints activos, no aplicamos este filtro porque aún pueden agregarse/removerse tickets
- Para sprints cerrados, SIEMPRE debemos filtrar por `status_at_sprint_close IS NOT NULL`
