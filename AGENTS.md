# Agent Instructions - Delivery Dashboard

**Framework:** Ralph-Compounding / Agentic Engineering

---

## 📚 Fuente de Verdad

**SIEMPRE** consultar antes de codificar:

1. **PRD Principal:** `/specs/prd.md` - Mission, arquitectura, features principales
2. **User Stories:** `/specs/stories.json` - Stories atomizadas con Acceptance Criteria binarios
3. **Constitución Global:** `.cursorrules` - Tech stack, estándares, referencias

---

## 🔄 Context Reset Obligation

**CRÍTICO:** Planificación y ejecución deben ser conversaciones SEPARADAS.

### Workflow PPRE:
1. **Prime:** Cargar PRD y estructura del proyecto
2. **Plan:** Generar plan markdown para una story específica
3. **RESET:** Limpiar conversación (nueva sesión)
4. **Execute:** Ejecutar plan con contexto limpio

**Por qué:** Context window degradation es real. Fresh start = mejor foco.

---

## 📖 Referencias On-Demand

**Cargar SOLO cuando sea relevante al task actual:**

- `/reference/api_guidelines.md` - Trabajando en APIs/Supabase
- `/reference/ui_components.md` - Trabajando en componentes React
- `/reference/database_schema.md` - Trabajando con base de datos
- `/reference/deployment.md` - Trabajando en deploy
- `/reference/configuration.md` - Configurando entorno
- `/reference/troubleshooting.md` - Debugging problemas
- `/reference/metrics_calculations.md` - Calculando métricas/KPIs
- `/reference/jira_integration.md` - Trabajando en sync Jira

---

## 🧠 Memoria

### Corto Plazo
- `/logs/progress.txt` - Iteraciones recientes y progreso

### Largo Plazo
- `/src/services/agents.md` - Patrones y gotchas de services
- `/src/components/agents.md` - Patrones y gotchas de components
- `/src/utils/agents.md` - Patrones y gotchas de utils
- `/jira-supabase-sync/src/agents.md` - Patrones y gotchas de sync

**SIEMPRE** consultar agents.md relevantes antes de trabajar en una carpeta.

---

## 🔧 System Evolution Mandate

**NUNCA** solo "fix" un bug. **SIEMPRE** mejorar el sistema:

1. **Identificar causa raíz:** ¿Por qué el AI cometió el error?
2. **Actualizar reglas:** Agregar regla en `/reference/` o `agents.md`
3. **Prevenir recurrencia:** Asegurar que el error no se repita

**Ejemplo:**
- Bug: AI usa imports relativos
- Fix: Agregar regla en `.cursorrules`: "Siempre usar @/ path aliases"
- Resultado: Error no se repite

---

## 📋 OpenSpec Integration

<!-- OPENSPEC:START -->
Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.
<!-- OPENSPEC:END -->

---

## ✅ Reglas Core

1. **200-Line Limit:** Archivos globales máximo 200 líneas
2. **1-Iteration Limit:** Cada story debe completarse en una sesión
3. **Binary Success Rule:** Acceptance Criteria deben ser Pass/Fail
4. **Context Reset:** Separar planificación y ejecución
5. **System Evolution:** Cada bug mejora el sistema
6. **Commandify:** Prompts repetitivos → comandos reutilizables

---

## 🎯 Workflow Recomendado

### Para Nueva Feature:
1. Leer `/specs/prd.md` y `/specs/stories.json`
2. Crear PRD específico si es necesario (`/specs/prd-{feature}.md`)
3. Atomizar en stories si es compleja
4. **RESET** conversación
5. Ejecutar story por story
6. Actualizar `agents.md` con lecciones aprendidas

### Para Bug Fix:
1. Reproducir bug
2. Identificar causa raíz
3. Fix código
4. **Actualizar reglas** (agents.md o /reference/)
5. Tests de regresión

---

## 🔗 Referencias Rápidas

- **PRD Principal:** `/specs/prd.md`
- **Stories:** `/specs/stories.json`
- **Constitución:** `.cursorrules`
- **Progreso:** `/logs/progress.txt`
- **Plan Implementación:** `docs/PLAN_IMPLEMENTACION_RALPH.md`