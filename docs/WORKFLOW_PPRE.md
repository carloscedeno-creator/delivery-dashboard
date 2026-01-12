# Workflow PPRE - Spec-Driven Development

**Framework:** Ralph-Compounding / Agentic Engineering  
**Última actualización:** 2024-12-19

---

## 🎯 Objetivo

Separar planificación y ejecución para maximizar efectividad de la IA y prevenir context window degradation.

---

## 🔄 El Ciclo PPRE

### 1. **Prime** (Preparar)
**Objetivo:** Cargar contexto necesario

**Acciones:**
- Leer `/specs/prd.md` (PRD principal)
- Leer `/specs/stories.json` (user stories)
- Revisar estructura del proyecto
- Identificar archivos relevantes

**Output:** Contexto completo del proyecto y feature

---

### 2. **Plan** (Planificar)
**Objetivo:** Generar plan detallado para una story específica

**Acciones:**
- Seleccionar una story de `stories.json`
- Analizar Acceptance Criteria (deben ser binarios: Pass/Fail)
- Generar plan markdown paso a paso
- Identificar archivos a modificar/crear
- Estimar complejidad

**Output:** Plan markdown detallado (guardar en `/docs/PLAN_{story-id}.md`)

**Formato del Plan:**
```markdown
# Plan: Story-001 - User Authentication

## Objetivo
Implementar autenticación de usuarios con Supabase Auth

## Acceptance Criteria
- [ ] User can login with email/password
- [ ] Session persists across page reloads
- [ ] Logout clears session

## Archivos a Modificar
- `src/components/Login.jsx` (crear)
- `src/utils/authService.js` (crear)
- `src/App.jsx` (modificar)

## Pasos
1. Crear componente Login
2. Crear servicio authService
3. Integrar en App.jsx
4. Tests
```

---

### 3. **RESET** (Limpiar Conversación)
**⚠️ CRÍTICO:** Este es el paso más importante

**Acción:**
- **Limpiar conversación completamente**
- Iniciar nueva sesión de chat
- NO preservar contexto de planificación

**Por qué:**
- Context window degradation es real
- Fresh start = mejor foco
- Evita "vibes" de planificación mezcladas con ejecución

---

### 4. **Execute** (Ejecutar)
**Objetivo:** Implementar el plan con contexto limpio

**Acciones:**
- Cargar SOLO el plan markdown generado
- Cargar SOLO el PRD relevante
- Ejecutar paso a paso
- Verificar Acceptance Criteria después de cada paso
- Actualizar `stories.json` cuando story pasa: `"passes": true`

**Output:** Código implementado + tests + story marcada como completa

---

## 📋 Ejemplo Completo

### Sesión 1: Planificación

```
Usuario: "Implementar password recovery"

AI:
1. Prime: Lee /specs/prd.md y /specs/stories.json
2. Plan: Genera plan detallado
3. Guarda plan en /docs/PLAN_password_recovery.md
4. Dice: "Plan listo. RESET conversación antes de ejecutar."
```

### Sesión 2: Ejecución (NUEVA CONVERSACIÓN)

```
Usuario: "Ejecutar plan de password recovery"

AI:
1. Carga /docs/PLAN_password_recovery.md
2. Carga /specs/prd.md (solo sección relevante)
3. Ejecuta paso a paso
4. Verifica Acceptance Criteria
5. Actualiza stories.json: "passes": true
```

---

## ✅ Checklist PPRE

### Prime
- [ ] Leído `/specs/prd.md`
- [ ] Leído `/specs/stories.json`
- [ ] Identificados archivos relevantes
- [ ] Revisada estructura del proyecto

### Plan
- [ ] Story seleccionada de `stories.json`
- [ ] Acceptance Criteria son binarios (Pass/Fail)
- [ ] Plan markdown generado
- [ ] Plan guardado en `/docs/PLAN_{story-id}.md`
- [ ] Archivos identificados

### RESET
- [ ] Conversación limpiada
- [ ] Nueva sesión iniciada
- [ ] Contexto de planificación NO preservado

### Execute
- [ ] Plan cargado en nueva conversación
- [ ] PRD relevante cargado
- [ ] Pasos ejecutados uno por uno
- [ ] Acceptance Criteria verificados
- [ ] `stories.json` actualizado: `"passes": true`
- [ ] Tests escritos y pasando

---

## 🔗 Referencias

- PRD Principal: `/specs/prd.md`
- Stories: `/specs/stories.json`
- Context Reset: `docs/CONTEXT_RESET_WORKFLOW.md`
- System Evolution: `docs/SYSTEM_EVOLUTION.md`
