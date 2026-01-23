# Agents Notes - Jira Supabase Sync

**Última actualización:** 2024-12-19

---

## Patrones y Decisiones de Diseño

### Sync Process
- ✅ Sync automático cada 30 minutos (configurado en deploy)
- ✅ Procesa múltiples proyectos en paralelo
- ✅ Usa retry helper para resiliencia ante rate limiting
- ✅ Valida cierre de sprint antes de procesar

### Issue Processor
- ✅ Detecta scope changes automáticamente
- ✅ Usa `scope-change-detector.js` para detectar cambios
- ✅ Solo guarda relaciones para tickets que estaban en sprint al cierre
- ✅ Usa changelog para determinar estado histórico

### Sprint Closure Processor
- ✅ Valida que sprint está realmente cerrado
- ✅ Verifica en Jira si es posible
- ✅ Usa retry helper para llamadas a Jira
- ✅ Integrado en sync principal (`sync-multi.js`)

### Scope Change Detector
- ✅ Detecta issues agregados después del inicio
- ✅ Detecta issues removidos antes del cierre
- ✅ Detecta cambios en Story Points durante sprint
- ✅ Guarda cambios en `sprint_scope_changes` table

---

## Bugs Evitados / Lecciones Aprendidas

### Bug: Rate limiting de Jira API
**Fecha:** 2024-12-19  
**Problema:** Sync fallaba cuando Jira retornaba 429 (rate limit)  
**Solución:** Implementar retry helper con exponential backoff  
**Regla agregada:** Siempre usar retry helper para llamadas a Jira API

### Bug: Sprints marcados como cerrados incorrectamente
**Fecha:** 2024-12-19  
**Problema:** Sprints se marcaban como cerrados sin validar en Jira  
**Solución:** Crear sprint-closure-processor con validación  
**Regla agregada:** Siempre validar estado de sprint en Jira antes de marcar como cerrado

### Bug: Scope changes no detectados
**Fecha:** 2024-12-19  
**Problema:** Cambios de scope durante sprint no se registraban  
**Solución:** Implementar scope-change-detector con detección automática  
**Regla agregada:** Siempre detectar scope changes durante sync

### Bug: Sprints duplicados por nombre inconsistente
**Fecha:** 2026-01-23  
**Problema:** Se crearon sprints manuales con prefijo (ej. `OBD Sprint 14`) mientras Jira usaba `Sprint 14`, causando filtros duplicados y sprints sin tickets.  
**Solución:** Eliminar sprints prefijados creados manualmente, usar únicamente nombres de sprint exactamente iguales a Jira, y actualizar estados/relaciones vía sync.  
**Regla agregada:** Nunca crear sprints manuales con nombres inventados o prefijos; la clave es `sprint_name` igual a Jira y `squad_id` correcto.

---

## Referencias

- Retry Helper: `src/utils/retry-helper.js`
- Scope Change Detector: `src/processors/scope-change-detector.js`
- Sprint Closure: `src/processors/sprint-closure-processor.js`
- Jira Integration: `/reference/jira_integration.md`
