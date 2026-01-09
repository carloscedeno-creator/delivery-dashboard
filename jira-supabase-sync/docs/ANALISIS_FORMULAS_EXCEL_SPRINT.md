# Análisis de Fórmulas Excel para Métricas de Sprint

## 📊 Métricas Identificadas en Excel

### 1. **SP Commitment (Planning)** - Columna O
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,"="&C2,'Sprint Total'!R:R,"="&D2,'Sprint Total'!G:G,B2)-P2-Q2-R2`

**Lógica**:
- Suma SP de tickets con fechas de sprint (`P:P` = start_date, `R:R` = end_date) iguales al sprint actual
- **RESTA**: SP Carried Over (P2), SP Bugs detected (Q2), SP Additional (R2)
- **Significado**: Commitment es solo tickets planificados desde el inicio, NO incluye carryover, bugs detectados, ni adicionales

**Problema Identificado**:
- ❌ Usa `P:P` y `R:R` (fechas de sprint) pero NO verifica `status_at_sprint_close IS NOT NULL`
- ❌ Puede contar tickets removidos antes del cierre

**Corrección Necesaria**:
- ✅ Para sprints cerrados, solo contar tickets con `status_at_sprint_close IS NOT NULL`
- ✅ Usar `story_points_at_start` de `issue_sprints` (SP al inicio del sprint)

---

### 2. **SP Carried Over Last Sprint** - Columna Q
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,"="&C3,'Sprint Total'!R:R,"="&D3,'Sprint Total'!G:G,B3,'Sprint Total'!G:G,B2)`

**Lógica**:
- Tickets que estaban en el sprint anterior (`B2`) pero ahora están en el sprint actual (`B3`)
- **Significado**: Tickets no completados del sprint anterior que se llevaron al sprint actual

**Problema Identificado**:
- ❌ Usa `current_sprint` (G:G) que puede cambiar después del cierre
- ❌ Para sprints cerrados, debería usar `issue_sprints` para ambos sprints

**Corrección Necesaria**:
- ✅ Para sprints cerrados, usar `issue_sprints` del sprint anterior y del sprint actual
- ✅ Solo contar tickets que estaban en el sprint anterior al cierre (`status_at_sprint_close IS NOT NULL` en sprint anterior)
- ✅ Y que están en el sprint actual al cierre (`status_at_sprint_close IS NOT NULL` en sprint actual)

---

### 3. **SP Bugs Detected** - Columna R
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,"="&C2,'Sprint Total'!R:R,"="&D2,'Sprint Total'!G:G,B2,'Sprint Total'!A:A,"Bug",'Sprint Total'!N:N,">="&C2,'Sprint Total'!N:N,"<="&D2)`

**Lógica**:
- Bugs creados (`N:N` = created_date) durante el sprint
- **Significado**: Bugs detectados durante el sprint (no planificados)

**Problema Identificado**:
- ❌ Usa fechas de sprint pero NO verifica `status_at_sprint_close IS NOT NULL`
- ❌ Puede contar bugs que fueron removidos antes del cierre

**Corrección Necesaria**:
- ✅ Para sprints cerrados, solo contar bugs con `status_at_sprint_close IS NOT NULL`
- ✅ Usar `created_date` dentro del rango del sprint
- ✅ Tipo de issue = "Bug"

---

### 4. **SP Additional** - Columna S
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,C2,'Sprint Total'!R:R,D2,'Sprint Total'!G:G,B2,'Sprint Total'!N:N,">"&C2+1,'Sprint Total'!N:N,"<"&-1+D2,'Sprint Total'!A:A,"<>"&"Bug")`

**Lógica**:
- Tickets NO bugs creados después del inicio del sprint (`N:N > C2+1` y `< D2-1`)
- **Significado**: Tickets adicionales agregados durante el sprint (no planificados, no bugs)

**Problema Identificado**:
- ❌ Usa fechas de sprint pero NO verifica `status_at_sprint_close IS NOT NULL`
- ❌ Puede contar tickets removidos antes del cierre

**Corrección Necesaria**:
- ✅ Para sprints cerrados, solo contar tickets con `status_at_sprint_close IS NOT NULL`
- ✅ Usar `created_date` después del inicio del sprint
- ✅ Tipo de issue ≠ "Bug"

---

### 5. **SP Finished** - Columna V
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,"="&C2,'Sprint Total'!R:R,"="&D2,'Sprint Total'!G:G,B2,'Sprint Total'!S:S,">="&C2,'Sprint Total'!S:S,"<="&D2 ,'Sprint Total'!E:E,"*Done*")-W2-X2`

**Lógica**:
- Tickets completados (`S:S` = resolved_date dentro del rango, `E:E` = "*Done*") durante el sprint
- **RESTA**: SP Bugs fixed (W2), SP Finished Additional (X2)
- **Significado**: SP Finished es solo tickets planificados originalmente que se completaron, NO incluye bugs ni adicionales

**Problema Identificado**:
- ❌ Usa fechas de sprint pero NO verifica `status_at_sprint_close IS NOT NULL`
- ❌ Puede contar tickets removidos antes del cierre

**Corrección Necesaria**:
- ✅ Para sprints cerrados, solo contar tickets con `status_at_sprint_close IS NOT NULL`
- ✅ Usar `story_points_at_close` de tickets completados
- ✅ Excluir bugs y adicionales (ya restados en la fórmula)

---

### 6. **SP Bugs Fixed** - Columna W
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,"="&C2,'Sprint Total'!R:R,"="&D2,'Sprint Total'!G:G,B2,'Sprint Total'!E:E,"*Done*",'Sprint Total'!A:A,"Bug")`

**Lógica**:
- Bugs completados durante el sprint
- **Significado**: Bugs que fueron resueltos durante el sprint

**Problema Identificado**:
- ❌ Usa fechas de sprint pero NO verifica `status_at_sprint_close IS NOT NULL`
- ❌ Puede contar bugs removidos antes del cierre

**Corrección Necesaria**:
- ✅ Para sprints cerrados, solo contar bugs con `status_at_sprint_close IS NOT NULL`
- ✅ Usar `story_points_at_close` de bugs completados
- ✅ Tipo de issue = "Bug"

---

### 7. **SP Finished Additional** - Columna X
**Fórmula**: `=SUMIFS('Sprint Total'!F:F,'Sprint Total'!P:P,C2,'Sprint Total'!R:R,D2,'Sprint Total'!G:G,B2,'Sprint Total'!N:N,">"&C2+1,'Sprint Total'!N:N,"<"&-1+D2 ,'Sprint Total'!S:S,">="&C2,'Sprint Total'!S:S,"<="&D2 ,'Sprint Total'!E:E,"*Done*",'Sprint Total'!A:A,"<>"&"Bug")`

**Lógica**:
- Tickets adicionales (NO bugs, creados después del inicio) completados durante el sprint
- **Significado**: Tickets adicionales que fueron completados durante el sprint

**Problema Identificado**:
- ❌ Usa fechas de sprint pero NO verifica `status_at_sprint_close IS NOT NULL`
- ❌ Puede contar tickets removidos antes del cierre

**Corrección Necesaria**:
- ✅ Para sprints cerrados, solo contar tickets con `status_at_sprint_close IS NOT NULL`
- ✅ Usar `story_points_at_close` de tickets adicionales completados
- ✅ Tipo de issue ≠ "Bug", creados después del inicio

---

## 🎯 Regla Fundamental para TODAS las Métricas

**Para sprints cerrados, TODAS las métricas deben filtrar por `status_at_sprint_close IS NOT NULL`**

Esto asegura que solo contamos tickets que estaban en el sprint al momento del cierre, no tickets que fueron removidos antes del cierre.

---

## 📝 Mapeo de Columnas Excel → Tablas Supabase

| Columna Excel | Descripción | Tabla Supabase | Campo |
|---------------|-------------|---------------|-------|
| `'Sprint Total'!F:F` | Story Points | `issues` | `current_story_points` |
| `'Sprint Total'!P:P` | Sprint Start Date | `sprints` | `start_date` |
| `'Sprint Total'!R:R` | Sprint End Date | `sprints` | `end_date` |
| `'Sprint Total'!G:G` | Sprint Name | `sprints` | `sprint_name` |
| `'Sprint Total'!S:S` | Resolved Date | `issues` | `resolved_date` |
| `'Sprint Total'!N:N` | Created Date | `issues` | `created_date` |
| `'Sprint Total'!E:E` | Status | `issues` | `current_status` |
| `'Sprint Total'!A:A` | Issue Type | `issues` | `issue_type` |
| - | Status at Sprint Close | `issue_sprints` | `status_at_sprint_close` |
| - | SP at Start | `issue_sprints` | `story_points_at_start` |
| - | SP at Close | `issue_sprints` | `story_points_at_close` |

---

## ✅ Correcciones Implementadas

### 1. **SP Commitment (Planning)**
- ✅ **CORREGIDO**: Usa `story_points_at_start` de tickets con `status_at_sprint_close IS NOT NULL`
- ✅ **CORREGIDO**: Excluye tickets removidos antes del cierre
- ✅ **Archivos**: `teamHealthKPIService.js` líneas 491-518, 760-784

### 2. **SP Finished**
- ✅ **CORREGIDO**: Usa `story_points_at_close` de tickets completados con `status_at_sprint_close IS NOT NULL`
- ✅ **CORREGIDO**: Excluye tickets removidos antes del cierre
- ✅ **Archivos**: `teamHealthKPIService.js` líneas 516-529, 772-777

### 3. **SP Carried Over** (NUEVO - No implementado completamente)
- ⏳ Necesita implementación completa usando `issue_sprints` para ambos sprints
- ⏳ Filtrar por `status_at_sprint_close IS NOT NULL` en ambos sprints

### 4. **SP Bugs Detected** (NUEVO - No implementado)
- ⏳ Necesita implementación usando `issue_sprints` con filtro por `status_at_sprint_close IS NOT NULL`
- ⏳ Filtrar por `created_date` dentro del rango del sprint
- ⏳ Tipo de issue = "Bug"

### 5. **SP Additional** (NUEVO - No implementado)
- ⏳ Necesita implementación usando `issue_sprints` con filtro por `status_at_sprint_close IS NOT NULL`
- ⏳ Filtrar por `created_date` después del inicio del sprint
- ⏳ Tipo de issue ≠ "Bug"

### 6. **SP Bugs Fixed** (NUEVO - No implementado completamente)
- ⏳ Necesita implementación usando `issue_sprints` con filtro por `status_at_sprint_close IS NOT NULL`
- ⏳ Filtrar por bugs completados durante el sprint

### 7. **SP Finished Additional** (NUEVO - No implementado)
- ⏳ Necesita implementación usando `issue_sprints` con filtro por `status_at_sprint_close IS NOT NULL`
- ⏳ Filtrar por tickets adicionales completados durante el sprint

---

## 🚀 Próximos Pasos

1. ✅ **Completado**: Filtro de tickets removidos en SP Commitment y SP Finished
2. ⏳ **Pendiente**: Implementar métricas adicionales (Carried Over, Bugs Detected, Additional, Bugs Fixed, Finished Additional)
3. ⏳ **Pendiente**: Validar que todas las métricas usan `status_at_sprint_close IS NOT NULL` para sprints cerrados
