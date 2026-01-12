# Agents Notes - Utils

**Última actualización:** 2024-12-19

---

## Patrones y Decisiones de Diseño

### statusHelper.js
- ✅ **Fuente de verdad** para verificación de estatus
- ✅ Funciones sync e async disponibles
- ✅ Consulta `status_definitions` table en Supabase
- ✅ Usar `isDevDoneStatusSync()` para "Dev Done"
- ✅ Usar `isCompletedStatusSync(status, includeDevDone)` para "Done" completo

### authService.js
- ✅ Maneja autenticación con Supabase Auth
- ✅ Password recovery flow completo
- ✅ En desarrollo: retorna token para testing
- ✅ En producción: no revela si email existe (seguridad)

### projectMetricsApi.js
- ✅ Usa `statusHelper.js` para verificar estatus "Done"
- ✅ Función `getSprintScopeChanges()` para scope changes
- ✅ Normaliza estatus a mayúsculas para consistencia

### supabaseApi.js
- ✅ Cliente Supabase centralizado
- ✅ Configuración desde variables de entorno
- ✅ Usar este cliente para todas las queries

---

## Bugs Evitados / Lecciones Aprendidas

### Bug: Lógica de estatus duplicada
**Fecha:** 2024-12-19  
**Problema:** Múltiples archivos tenían lógica hardcodeada para estatus "Done"  
**Solución:** Crear `statusHelper.js` centralizado  
**Regla agregada:** Siempre usar `statusHelper.js` para verificar estatus

### Bug: Formato inconsistente en projectMetricsApi
**Fecha:** 2024-12-19  
**Problema:** Error de formato en línea 724 (falta salto de línea)  
**Solución:** Agregar salto de línea después de `.maybeSingle()`  
**Regla agregada:** Verificar formato antes de commit

---

## Referencias

- Status Helper: `src/utils/statusHelper.js`
- Database Schema: `/reference/database_schema.md`
- API Guidelines: `/reference/api_guidelines.md`
