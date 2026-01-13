# Agents Notes - Services

**Última actualización:** 2024-12-19

---

## ⚠️ CRITICAL: Supabase Query Patterns

**ERRORES ENCONTRADOS:** Queries retornando 400 Bad Request
- **Fecha:** 2024-12-19
- **Archivos:** `overallViewService.js`
- **Errores:** `.single()` fallando cuando no hay resultados, `.eq('status', 'BLOCKED')` fallando

**REGLAS DE VERIFICACIÓN OBLIGATORIAS:**
1. **SIEMPRE** usar `.maybeSingle()` cuando el resultado puede no existir (no `.single()`)
2. **SIEMPRE** manejar errores de queries opcionales sin fallar la aplicación
3. **SIEMPRE** usar `.ilike()` para búsquedas de texto case-insensitive
4. **SIEMPRE** incluir manejo de errores con logging apropiado (`console.warn` para errores no críticos)
5. **SIEMPRE** validar datos antes de usar (usar optional chaining `?.`)

**Diferencia `.single()` vs `.maybeSingle()`:**
- `.single()`: Espera exactamente 1 resultado, retorna error si hay 0 o >1
- `.maybeSingle()`: Retorna null si no hay resultados, error solo si hay >1

**Checklist antes de hacer queries:**
- [ ] ¿El resultado puede no existir? → Usar `.maybeSingle()`
- [ ] ¿Es una query opcional? → Manejar errores sin fallar
- [ ] ¿Es búsqueda de texto? → Usar `.ilike()` para case-insensitive
- [ ] ¿Hay variaciones posibles? → Usar `.or()` con múltiples condiciones

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

### Bug: Column sp_done does not exist en squad_sprint_capacity
**Fecha:** 2024-12-19  
**Problema:** Código intentaba leer `sp_done` directamente de tabla `squad_sprint_capacity`, pero esa columna no existe  
**Solución:** Usar función RPC `calculate_squad_sprint_sp_done` para calcular `sp_done` dinámicamente  
**Regla agregada:** Verificar qué columnas existen en una tabla antes de hacer SELECT. Usar funciones RPC para datos calculados.

---

## Referencias

- Status Helper: `src/utils/statusHelper.js`
- Database Schema: `/reference/database_schema.md`
- Metrics Calculations: `/reference/metrics_calculations.md`
