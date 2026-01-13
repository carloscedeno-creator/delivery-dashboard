# Error Fix: calculate_rework_rate Function Parameters Incorrect

**Fecha:** 2024-12-19  
**Error:** `Could not find the function public.calculate_rework_rate(p_sprint_id, p_start_date, p_end_date, p_squad_id)`  
**Archivos afectados:** `src/services/qualityKPIService.js`

---

## 🔴 Error Encontrado

```
POST .../rpc/calculate_rework_rate 404 (Not Found)
Error: {
  code: 'PGRST202',
  message: 'Could not find the function public.calculate_rework_rate(p_sprint_id, p_start_date, p_end_date, p_squad_id)',
  hint: 'Perhaps you meant to call the function public.calculate_rework_rate(p_end_date, p_sprint_id, p_start_date)'
}
```

**Causa:** La función RPC `calculate_rework_rate` en Supabase NO acepta el parámetro `p_squad_id`. La firma real es:
```sql
calculate_rework_rate(
  p_sprint_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
```

**Ubicación:** `qualityKPIService.js:171` - `calculateReworkRateFromHistory()`

---

## ✅ Solución Aplicada

**ANTES (incorrecto):**
```javascript
const { data, error } = await supabase.rpc('calculate_rework_rate', {
  p_sprint_id: sprintId,
  p_start_date: startDate ? startDate.toISOString().split('T')[0] : null,
  p_end_date: endDate ? endDate.toISOString().split('T')[0] : null,
  p_squad_id: squadId // ❌ Este parámetro NO existe en la función
});
```

**DESPUÉS (correcto):**
```javascript
// Function signature: calculate_rework_rate(p_sprint_id, p_start_date, p_end_date)
// Note: p_squad_id is NOT a parameter - function doesn't accept it
const { data, error } = await supabase.rpc('calculate_rework_rate', {
  p_sprint_id: sprintId || null,
  p_start_date: startDate ? startDate.toISOString().split('T')[0] : null,
  p_end_date: endDate ? endDate.toISOString().split('T')[0] : null
  // ✅ Removido p_squad_id - función no acepta este parámetro
});
```

---

## 📋 Reglas de Verificación Agregadas

### En `src/services/agents.md`
- **SIEMPRE** verificar la firma exacta de funciones RPC antes de llamarlas
- **SIEMPRE** consultar documentación de la función o el hint del error para parámetros correctos
- **SIEMPRE** remover parámetros que no existen en la función (no solo pasarlos como `null`)
- **SIEMPRE** manejar errores de funciones RPC con fallback apropiado

### En `.cursorrules`
- **Funciones RPC Supabase:**
  - **OBLIGATORIO:** Verificar firma exacta de función RPC antes de llamarla
  - **OBLIGATORIO:** Consultar documentación o hint del error para parámetros correctos
  - **OBLIGATORIO:** No pasar parámetros que no existen en la función
  - Manejar errores con fallback apropiado (try-catch o función manual alternativa)

---

## 🔍 Cómo Verificar Firma de Función RPC

1. **Consultar documentación SQL:**
   ```sql
   -- Buscar en docs/supabase/ archivos que crean la función
   CREATE OR REPLACE FUNCTION calculate_rework_rate(...)
   ```

2. **Usar el hint del error:**
   - El error de Supabase incluye un `hint` con la firma sugerida
   - Ejemplo: `'Perhaps you meant to call the function public.calculate_rework_rate(p_end_date, p_sprint_id, p_start_date)'`

3. **Verificar en código existente:**
   - Buscar otros lugares donde se usa la función
   - Verificar parámetros que se pasan

---

## ✅ Checklist de Verificación

Antes de llamar una función RPC:
- [ ] ¿Conozco la firma exacta de la función? → Consultar documentación SQL
- [ ] ¿Los parámetros coinciden con la firma? → Verificar nombre y orden
- [ ] ¿Hay parámetros extra que no existen? → Removerlos completamente
- [ ] ¿Hay manejo de errores? → Agregar try-catch con fallback si es necesario

---

## 📝 Archivos Modificados

1. `src/services/qualityKPIService.js`:
   - Línea ~171: Remover `p_squad_id` de parámetros de `calculate_rework_rate`
   - Agregar comentario explicando que `p_squad_id` no existe

2. `src/services/agents.md` - Agregar reglas de verificación de funciones RPC
3. `.cursorrules` - Agregar reglas de verificación de funciones RPC

---

## ✅ Estado

- [x] Error corregido: Removido `p_squad_id` de parámetros
- [x] Solución aplicada: Solo pasar parámetros que existen en función
- [x] Manejo de errores: Fallback a `calculateReworkRateManually` si función no existe
- [x] Reglas de verificación agregadas
- [x] Documentación creada

---

## 🎯 Patrón Correcto

**✅ CORRECTO:**
```javascript
// 1. Verificar firma de función antes de llamarla
// Function: calculate_rework_rate(p_sprint_id, p_start_date, p_end_date)

// 2. Llamar solo con parámetros que existen
const { data, error } = await supabase.rpc('calculate_rework_rate', {
  p_sprint_id: sprintId || null,
  p_start_date: startDate ? startDate.toISOString().split('T')[0] : null,
  p_end_date: endDate ? endDate.toISOString().split('T')[0] : null
  // ✅ Solo parámetros que existen en la función
});

// 3. Manejar errores con fallback
if (error) {
  console.warn('[SERVICE] Error calling RPC function:', error);
  return await fallbackFunction(); // ✅ Fallback apropiado
}
```

**❌ INCORRECTO:**
```javascript
// Asume parámetros sin verificar firma
const { data, error } = await supabase.rpc('calculate_rework_rate', {
  p_sprint_id: sprintId,
  p_start_date: startDate,
  p_end_date: endDate,
  p_squad_id: squadId // ❌ Parámetro que no existe en función
});
```
