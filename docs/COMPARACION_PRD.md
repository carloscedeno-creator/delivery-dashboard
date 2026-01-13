# Comparación: PRD v1.0 vs PRD v2.0 Proposal

**Fecha:** 2024-12-19  
**Objetivo:** Identificar diferencias entre PRD actual y propuesta v2.0

---

## 📊 Resumen Ejecutivo

El PRD actual (`specs/prd.md`) es la **versión 1.0** que describe el dashboard funcional. La propuesta (`specs/prd-v2-proposal.md`) es la **versión 2.0** que agrega documentación del Framework Ralph-Compounding y Ralph Agent que ya está implementado.

---

## 🔍 Diferencias Principales

### 1. Mission Statement

**PRD v1.0:**
```
Dashboard React para visualizar métricas de delivery en tiempo real...
```

**PRD v2.0 Proposal:**
```
Dashboard React para visualizar métricas de delivery en tiempo real...

**Nuevo:** El proyecto ahora utiliza el Framework Ralph-Compounding / Agentic Engineering...
```

**Diferencia:** v2.0 agrega mención del framework en el Mission Statement.

---

### 2. Target Users

**PRD v1.0:**
- 4 tipos de usuarios (PMs, Engineering Managers, Developers, Stakeholders)

**PRD v2.0 Proposal:**
- 5 tipos de usuarios (agrega "AI Agents - Desarrollo autónomo usando Ralph agent loop")

**Diferencia:** v2.0 agrega AI Agents como usuario del sistema.

---

### 3. Technical Architecture

**PRD v1.0:**
- Frontend Stack
- Backend Stack
- Data Flow

**PRD v2.0 Proposal:**
- Frontend Stack (igual)
- Backend Stack (igual)
- **Development Framework (NUEVO):**
  - Agentic Engineering
  - Autonomous Agent
  - PRD-First
  - System Evolution
  - Context Reset
- Data Flow (igual)
- **Development Workflow (NUEVO):** `PRD → User Stories → Ralph Agent Loop → Implementation → System Evolution`

**Diferencia:** v2.0 agrega sección completa de Development Framework y Development Workflow.

---

### 4. Core Features

**PRD v1.0:**
- 8 features (Authentication, Overall View, Delivery Metrics, Projects Metrics, Developer Metrics, Team Capacity, Product Roadmap, ENPS Survey)

**PRD v2.0 Proposal:**
- 9 features (agrega "Autonomous Development" como feature #9)

**Diferencia:** v2.0 agrega Autonomous Development como feature explícita.

---

### 5. Data Sources

**PRD v1.0:**
- Lista básica de tablas Supabase
- Sync básico de Jira API

**PRD v2.0 Proposal:**
- Lista extendida con nuevas tablas:
  - `status_definitions` (NUEVO)
  - `sprint_scope_changes` (NUEVO)
- Sync mejorado:
  - Retry con exponential backoff (NUEVO)
  - Scope change detection automático (NUEVO)

**Diferencia:** v2.0 documenta nuevas tablas y mejoras en sync que ya están implementadas.

---

### 6. Development Architecture (COMPLETAMENTE NUEVO)

**PRD v1.0:**
- ❌ No existe esta sección

**PRD v2.0 Proposal:**
- ✅ Sección completa "Development Architecture" con:
  - Framework Ralph-Compounding (5 subsecciones)
  - Ralph Autonomous Agent (workflow completo)

**Diferencia:** v2.0 agrega sección completa de arquitectura de desarrollo que no existe en v1.0.

---

### 7. Success Metrics

**PRD v1.0:**
- Solo métricas de funcionalidad

**PRD v2.0 Proposal:**
- Métricas de funcionalidad (igual)
- **Métricas de Desarrollo (NUEVO):**
  - Framework implementado
  - Ralph agent configurado
  - System Evolution tracking
  - Documentación estructurada
  - Bugs documentados

**Diferencia:** v2.0 agrega métricas de desarrollo además de funcionalidad.

---

### 8. Referencias

**PRD v1.0:**
- Solo referencias del proyecto

**PRD v2.0 Proposal:**
- Referencias del proyecto (igual)
- **Referencias del Framework (NUEVO):**
  - Constitución, PRD, Stories
  - Ralph Setup, System Evolution
  - PPRE Workflow, Context Reset

**Diferencia:** v2.0 agrega referencias a documentación del framework.

---

### 9. Cambios desde v1.0 (COMPLETAMENTE NUEVO)

**PRD v1.0:**
- ❌ No existe esta sección

**PRD v2.0 Proposal:**
- ✅ Sección completa documentando:
  - Cambios arquitecturales
  - Cambios funcionales
  - Cambios estructurales

**Diferencia:** v2.0 agrega sección de changelog que no existe en v1.0.

---

## ✅ Conclusión

### Lo que YA está en v1.0:
- ✅ Descripción completa del dashboard funcional
- ✅ Todas las features principales documentadas
- ✅ Arquitectura técnica básica
- ✅ Data sources básicos

### Lo que FALTA en v1.0 (agregado en v2.0):
- ❌ Mención del Framework Ralph-Compounding
- ❌ Sección de Development Architecture
- ❌ Documentación de Ralph Agent
- ❌ Nuevas tablas (`status_definitions`, `sprint_scope_changes`)
- ❌ Mejoras en sync (retry, scope changes)
- ❌ Métricas de desarrollo
- ❌ Referencias del framework
- ❌ Changelog de cambios

---

## 🎯 Recomendación

**El PRD v1.0 está desactualizado** respecto a la arquitectura real del proyecto. La propuesta v2.0 documenta cambios que **ya están implementados** pero no están reflejados en el PRD.

**Acción sugerida:**
1. Revisar la propuesta v2.0
2. Aprobar los cambios que reflejen la realidad actual
3. Actualizar `specs/prd.md` con la versión aprobada
4. Eliminar `specs/prd-v2-proposal.md` después de actualizar

---

## 📋 Checklist de Actualización

- [ ] Revisar si todos los cambios en v2.0 reflejan la realidad actual
- [ ] Verificar que no falta nada importante
- [ ] Aprobar cambios
- [ ] Actualizar `specs/prd.md` con contenido de v2.0
- [ ] Eliminar `specs/prd-v2-proposal.md`
- [ ] Commit y push
