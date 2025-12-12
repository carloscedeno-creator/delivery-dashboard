# 🔍 Problema: Mauricio muestra 277% cuando debería ser 94%

## 📊 Análisis del Problema

**Situación:**
- Mauricio tiene **16 SP** asignados en el sprint actual
- Con base de **17 SP por sprint**, debería mostrar: **16 / 17 × 100 = 94%**
- Pero el dashboard muestra **277%**

## 🔍 Causa Identificada

El problema es que el **filtro por sprint** estaba siendo demasiado permisivo. Estaba contando issues viejos que se solapaban por fechas de desarrollo, pero que **NO estaban realmente en el sprint actual**.

### Issues Contados Incorrectamente

**Antes del fix:**
- Issues en sprint (según `issue_sprints`): 9 issues (16 SP) ✅
- Issues viejos que se solapan por fechas: 11 issues (31 SP) ❌
- **Total contado: 20 issues (47 SP)** ❌

**Después del fix:**
- Issues en sprint (según `issue_sprints`): 9 issues (16 SP) ✅
- Issues creados durante el sprint: 0 issues ✅
- **Total contado: 9 issues (16 SP)** ✅

## ✅ Solución Aplicada

Se actualizó el filtro `isIssueActiveInSprint` para ser más estricto:

**Antes:**
```javascript
// Contaba issues que se solapaban por fechas de desarrollo
if (issueDevStart && issueDevStart <= sprintEnd) {
  if (!issueDevClose || issueDevClose >= sprintStart) {
    return true; // ❌ Contaba issues viejos
  }
}
```

**Ahora:**
```javascript
// PRIORIDAD 1: Solo cuenta si está explícitamente en el sprint
const issueSprintIds = issueSprintMap.get(issue.id) || [];
if (issueSprintIds.includes(sprint.id)) {
  return true; // ✅ Está en el sprint
}

// PRIORIDAD 2: Solo cuenta si fue creado DURANTE el sprint
if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) {
  return true; // ✅ Fue creado durante el sprint
}

// NO cuenta issues viejos que se solapan por fechas
return false;
```

## 📋 Cálculo Correcto

Con el filtro actualizado, Mauricio tiene:

**Por Iniciativa:**
- Support: 1 SP = 6% (1 / 17 × 100)
- Agentic Observability Tool: 5 SP = 29% (5 / 17 × 100)
- DataLake: 10 SP = 59% (10 / 17 × 100)

**Total:**
- Suma de porcentajes: 6% + 29% + 59% = **94%** ✅
- O cálculo directo: 16 SP / 17 SP × 100 = **94%** ✅

## 🔄 Próximos Pasos

1. **Refrescar el dashboard** (F5) para aplicar el filtro actualizado
2. **Verificar que muestra "Live Data"** (verde) en lugar de "Not Connected" (rojo)
3. **Confirmar que Mauricio muestra 94%** en lugar de 277%

## 📝 Nota

El 277% probablemente venía de:
- Issues viejos que se solapaban por fechas de desarrollo
- Issues de múltiples squads sumándose (aunque el análisis muestra que solo tiene issues en Core)
- Datos en caché del CSV (si el dashboard estaba usando CSV como fallback)

Con el filtro actualizado, solo se cuentan issues que están **explícitamente en el sprint** o que fueron **creados durante el sprint actual**.
