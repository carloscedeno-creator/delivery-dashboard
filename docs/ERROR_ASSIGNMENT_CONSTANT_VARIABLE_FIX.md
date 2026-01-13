# Error Fix: Assignment to Constant Variable

**Fecha:** 2024-12-19  
**Error:** `TypeError: Assignment to constant variable`  
**Archivos afectados:** `src/services/overallViewService.js`

---

## 🔴 Error Encontrado

```
TypeError: Assignment to constant variable.
    at overallViewService.js:93:20
```

**Causa:** Se intentaba reasignar una variable declarada con `const` cuando era `null`.

**Ubicación:** `overallViewService.js:93` - `getActiveSprints()`

**Código problemático:**
```javascript
const { data: capacity } = await supabase...
if (capacity) {
  capacity.sp_done = spDone;
} else {
  capacity = { ... }; // ❌ Error: Assignment to constant variable
}
```

---

## ✅ Solución Aplicada

**ANTES (incorrecto):**
```javascript
const { data: capacity, error: capacityError } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp')
  .eq('squad_id', sprint.squad_id)
  .eq('sprint_id', sprint.id)
  .maybeSingle();

// ... calcular spDone ...

if (capacity) {
  capacity.sp_done = spDone;
} else {
  capacity = { capacity_goal_sp: 0, capacity_available_sp: 0, sp_done: 0 }; // ❌ Error
}
```

**DESPUÉS (correcto):**
```javascript
const { data: capacityData, error: capacityError } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp')
  .eq('squad_id', sprint.squad_id)
  .eq('sprint_id', sprint.id)
  .maybeSingle();

// ... calcular spDone ...

// Crear objeto capacity usando operador ternario (siempre const)
const capacity = capacityData 
  ? { ...capacityData, sp_done: spDone }
  : { capacity_goal_sp: 0, capacity_available_sp: 0, sp_done: 0 }; // ✅ Correcto
```

---

## 📋 Reglas de Verificación Agregadas

### En `src/services/agents.md`
- **SIEMPRE** usar `const` con operador ternario para crear objetos condicionales
- **NUNCA** intentar reasignar variables `const` - usar nombres diferentes si necesitas reasignar
- **SIEMPRE** usar spread operator `{...data}` para crear nuevos objetos en lugar de mutar
- **SIEMPRE** usar nombres descriptivos diferentes para datos de API vs objetos finales (ej: `capacityData` vs `capacity`)

### En `.cursorrules`
- **Variables const:**
  - **OBLIGATORIO:** No reasignar variables declaradas con `const`
  - **OBLIGATORIO:** Usar operador ternario para crear objetos condicionales
  - **OBLIGATORIO:** Usar nombres diferentes para datos de API vs objetos finales
  - Usar spread operator `{...data}` para crear nuevos objetos en lugar de mutar

---

## 🔍 Diferencia entre `const` y `let`

| Declaración | Reasignación | Mutación de propiedades | Cuándo usar |
|-------------|---------------|--------------------------|-------------|
| `const` | ❌ No permitida | ✅ Permitida | Cuando el valor no cambia |
| `let` | ✅ Permitida | ✅ Permitida | Cuando necesitas reasignar |

**Nota:** `const` permite mutar propiedades de objetos, pero NO permite reasignar la variable misma.

---

## ✅ Checklist de Verificación

Antes de declarar variables:
- [ ] ¿Necesito reasignar la variable? → Usar `let` en lugar de `const`
- [ ] ¿Voy a crear un objeto condicionalmente? → Usar operador ternario con `const`
- [ ] ¿Los datos vienen de una API? → Usar nombre diferente (ej: `dataFromApi` vs `finalData`)
- [ ] ¿Voy a mutar propiedades? → `const` está bien, pero usar spread para crear nuevos objetos

---

## 📝 Archivos Modificados

1. `src/services/overallViewService.js`:
   - Línea ~57: Cambiar `capacity` → `capacityData` para datos de API
   - Línea ~89: Crear `capacity` usando operador ternario con `const`
   - Remover intento de reasignación de `const`

2. `src/services/agents.md` - Agregar reglas de verificación de variables const
3. `.cursorrules` - Agregar reglas de variables const

---

## ✅ Estado

- [x] Error corregido: Usar operador ternario en lugar de reasignar `const`
- [x] Solución aplicada: Separar `capacityData` (de API) de `capacity` (objeto final)
- [x] Reglas de verificación agregadas
- [x] Documentación creada

---

## 🎯 Patrón Correcto

**✅ CORRECTO:**
```javascript
// 1. Obtener datos de API con nombre descriptivo
const { data: apiData, error } = await supabase.from('table').select('*').maybeSingle();

// 2. Calcular valores derivados
let calculatedValue = 0;
if (apiData) {
  calculatedValue = calculateSomething(apiData);
}

// 3. Crear objeto final usando operador ternario (siempre const)
const finalObject = apiData 
  ? { ...apiData, calculatedValue }
  : { defaultValue: 0, calculatedValue: 0 }; // ✅ Correcto
```

**❌ INCORRECTO:**
```javascript
// Declarar como const pero intentar reasignar
const data = await getData();
if (!data) {
  data = { default: 0 }; // ❌ Error: Assignment to constant variable
}

// O mutar directamente sin crear nuevo objeto
const obj = { a: 1 };
obj = { a: 2 }; // ❌ Error: Assignment to constant variable
```
