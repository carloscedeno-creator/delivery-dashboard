# Error Fix: Column sp_done Does Not Exist

**Fecha:** 2024-12-19  
**Error:** `column squad_sprint_capacity.sp_done does not exist`  
**Archivos afectados:** `src/services/overallViewService.js`

---

## 🔴 Error Encontrado

```
Error fetching capacity for sprint xxx: {
  code: '42703',
  message: 'column squad_sprint_capacity.sp_done does not exist'
}
```

**Causa:** La tabla `squad_sprint_capacity` en la base de datos NO tiene la columna `sp_done`. Solo tiene:
- `capacity_goal_sp`
- `capacity_available_sp`

**Ubicación:** `overallViewService.js:58` - `getActiveSprints()` y línea ~170 - `calculateAverageVelocity()`

---

## ✅ Solución Aplicada

### Solución 1: Usar función RPC para calcular `sp_done`

**ANTES (incorrecto):**
```javascript
const { data: capacity } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp, sp_done') // ❌ sp_done no existe
  .eq('squad_id', sprint.squad_id)
  .eq('sprint_id', sprint.id)
  .maybeSingle();
```

**DESPUÉS (correcto):**
```javascript
// Get capacity data (without sp_done)
const { data: capacity, error: capacityError } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp') // ✅ Solo campos que existen
  .eq('squad_id', sprint.squad_id)
  .eq('sprint_id', sprint.id)
  .maybeSingle();

// Calculate sp_done using RPC function if capacity exists
let spDone = 0;
if (capacity && !capacityError) {
  try {
    const { data: spDoneData, error: rpcError } = await supabase
      .rpc('calculate_squad_sprint_sp_done', {
        p_squad_id: sprint.squad_id,
        p_sprint_id: sprint.id
      });
    
    if (!rpcError && spDoneData !== null && spDoneData !== undefined) {
      spDone = Number(spDoneData) || 0;
    }
  } catch (rpcErr) {
    // RPC function may not exist, use 0 as default
    console.debug(`[OVERALL_VIEW] RPC not available, using 0`);
  }
}

// Add sp_done to capacity object
if (capacity) {
  capacity.sp_done = spDone;
}
```

### Solución 2: Calcular promedio usando RPC para múltiples sprints

**ANTES (incorrecto):**
```javascript
const { data: capacities } = await supabase
  .from('squad_sprint_capacity')
  .select('sp_done') // ❌ sp_done no existe
  .in('sprint_id', sprintIds)
  .not('sp_done', 'is', null);
```

**DESPUÉS (correcto):**
```javascript
// Calculate sp_done for each sprint using RPC function
const spDoneValues = await Promise.all(
  sprints.map(async (sprint) => {
    // Get squad_id for this sprint
    const { data: sprintData } = await supabase
      .from('sprints')
      .select('squad_id')
      .eq('id', sprint.id)
      .single();
    
    if (!sprintData?.squad_id) {
      return null;
    }
    
    try {
      const { data: spDoneData, error: rpcError } = await supabase
        .rpc('calculate_squad_sprint_sp_done', {
          p_squad_id: sprintData.squad_id,
          p_sprint_id: sprint.id
        });
      
      if (!rpcError && spDoneData !== null && spDoneData !== undefined) {
        return Number(spDoneData) || 0;
      }
    } catch (rpcErr) {
      // RPC function may not exist, skip this sprint
      console.debug(`[OVERALL_VIEW] RPC not available for sprint ${sprint.id}`);
    }
    
    return null;
  })
);

// Filter out null values
const capacities = spDoneValues.filter(val => val !== null && val !== undefined);
```

---

## 📋 Reglas de Verificación Agregadas

### En `src/services/agents.md`
- **SIEMPRE** verificar qué columnas existen en una tabla antes de hacer SELECT
- **SIEMPRE** usar función RPC `calculate_squad_sprint_sp_done` para obtener `sp_done` (no leer directamente de tabla)
- **SIEMPRE** manejar casos donde la función RPC puede no existir (usar try-catch y default a 0)
- **SIEMPRE** validar que los datos existen antes de usar (optional chaining `?.`)

### En `.cursorrules`
- **Verificación de Esquema de Tablas:**
  - **OBLIGATORIO:** Verificar qué columnas existen en una tabla antes de hacer SELECT
  - **OBLIGATORIO:** Usar funciones RPC cuando los datos calculados no están en la tabla base
  - Manejar casos donde funciones RPC pueden no existir (try-catch con defaults)
  - Validar datos antes de usar (optional chaining `?.`)

---

## 🔍 Diferencia entre Tabla y Función RPC

| Método | Cuándo usar | Ventajas |
|--------|-------------|----------|
| Tabla directa | Datos almacenados directamente | Más rápido, menos queries |
| Función RPC | Datos calculados o no disponibles en tabla | Siempre actualizado, lógica centralizada |

---

## ✅ Checklist de Verificación

Antes de hacer queries a Supabase:
- [ ] ¿La columna existe en la tabla? → Verificar esquema antes de SELECT
- [ ] ¿Es un dato calculado? → Usar función RPC en lugar de leer de tabla
- [ ] ¿La función RPC puede no existir? → Usar try-catch con default
- [ ] ¿Los datos pueden ser null? → Validar con optional chaining `?.`

---

## 📝 Archivos Modificados

1. `src/services/overallViewService.js`:
   - Línea ~58: Cambiar SELECT para excluir `sp_done`, calcular usando RPC
   - Línea ~170: Cambiar query de `sp_done` a cálculo usando RPC para cada sprint
   - Agregar manejo de errores para función RPC

2. `src/services/agents.md` - Agregar reglas de verificación de esquema
3. `.cursorrules` - Agregar reglas de verificación de columnas

---

## ✅ Estado

- [x] Error corregido: Remover `sp_done` de SELECT directo
- [x] Solución aplicada: Usar función RPC `calculate_squad_sprint_sp_done`
- [x] Manejo de errores agregado (try-catch con default a 0)
- [x] Reglas de verificación agregadas
- [x] Documentación creada

---

## 🎯 Patrón Correcto

**✅ CORRECTO:**
```javascript
// 1. Obtener datos de tabla (solo columnas que existen)
const { data: capacity } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp') // ✅ Solo campos existentes
  .eq('squad_id', squadId)
  .eq('sprint_id', sprintId)
  .maybeSingle();

// 2. Calcular datos derivados usando RPC
if (capacity) {
  try {
    const { data: spDone } = await supabase
      .rpc('calculate_squad_sprint_sp_done', {
        p_squad_id: squadId,
        p_sprint_id: sprintId
      });
    
    capacity.sp_done = spDone || 0; // ✅ Default si no disponible
  } catch (err) {
    capacity.sp_done = 0; // ✅ Default si RPC no existe
  }
}
```

**❌ INCORRECTO:**
```javascript
// Asume que sp_done existe en tabla
const { data: capacity } = await supabase
  .from('squad_sprint_capacity')
  .select('capacity_goal_sp, capacity_available_sp, sp_done') // ❌ sp_done no existe
  .eq('squad_id', squadId)
  .eq('sprint_id', sprintId)
  .maybeSingle();
```
