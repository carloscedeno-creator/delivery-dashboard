# System Evolution Tracking

**Framework:** Ralph-Compounding / Agentic Engineering  
**Última actualización:** 2024-12-19

---

## 🎯 Objetivo

Cada bug o error debe mejorar el sistema, no solo ser "fixed". El sistema debe "compound" - mejorar con cada iteración.

---

## 🔄 El Mandato de Evolución

### ❌ NO Hacer
- Solo "fix" el bug
- Ignorar la causa raíz
- Asumir que el error no se repetirá

### ✅ SIEMPRE Hacer
1. **Identificar causa raíz:** ¿Por qué el AI cometió el error?
2. **Actualizar reglas:** Agregar regla en `/reference/` o `agents.md`
3. **Prevenir recurrencia:** Asegurar que el error no se repita

---

## 📋 Proceso de Evolución

### Paso 1: Identificar Causa Raíz

**Preguntas clave:**
- ¿Por qué el AI cometió este error?
- ¿Faltaba información en el contexto?
- ¿La regla no estaba clara?
- ¿El patrón no estaba documentado?

**Ejemplo:**
```
Bug: AI usa imports relativos en lugar de @/ aliases
Causa raíz: Regla no estaba en .cursorrules
```

### Paso 2: Actualizar Reglas

**Dónde actualizar:**
- **Reglas globales:** `.cursorrules` o `/reference/`
- **Reglas específicas:** `/src/**/agents.md`
- **Patrones:** `/reference/api_guidelines.md`, etc.

**Ejemplo:**
```
Regla agregada en .cursorrules:
"SIEMPRE usar alias @/ para imports absolutos"
```

### Paso 3: Prevenir Recurrencia

**Verificar:**
- Regla está en lugar visible
- Regla es clara y específica
- Regla está referenciada en `AGENTS.md` si es crítica

---

## 📝 Formato de Tracking

### Entrada en System Evolution

```markdown
## Bug: AI usa imports incorrectos
**Fecha:** 2024-12-19
**Problema:** AI usa imports relativos (`../../../components`) en lugar de alias `@/`
**Causa raíz:** Regla no estaba explícita en `.cursorrules`
**Solución:** Agregar regla en `.cursorrules`: "SIEMPRE usar alias @/ para imports"
**Regla agregada:** `.cursorrules` línea 45
**Prevención:** Regla ahora visible en constitución global
```

### Entrada en agents.md

```markdown
## Bug: Lógica de estatus hardcodeada
**Fecha:** 2024-12-19
**Problema:** Múltiples servicios tenían lógica hardcodeada para estatus "Done"
**Solución:** Crear `statusHelper.js` centralizado
**Regla agregada:** "Siempre usar statusHelper.js para verificar estatus"
**Ver:** `/reference/metrics_calculations.md`
```

---

## 🔍 Ejemplos Reales

### Ejemplo 1: Imports Incorrectos

**Bug:** AI usa `import { Login } from '../../../components/Login'`  
**Causa:** Regla no estaba en `.cursorrules`  
**Solución:** Agregar regla en `.cursorrules`  
**Resultado:** Error no se repite

### Ejemplo 2: Estatus Hardcodeado

**Bug:** Múltiples servicios verifican `status === 'DONE'` directamente  
**Causa:** No había fuente de verdad centralizada  
**Solución:** Crear `statusHelper.js` y migrar servicios  
**Resultado:** Sistema más consistente

### Ejemplo 3: Cálculo Manual de SP Done

**Bug:** Diferentes módulos calculan SP Done de forma diferente  
**Causa:** No había función RPC centralizada  
**Solución:** Crear función RPC `calculate_squad_sprint_sp_done`  
**Resultado:** Cálculos consistentes

---

## ✅ Checklist de Evolución

### Cuando Encuentres un Bug
- [ ] Identificar causa raíz
- [ ] Determinar dónde actualizar reglas
- [ ] Actualizar reglas apropiadas
- [ ] Documentar en `agents.md` o `/reference/`
- [ ] Verificar que regla es clara
- [ ] Verificar que regla está visible

---

## 🔗 Referencias

- PPRE Cycle: `docs/WORKFLOW_PPRE.md`
- Context Reset: `docs/CONTEXT_RESET_WORKFLOW.md`
- Agents Notes: `/src/**/agents.md`
- Reference Files: `/reference/`
