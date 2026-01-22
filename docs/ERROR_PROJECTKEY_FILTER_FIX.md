# Error Fix: projectKey Default Causing Unwanted Squad Filtering

**Fecha:** 2024-12-19  
**Error:** `Squad filter specified but no sprints found. Returning null.`  
**Archivos afectados:** `src/services/deliveryKPIService.js`, `src/services/overallViewService.js`

---

## 🔴 Error Encontrado

```
[DELIVERY_KPI] ⚠️ Squad filter specified but no sprints found. Returning null.
```

**Causa:** `getDeliveryKPIData` tiene `projectKey = 'OBD'` como valor por defecto. Cuando se llama con `filters: {}` (sin filtros), el código usa este `projectKey` por defecto para buscar un squad, lo que activa un filtro de squad no deseado.

**Ubicación:** 
- `deliveryKPIService.js:133` - Valor por defecto de `projectKey`
- `deliveryKPIService.js:170-182` - Lógica que busca squad desde `projectKey`
- `overallViewService.js:143` - Llamada a `getDeliveryKPIData` sin especificar `projectKey: null`

---

## ✅ Solución Aplicada

### Solución 1: Pasar `projectKey: null` explícitamente

**ANTES (incorrecto):**
```javascript
// En overallViewService.js
getDeliveryKPIData({ filters: {} }) 
// ❌ projectKey default = 'OBD' → busca squad 'OBD' → filtra por squad
```

**DESPUÉS (correcto):**
```javascript
// En overallViewService.js
getDeliveryKPIData({ filters: {}, projectKey: null })
// ✅ projectKey null → no busca squad → no filtra → todos los squads
```

### Solución 2: Manejar `projectKey: null` en `getDeliveryKPIData`

**ANTES (incorrecto):**
```javascript
let squadIdToUse = filters.squadId;
if (!squadIdToUse) {
  // Siempre busca squad desde projectKey (incluso si es null)
  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('squad_key', projectKey.toUpperCase()) // ❌ projectKey puede ser null
    .single();
}
```

**DESPUÉS (correcto):**
```javascript
let squadIdToUse = filters.squadId;
if (!squadIdToUse && projectKey) {
  // Solo busca squad si projectKey existe (no es null/undefined)
  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('squad_key', projectKey.toUpperCase()) // ✅ projectKey existe
    .single();
}
```

---

## 📋 Reglas de Verificación Agregadas

### En `src/services/agents.md`
- **SIEMPRE** pasar `projectKey: null` explícitamente cuando se quieren datos de todos los squads
- **SIEMPRE** verificar que `projectKey` existe antes de usarlo para buscar squad
- **SIEMPRE** usar `filters: {}` junto con `projectKey: null` para obtener datos sin filtros
- **SIEMPRE** documentar el comportamiento cuando `projectKey` es `null` vs cuando tiene valor

### En `.cursorrules`
- **Filtros y Parámetros por Defecto:**
  - **OBLIGATORIO:** Verificar valores por defecto que pueden causar filtros no deseados
  - **OBLIGATORIO:** Pasar `null` explícitamente cuando se quieren datos sin filtros
  - **OBLIGATORIO:** Validar que parámetros existen antes de usarlos (ej: `if (projectKey)`)
  - Documentar comportamiento cuando parámetros son `null` vs cuando tienen valor

---

## 🔍 Comportamiento Esperado

| Parámetros | Comportamiento |
|------------|----------------|
| `{ filters: {}, projectKey: null }` | ✅ Todos los squads (sin filtros) |
| `{ filters: {}, projectKey: 'OBD' }` | ⚠️ Solo squad 'OBD' (filtrado) |
| `{ filters: { squadId: 'xxx' } }` | ⚠️ Solo squad específico (filtrado) |
| `{ filters: { squadId: 'xxx' }, projectKey: null }` | ⚠️ Solo squad específico (usa `squadId` del filtro) |

---

## ✅ Checklist de Verificación

Antes de llamar funciones de KPI:
- [ ] ¿Quiero datos de todos los squads? → Pasar `projectKey: null` explícitamente
- [ ] ¿La función tiene valores por defecto? → Verificar si causan filtros no deseados
- [ ] ¿Valido parámetros antes de usarlos? → Usar `if (param)` antes de usar `param`
- [ ] ¿Documenté el comportamiento? → Explicar qué pasa con `null` vs valores

---

## 📝 Archivos Modificados

1. `src/services/overallViewService.js`:
   - Línea ~143: Agregar `projectKey: null` en llamada a `getDeliveryKPIData`

2. `src/services/deliveryKPIService.js`:
   - Línea ~171: Agregar validación `if (!squadIdToUse && projectKey)` antes de buscar squad

3. `src/services/agents.md` - Agregar reglas de verificación de filtros
4. `.cursorrules` - Agregar reglas de valores por defecto

---

## ✅ Estado

- [x] Error corregido: Pasar `projectKey: null` explícitamente
- [x] Solución aplicada: Validar `projectKey` antes de usarlo
- [x] Reglas de verificación agregadas
- [x] Documentación creada

---

## 🎯 Patrón Correcto

**✅ CORRECTO:**
```javascript
// 1. Para datos de todos los squads (Overall View)
const data = await getKPIData({ 
  filters: {}, 
  projectKey: null // ✅ Explícitamente null = todos los squads
});

// 2. En la función, validar antes de usar
export const getKPIData = async ({ filters = {}, projectKey = 'OBD' }) => {
  let squadIdToUse = filters.squadId;
  
  if (!squadIdToUse && projectKey) { // ✅ Validar projectKey existe
    const { data: squad } = await supabase
      .from('squads')
      .select('id')
      .eq('squad_key', projectKey.toUpperCase())
      .single();
    
    if (squad) {
      squadIdToUse = squad.id;
    }
  }
  
  // Si no hay squadIdToUse, obtener datos de todos los squads
  // ...
};
```

**❌ INCORRECTO:**
```javascript
// Asume que filters: {} es suficiente
const data = await getKPIData({ filters: {} });
// ❌ projectKey default = 'OBD' → filtra por squad 'OBD'

// O no valida projectKey antes de usarlo
if (!squadIdToUse) {
  const { data: squad } = await supabase
    .from('squads')
    .select('id')
    .eq('squad_key', projectKey.toUpperCase()) // ❌ projectKey puede ser null
    .single();
}
```
