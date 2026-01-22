# Error Fix: Supabase Queries 400 Bad Request

**Fecha:** 2024-12-19  
**Error:** Múltiples queries a Supabase retornando `400 (Bad Request)`  
**Archivos afectados:** `src/services/overallViewService.js`

---

## 🔴 Errores Encontrados

### Error 1: Query a `squad_sprint_capacity` con `.single()`

```
GET .../squad_sprint_capacity?select=capacity_goal_sp,capacity_available_sp,sp_done&squad_id=eq.xxx&sprint_id=eq.yyy 400 (Bad Request)
```

**Causa:** `.single()` espera exactamente 1 resultado. Si no hay resultados o hay múltiples, retorna error 400.

**Ubicación:** `overallViewService.js:58` - `getActiveSprints()`

### Error 2: Query a `issues` con `.eq('status', 'BLOCKED')`

```
GET .../issues?select=id,issue_key,summary,squad_id,sprint_id&status=eq.BLOCKED&limit=10 400 (Bad Request)
```

**Causa:** El campo `status` puede tener variaciones de formato o el filtro directo no funciona correctamente.

**Ubicación:** `overallViewService.js:246` - `getQuickAlerts()`

---

## ✅ Soluciones Aplicadas

### Solución 1: Usar `.maybeSingle()` en lugar de `.single()`

**ANTES (incorrecto):**
```javascript
const { data: capacity } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp, sp_done')
  .eq('squad_id', sprint.squad_id)
  .eq('sprint_id', sprint.id)
  .single(); // ❌ Falla si no hay resultados
```

**DESPUÉS (correcto):**
```javascript
const { data: capacity, error: capacityError } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp, sp_done')
  .eq('squad_id', sprint.squad_id)
  .eq('sprint_id', sprint.id)
  .maybeSingle(); // ✅ Retorna null si no hay resultados, no error

// Log error but don't fail - capacity data is optional
if (capacityError && capacityError.code !== 'PGRST116') {
  console.warn(`[OVERALL_VIEW] Error fetching capacity for sprint ${sprint.id}:`, capacityError);
}
```

**Diferencia:**
- `.single()`: Espera exactamente 1 resultado, retorna error si hay 0 o >1
- `.maybeSingle()`: Retorna null si no hay resultados, error solo si hay >1

### Solución 2: Usar `.or()` con `.ilike()` para status

**ANTES (incorrecto):**
```javascript
const { data: blockedIssues } = await supabase
  .from('issues')
  .select('id, issue_key, summary, squad_id, sprint_id')
  .eq('status', 'BLOCKED') // ❌ Puede fallar con variaciones de formato
  .limit(10);
```

**DESPUÉS (correcto):**
```javascript
const { data: blockedIssues, error: blockedError } = await supabase
  .from('issues')
  .select('id, issue_key, summary, squad_id, sprint_id, status')
  .or('status.ilike.BLOCKED,status.ilike.%blocked%') // ✅ Case-insensitive y maneja variaciones
  .limit(10);

// Log error but don't fail - blocked issues are optional
if (blockedError) {
  console.warn('[OVERALL_VIEW] Error fetching blocked issues:', blockedError);
}
```

**Mejoras:**
- `.ilike()`: Case-insensitive matching
- `.or()`: Permite múltiples condiciones
- Manejo de errores: No falla si la query falla

---

## 📋 Reglas de Verificación Agregadas

### En `src/services/agents.md`
- **SIEMPRE** usar `.maybeSingle()` cuando el resultado puede no existir
- **SIEMPRE** manejar errores de queries opcionales sin fallar
- **SIEMPRE** usar `.ilike()` para búsquedas de texto case-insensitive
- **SIEMPRE** incluir manejo de errores con logging apropiado

### En `.cursorrules`
- **Queries Supabase:**
  - Usar `.maybeSingle()` cuando el resultado puede no existir (no `.single()`)
  - Manejar errores de queries opcionales sin fallar la aplicación
  - Usar `.ilike()` para búsquedas de texto case-insensitive
  - Incluir manejo de errores con logging apropiado

---

## 🔍 Diferencia entre `.single()` y `.maybeSingle()`

| Método | Comportamiento | Cuándo usar |
|--------|---------------|-------------|
| `.single()` | Espera exactamente 1 resultado. Error si hay 0 o >1 | Cuando el resultado DEBE existir |
| `.maybeSingle()` | Retorna null si no hay resultados. Error solo si hay >1 | Cuando el resultado es opcional |

---

## ✅ Checklist de Verificación

Antes de hacer queries a Supabase:
- [ ] ¿El resultado puede no existir? → Usar `.maybeSingle()` en lugar de `.single()`
- [ ] ¿Es una query opcional? → Manejar errores sin fallar
- [ ] ¿Es búsqueda de texto? → Usar `.ilike()` para case-insensitive
- [ ] ¿Hay variaciones posibles? → Usar `.or()` con múltiples condiciones
- [ ] ¿Se necesita logging? → Incluir `console.warn` para errores no críticos

---

## 📝 Archivos Modificados

1. `src/services/overallViewService.js`:
   - Línea ~58: Cambiar `.single()` → `.maybeSingle()` en query de capacity
   - Línea ~246: Cambiar `.eq('status', 'BLOCKED')` → `.or('status.ilike.BLOCKED,status.ilike.%blocked%')`
   - Agregar manejo de errores en ambas queries

2. `src/services/agents.md` - Agregar reglas de verificación
3. `.cursorrules` - Agregar reglas de queries Supabase

---

## ✅ Estado

- [x] Error 1 corregido: `.single()` → `.maybeSingle()`
- [x] Error 2 corregido: `.eq()` → `.or()` con `.ilike()`
- [x] Manejo de errores agregado
- [x] Reglas de verificación agregadas
- [x] Documentación creada

---

## 🎯 Patrón Correcto

**✅ CORRECTO:**
```javascript
// Query opcional que puede no existir
const { data: result, error } = await supabase
  .from('table')
  .select('field1, field2')
  .eq('id', someId)
  .maybeSingle(); // ✅ Para resultados opcionales

if (error && error.code !== 'PGRST116') {
  console.warn('[MODULE] Error fetching data:', error);
}

// Usar result con validación
const value = result?.field1 || defaultValue;
```

**❌ INCORRECTO:**
```javascript
// Asume que siempre existe
const { data: result } = await supabase
  .from('table')
  .select('field1')
  .eq('id', someId)
  .single(); // ❌ Falla si no existe

// No maneja errores
const value = result.field1; // ❌ Puede ser undefined
```
