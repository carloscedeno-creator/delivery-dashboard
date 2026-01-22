# Metrics Calculations - KPIs & Formulas

**Última actualización:** 2024-12-19

---

## 📊 Status Unification

### Status Helper
- **Archivo:** `src/utils/statusHelper.js`
- **Propósito:** Fuente de verdad para verificar estatus "Done"
- **Funciones:**
  - `isDevDoneStatusSync(status)` - Verifica "Dev Done"
  - `isCompletedStatusSync(status, includeDevDone)` - Verifica "Done" completo

### Regla de Oro
- ✅ **SIEMPRE** usar `statusHelper.js` para verificar estatus
- ❌ **NUNCA** hardcodear lógica de estatus (ej: `status === 'DONE'`)

---

## 📈 Story Points Done

### Función RPC
- **Nombre:** `calculate_squad_sprint_sp_done(squad_id, sprint_id)`
- **Lógica:** Usa `is_status_completed()` que consulta `status_definitions`
- **Retorna:** NUMERIC (SP Done)

### Regla de Oro
- ✅ **SIEMPRE** usar función RPC
- ❌ **NUNCA** calcular manualmente SP Done

---

## 🎯 Developer Metrics

### Fórmulas
- **Dev Done Rate:** `(issues_dev_done / total_issues) * 100`
- **SP Dev Done:** Suma de SP de issues "Dev Done"
- **SP Dev Done Rate:** `(sp_dev_done / total_sp) * 100`

### Filtros
- Por sprint: Usar `current_sprint` (no `issue_sprints`)
- Por squad: Filtrar por `initiatives.squad_id`
- Por desarrollador: Filtrar por `assignee_id`

**Ver:** `docs/DEVELOPER_METRICS_FORMULAS.md`

---

## 📊 Team Capacity

### Cálculo de Capacidad
- Usar función RPC `calculate_squad_sprint_sp_done`
- Comparar con capacidad planificada
- Calcular accuracy: `(sp_done / sp_planned) * 100`

---

## 🔄 Scope Changes

### Tipos de Cambios
1. **Added:** Issue agregado después del inicio del sprint
2. **Removed:** Issue removido antes del cierre del sprint
3. **Story Points Changed:** Cambio en SP durante el sprint

### Cálculo
- **SP Added:** Suma de SP de issues agregados
- **SP Removed:** Suma de SP de issues removidos
- **Net Change:** SP Added - SP Removed

---

## ⚠️ Anti-Patterns

### ❌ NO Hacer
- Hardcodear lógica de estatus
- Calcular SP Done manualmente
- Usar `issue_sprints` para filtrar por sprint actual (usar `current_sprint`)

### ✅ SIEMPRE Hacer
- Usar `statusHelper.js` para verificar estatus
- Usar función RPC para cálculos de SP Done
- Consultar `status_definitions` para estatus

---

## 🔗 Referencias

- Status Helper: `src/utils/statusHelper.js`
- Developer Metrics: `docs/DEVELOPER_METRICS_FORMULAS.md`
- Database Schema: `/reference/database_schema.md`
