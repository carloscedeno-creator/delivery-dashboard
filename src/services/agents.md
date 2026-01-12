# Agents Notes - Services

**Última actualización:** 2024-12-19

---

## Patrones y Decisiones de Diseño

### Dev Performance Service
- ✅ **SIEMPRE** usar `statusHelper.js` para verificar estatus "Done"
- ❌ **NUNCA** hardcodear lógica de estatus (ej: `status === 'DONE'`)
- Usar `isDevDoneStatusSync()` o `isCompletedStatusSync()` según necesidad
- Ver: `/reference/metrics_calculations.md`

### Team Capacity Service
- ✅ **SIEMPRE** usar función RPC `calculate_squad_sprint_sp_done`
- ❌ **NUNCA** calcular SP Done manualmente
- La función RPC usa `is_status_completed()` que consulta `status_definitions`
- Ver: `/reference/database_schema.md`

### Delivery KPIService
- ✅ No requiere migración - ya usa funciones RPC correctamente
- Usa `calculate_rework_rate` RPC function
- No tiene lógica hardcodeada de estatus

### Quality KPIService
- ✅ No requiere migración - ya usa funciones RPC correctamente
- Usa `calculate_rework_rate` RPC function
- No tiene lógica hardcodeada de estatus

---

## Bugs Evitados / Lecciones Aprendidas

### Bug: Lógica de estatus hardcodeada
**Fecha:** 2024-12-19  
**Problema:** Múltiples servicios tenían lógica hardcodeada para determinar estatus "Done"  
**Solución:** Crear `statusHelper.js` centralizado y migrar todos los servicios  
**Regla agregada:** Siempre usar `statusHelper.js` para verificar estatus

### Bug: Cálculo manual de SP Done inconsistente
**Fecha:** 2024-12-19  
**Problema:** Diferentes módulos calculaban SP Done de forma diferente  
**Solución:** Usar función RPC `calculate_squad_sprint_sp_done` que usa `status_definitions`  
**Regla agregada:** Siempre usar función RPC para cálculos de SP Done

---

## Referencias

- Status Helper: `src/utils/statusHelper.js`
- Database Schema: `/reference/database_schema.md`
- Metrics Calculations: `/reference/metrics_calculations.md`
