# Context Reset Workflow

**Framework:** Ralph-Compounding / Agentic Engineering  
**Última actualización:** 2024-12-19

---

## 🎯 Objetivo

Prevenir context window degradation separando planificación y ejecución en conversaciones distintas.

---

## ⚠️ Por Qué Es Crítico

### El Problema
- Context window degradation: IA pierde foco con demasiado contexto
- "Vibes" de planificación mezcladas con ejecución
- Decisiones de planificación influyen en ejecución

### La Solución
- **Separar completamente** planificación y ejecución
- Fresh start = mejor foco
- Contexto limpio = decisiones más precisas

---

## 🔄 Cuándo Hacer Reset

### ✅ SIEMPRE Reset Entre:
1. **Planificación → Ejecución**
   - Después de generar plan markdown
   - Antes de empezar a codificar

2. **Story → Story**
   - Después de completar una story
   - Antes de empezar otra story

3. **Feature → Feature**
   - Después de completar una feature grande
   - Antes de empezar otra feature

### ❌ NO Reset Entre:
- Pasos dentro de la misma ejecución
- Correcciones menores durante ejecución
- Preguntas de clarificación

---

## 📋 Cómo Hacer Reset

### Paso 1: Preservar Información Necesaria

**Guardar en archivos:**
- Plan markdown → `/docs/PLAN_{story-id}.md`
- Lecciones aprendidas → `/src/**/agents.md`
- Progreso → `/logs/progress.txt`

**NO preservar:**
- Conversación completa
- Contexto de planificación
- "Vibes" o decisiones tentativas

### Paso 2: Limpiar Conversación

**En Cursor:**
- Click en "New Chat" o equivalente
- NO usar "Continue Previous Conversation"
- NO copiar contexto de conversación anterior

**En Claude/otros:**
- Cerrar conversación
- Iniciar nueva conversación
- NO hacer referencia a conversación anterior

### Paso 3: Cargar Solo Lo Necesario

**En nueva conversación:**
- Cargar plan markdown generado
- Cargar PRD relevante (solo sección necesaria)
- Cargar `agents.md` relevantes si aplica
- NO cargar conversación anterior

---

## 📝 Ejemplo Práctico

### Antes del Reset (Planificación)

```
Usuario: "Implementar password recovery"

AI:
1. Analiza requirements
2. Genera plan detallado
3. Guarda en /docs/PLAN_password_recovery.md
4. Dice: "Plan listo. Por favor, RESET conversación 
   y luego ejecuta el plan."
```

### Después del Reset (Ejecución)

```
Usuario: "Ejecutar plan de password recovery"

AI:
1. Carga /docs/PLAN_password_recovery.md
2. Carga /specs/prd.md (solo sección auth)
3. Ejecuta paso a paso
4. No tiene "vibes" de planificación
5. Foco 100% en ejecución
```

---

## ✅ Checklist de Reset

### Antes del Reset
- [ ] Plan guardado en `/docs/PLAN_{story-id}.md`
- [ ] Lecciones aprendidas guardadas en `agents.md`
- [ ] Progreso actualizado en `/logs/progress.txt`
- [ ] Story marcada como completa si aplica

### Durante el Reset
- [ ] Conversación limpiada completamente
- [ ] Nueva sesión iniciada
- [ ] NO se preservó contexto de planificación

### Después del Reset
- [ ] Plan cargado en nueva conversación
- [ ] PRD relevante cargado
- [ ] `agents.md` relevantes cargados si aplica
- [ ] Contexto limpio y enfocado

---

## 🔗 Referencias

- PPRE Cycle: `docs/WORKFLOW_PPRE.md`
- System Evolution: `docs/SYSTEM_EVOLUTION.md`
- Progress Log: `/logs/progress.txt`
