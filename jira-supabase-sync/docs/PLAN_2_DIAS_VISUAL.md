# 🚀 Plan de Ejecución: 2 Días - Resultados Efectivos

## 📊 RESUMEN EJECUTIVO

**Objetivo:** Entregar mejoras críticas que resuelvan problemas inmediatos en **2 días**.

**Enfoque:** Hacer pocas cosas bien, con impacto inmediato y visible.

---

## 📅 CRONOGRAMA

```
┌─────────────────────────────────────────────────────────────┐
│                    DÍA 1 - FUNDAMENTOS                      │
├─────────────────────────────────────────────────────────────┤
│ MAÑANA (4 horas)                                           │
│ ✅ Tarea 1: Unificar Lógica de Estatus "Done"              │
│                                                             │
│ TARDE (3 horas)                                            │
│ ✅ Tarea 2: Retry con Exponential Backoff                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    DÍA 2 - MEJORAS VISIBLES                │
├─────────────────────────────────────────────────────────────┤
│ MAÑANA (2 horas)                                           │
│ ✅ Tarea 3: Mejorar Condiciones de Cierre de Sprint       │
│                                                             │
│ TARDE (3 horas)                                            │
│ ✅ Tarea 4: Tracking Básico de Scope Changes              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔥 TAREA 1: Unificar Lógica de Estatus "Done"

### ⏱️ Tiempo: 4 horas

### 🎯 Por qué es crítico
- ❌ **Problema actual:** Lógica dispersa en 10+ archivos
- ❌ **Impacto:** KPIs muestran valores diferentes según dónde se calcule
- ❌ **Confusión:** PMs no saben qué valor es correcto
- ✅ **Solución:** Una sola fuente de verdad

### 📋 Checklist de Ejecución

#### Paso 1.1: Crear Migración SQL (30 min)
- [x] ✅ Crear archivo `migrations/create_status_definitions_table.sql`
- [ ] ⏳ Aplicar migración en Supabase
- [ ] ⏳ Verificar que tabla existe

**Archivo creado:** `jira-supabase-sync/migrations/create_status_definitions_table.sql`

#### Paso 1.2: Crear Helper Centralizado (1 hora)
- [x] ✅ Crear `src/utils/statusHelper.js`
- [x] ✅ Implementar funciones:
  - `isCompletedStatus()` - async
  - `isCompletedStatusSync()` - sync (para casos críticos)
  - `isDevDoneStatus()`
  - `isProductionDoneStatus()`
- [x] ✅ Incluir fallback a defaults si BD no disponible

**Archivo creado:** `src/utils/statusHelper.js`

#### Paso 1.3: Reemplazar Funciones Críticas (1.5 horas)
- [x] ✅ Reemplazar en `teamHealthKPIService.js` (6 funciones)
- [ ] ⏳ Reemplazar en `projectMetricsApi.js`
- [ ] ⏳ Reemplazar en `sprintBurndownApi.js`
- [ ] ⏳ Reemplazar en `developerMetricsApi.js`
- [ ] ⏳ Reemplazar en `ProjectsMetrics.jsx`
- [ ] ⏳ Reemplazar en `issue-processor.js` (sync)

**Archivos afectados:**
- ✅ `src/services/teamHealthKPIService.js` (COMPLETADO)
- ⏳ `src/utils/projectMetricsApi.js` (PENDIENTE)
- ⏳ `src/utils/sprintBurndownApi.js` (PENDIENTE)
- ⏳ `src/utils/developerMetricsApi.js` (PENDIENTE)
- ⏳ `src/components/ProjectsMetrics.jsx` (PENDIENTE)
- ⏳ `jira-supabase-sync/src/processors/issue-processor.js` (PENDIENTE)

#### Paso 1.4: Validar KPIs Consistentes (1 hora)
- [ ] ⏳ Probar Planning Accuracy en diferentes lugares
- [ ] ⏳ Verificar que muestra mismo valor
- [ ] ⏳ Probar Capacity Accuracy
- [ ] ⏳ Verificar que incluye "DEVELOPMENT DONE" correctamente

### ✅ Resultado Esperado
**KPIs consistentes en todo el sistema** - mismo resultado sin importar dónde se calcule.

---

## 🔥 TAREA 2: Retry con Exponential Backoff

### ⏱️ Tiempo: 3 horas

### 🎯 Por qué es crítico
- ❌ **Problema actual:** Sync falla completamente si Jira rate-limits (429)
- ❌ **Impacto:** Pérdida de datos hasta próxima sync (30 min)
- ❌ **Sin recuperación:** No hay reintentos automáticos
- ✅ **Solución:** Retry inteligente con exponential backoff

### 📋 Checklist de Ejecución

#### Paso 2.1: Crear Retry Helper (1 hora)
- [x] ✅ Crear `jira-supabase-sync/src/utils/retry-helper.js`
- [x] ✅ Implementar `retryWithBackoff()` con:
  - Manejo de rate limiting (429)
  - Respeta header `retry-after` de Jira
  - Exponential backoff para errores temporales (5xx)
  - No retry para errores permanentes (4xx excepto 429)
- [x] ✅ Logging detallado de reintentos

**Archivo creado:** `jira-supabase-sync/src/utils/retry-helper.js`

#### Paso 2.2: Aplicar a Método Crítico (1 hora)
- [x] ✅ Aplicar retry a `fetchSprintIssues()` en `jira-client.js`
- [x] ✅ Aplicar retry a `fetchAllIssues()` en `jira-client.js`
- [x] ✅ Mantener paginación existente
- [x] ✅ Agregar delay pequeño entre páginas (200ms)

**Archivos modificados:**
- ✅ `jira-supabase-sync/src/clients/jira-client.js` (COMPLETADO)

#### Paso 2.3: Validar con Rate Limiting (1 hora)
- [x] ✅ Crear tests unitarios para retry-helper
- [x] ✅ Simular rate limiting (429) en tests
- [x] ✅ Verificar que espera tiempo correcto según retry-after
- [x] ✅ Verificar que reintenta correctamente
- [x] ✅ Probar con error temporal (500) en tests
- [x] ✅ Verificar exponential backoff en tests

**Archivo creado:** `jira-supabase-sync/tests/retry-helper.test.js` (8 tests pasando)

### ✅ Resultado Esperado
**Sync resiliente** - no falla por rate limiting, se recupera automáticamente.

---

## 🔥 TAREA 3: Mejorar Condiciones de Cierre de Sprint

### ⏱️ Tiempo: 2 horas

### 🎯 Por qué es crítico
- ❌ **Problema actual:** Sprint cerrado en Jira pero no detectado
- ❌ **Impacto:** Métricas incorrectas para sprints cerrados
- ❌ **Sin `complete_date`:** No se actualiza automáticamente
- ✅ **Solución:** Validar estado desde Jira API y actualizar

### 📋 Checklist de Ejecución

#### Paso 3.1: Crear Validación Básica (1 hora)
- [ ] ⏳ Crear función `validateSprintClosure()` básica
- [ ] ⏳ Verificar estado de sprint desde Jira API
- [ ] ⏳ Verificar que todas las issues tienen `status_at_sprint_close`
- [ ] ⏳ Validar consistencia de datos (conteos)

#### Paso 3.2: Actualizar `complete_date` (30 min)
- [ ] ⏳ Actualizar `complete_date` cuando sprint cierra en Jira
- [ ] ⏳ Usar `completeDate` o `endDate` de Jira API
- [ ] ⏳ Solo actualizar si no existe

#### Paso 3.3: Validar con Sprint Cerrado Real (30 min)
- [ ] ⏳ Probar con sprint cerrado real
- [ ] ⏳ Verificar que `complete_date` se actualiza
- [ ] ⏳ Verificar que métricas se calculan correctamente

### ✅ Resultado Esperado
**Sprints cerrados detectados correctamente** - `complete_date` actualizado automáticamente.

---

## 🔥 TAREA 4: Tracking Básico de Scope Changes

### ⏱️ Tiempo: 3 horas

### 🎯 Por qué es crítico
- ❌ **Problema actual:** No se mide cuántos issues se agregan/remueven durante sprint
- ❌ **Impacto:** PMs no ven cambios de scope en tiempo real
- ❌ **Sin visibilidad:** Sprint puede iniciar con 30 y terminar con 35, sin tracking
- ✅ **Solución:** Tracking básico de cambios y mostrar en ProjectsMetrics

### 📋 Checklist de Ejecución

#### Paso 4.1: Crear Tabla de Cambios (30 min)
- [ ] ⏳ Crear migración SQL `sprint_scope_changes`
- [ ] ⏳ Campos: `change_type` (added/removed), `issue_id`, `change_date`
- [ ] ⏳ Aplicar migración en Supabase

#### Paso 4.2: Detectar Cambios Básicos (1.5 horas)
- [ ] ⏳ En `issue-processor.js`, detectar cuando issue se agrega al sprint
- [ ] ⏳ Detectar cuando issue se remueve del sprint
- [ ] ⏳ Guardar cambios en `sprint_scope_changes`
- [ ] ⏳ Usar changelog de Jira para obtener fecha exacta

#### Paso 4.3: Mostrar en ProjectsMetrics (1 hora)
- [ ] ⏳ Agregar sección "Scope Changes" en ProjectsMetrics
- [ ] ⏳ Mostrar:
  - Issues agregados durante sprint
  - Issues removidos durante sprint
  - Scope Change Rate: (agregados - removidos) / iniciales * 100
- [ ] ⏳ Actualizar en tiempo real durante sync

### ✅ Resultado Esperado
**PMs ven cambios de scope en tiempo real** - visibilidad completa de cambios durante sprint.

---

## 📊 RESUMEN DE RESULTADOS ESPERADOS

Al final de 2 días tendremos:

1. ✅ **KPIs consistentes** - mismo resultado en todos lados
2. ✅ **Sync resiliente** - no falla por rate limiting
3. ✅ **Sprints cerrados detectados** - `complete_date` actualizado automáticamente
4. ✅ **Tracking de scope changes** - PMs ven cambios en tiempo real

---

## ⚠️ LO QUE NO HACEMOS (Por ahora)

- ❌ Reportes avanzados (más de 2 días)
- ❌ KPIs faltantes (Cycle Time, Rework Rate) - después
- ❌ Allocation automática - después
- ❌ Dashboard de salud - después
- ❌ Reportes de Jira para PMs - después

**Enfoque:** Hacer pocas cosas bien, con impacto inmediato.

---

## 📝 NOTAS IMPORTANTES

### Prioridad de Ejecución
1. **Tarea 1** es la más crítica - afecta todos los KPIs
2. **Tarea 2** mejora confiabilidad inmediatamente
3. **Tarea 3** corrige datos históricos
4. **Tarea 4** agrega visibilidad nueva

### Validación Continua
- Después de cada tarea, validar que funciona
- No avanzar si algo está roto
- Probar con datos reales cuando sea posible

### Archivos Creados/Modificados

**Nuevos:**
- ✅ `migrations/create_status_definitions_table.sql`
- ✅ `src/utils/statusHelper.js`
- ⏳ `jira-supabase-sync/src/utils/retry-helper.js` (pendiente)
- ⏳ `migrations/create_sprint_scope_changes_table.sql` (pendiente)

**Modificados:**
- ✅ `src/services/teamHealthKPIService.js` (parcial)
- ⏳ `src/utils/projectMetricsApi.js` (pendiente)
- ⏳ `src/utils/sprintBurndownApi.js` (pendiente)
- ⏳ `src/utils/developerMetricsApi.js` (pendiente)
- ⏳ `src/components/ProjectsMetrics.jsx` (pendiente)
- ⏳ `jira-supabase-sync/src/clients/jira-client.js` (pendiente)
- ⏳ `jira-supabase-sync/src/processors/issue-processor.js` (pendiente)

---

## 🚀 ESTADO ACTUAL

### ✅ Completado
- [x] Plan de 2 días definido
- [x] Migración SQL `status_definitions` creada
- [x] Helper `statusHelper.js` creado
- [x] Funciones críticas en `teamHealthKPIService.js` reemplazadas (6 funciones)

### ⏳ En Progreso
- [ ] Aplicar migración SQL en Supabase
- [ ] Reemplazar funciones en otros archivos
- [ ] Validar KPIs consistentes

### 📋 Próximos Pasos
1. **Continuar con Tarea 1:** Reemplazar funciones en archivos restantes
2. **Aplicar migración SQL** cuando estemos listos
3. **Validar** que todo funciona antes de continuar con Tarea 2

---

## 🔗 Referencias

- [Análisis Completo del Sistema](./ANALISIS_COMPLETO_SISTEMA.md)
- [Resumen Completo de Tareas](./RESUMEN_TAREAS_COMPLETO.md)
- [Plan de Acción Completo](./PLAN_ACCION_COMPLETO.md)
