# Troubleshooting: Filtros de Team Health no visibles en producción

## Problema
Los filtros de Delivery KPIs no se muestran cuando se está en la sección "Team Health" en producción.

## Logs a buscar en la consola del navegador

### 1. Errores de carga de filtros (DeliveryKPIFilters)
Busca en la consola del navegador estos mensajes:

```javascript
// ✅ Componente montado correctamente
[DeliveryKPIFilters] ✅ Component mounted
[DeliveryKPIFilters] Props received: { hasFilters: true, hasOnFiltersChange: true, ... }

// ⚠️ Problemas detectados
[DeliveryKPIFilters] ⚠️ Supabase not available, cannot load filters
[DeliveryKPIFilters] ❌ Error loading squads: <error>
[DeliveryKPIFilters] ❌ Error loading sprints: <error>
[DeliveryKPIFilters] ❌ Error loading developers: <error>
[DeliveryKPIFilters] ❌ CRITICAL: onFiltersChange prop is missing!
[DeliveryKPIFilters] ❌ CRITICAL: Render error caught: <error>

// ✅ Carga exitosa
[DeliveryKPIFilters] ✅ Loaded squads: <count>
[DeliveryKPIFilters] ✅ Loaded sprints: <count>
[DeliveryKPIFilters] ✅ Loaded developers: <count>
[DeliveryKPIFilters] ✅ Filter options loaded successfully

// Si NO ves ningún log de [DeliveryKPIFilters], el componente NO se está renderizando
```

**Ubicación del código:** `src/components/DeliveryKPIFilters.jsx`

### 2. Errores de inicialización de Supabase
Busca errores relacionados con la inicialización de Supabase:

```javascript
// En la consola del navegador, verifica:
console.log('Supabase initialized:', !!window.supabase);
// O busca errores de conexión a Supabase
```

**Archivos relacionados:**
- `src/utils/supabaseApi.js`
- `src/components/DeliveryKPIFilters.jsx:20-23`

### 3. Errores en TeamHealthKPIs
Busca estos logs específicos del componente Team Health:

```javascript
// Error al cargar datos de Team Health
[TeamHealthKPIs] Error loading KPI data: <error>

// Datos recibidos (debería aparecer si todo está bien)
[TeamHealthKPIs] 📥 Received KPI data: { ... }
```

**Ubicación del código:** `src/components/TeamHealthKPIs.jsx:32-44`

### 4. Errores en el servicio teamHealthKPIService
Busca estos logs del servicio:

```javascript
// Errores de cálculo de métricas
[TEAM_HEALTH_KPI] Error fetching sprints for batch calculation: <error>
[TEAM_HEALTH_KPI] Error fetching issues for sprints: <error>
[TEAM_HEALTH_KPI] Error calculating eNPS: <error>
[TEAM_HEALTH_KPI] Error calculating Planning Accuracy: <error>
[TEAM_HEALTH_KPI] Error calculating Capacity Accuracy: <error>
```

**Ubicación del código:** `src/services/teamHealthKPIService.js`

## Checklist de diagnóstico

### Paso 1: Verificar que el componente se renderiza
1. Abre la consola del navegador (F12)
2. Navega a la sección "Team Health"
3. Busca en la consola estos logs específicos:
   - `[KPIsView] ✅ Component rendered` - Confirma que KPIsView se renderizó
   - `[KPIsView] 🔄 Rendering DeliveryKPIFilters component` - Confirma que intenta renderizar filtros
   - `[DeliveryKPIFilters] ✅ Component mounted` - **CRÍTICO**: Si NO aparece, el componente NO se está montando
   - `[DeliveryKPIFilters] Props received` - Verifica que las props están llegando
   - `[TeamHealthKPIs]` - Debería aparecer al cambiar a Team Health

**Si NO ves `[DeliveryKPIFilters] ✅ Component mounted`:**
- El componente no se está renderizando
- Verifica errores de JavaScript anteriores que puedan estar rompiendo el renderizado
- Revisa React DevTools para ver el árbol de componentes

### Paso 2: Verificar Supabase
En la consola del navegador, ejecuta:

```javascript
// Verificar si Supabase está disponible
console.log('Supabase:', window.supabase || 'NOT FOUND');

// Verificar si hay errores de autenticación
// Revisa la pestaña "Network" en DevTools para ver llamadas a Supabase
```

### Paso 3: Verificar permisos RLS (Row Level Security)
Los filtros cargan datos de estas tablas:
- `squads`
- `sprints`
- `developers`

Verifica que el usuario tenga permisos para leer estas tablas:

```sql
-- Ejecutar en Supabase SQL Editor
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('squads', 'sprints', 'developers');
```

### Paso 4: Verificar errores de red
1. Abre DevTools → Network
2. Filtra por "supabase"
3. Busca requests fallidos (código 4xx o 5xx)
4. Revisa los headers de respuesta para ver mensajes de error

### Paso 5: Verificar el estado del componente
En la consola del navegador, ejecuta:

```javascript
// Verificar si los filtros están siendo pasados correctamente
// Esto requiere acceso al código React (React DevTools)
```

## Posibles causas

### 1. Supabase no inicializado
**Síntoma:** No hay logs de `[DeliveryKPIFilters]` ni errores visibles
**Solución:** Verificar que `supabaseApi.js` esté correctamente configurado con las variables de entorno de producción

### 2. Error de permisos RLS
**Síntoma:** Errores 403 en las llamadas a Supabase
**Solución:** Verificar políticas RLS en las tablas `squads`, `sprints`, `developers`

### 3. Error de CORS
**Síntoma:** Errores de CORS en la consola
**Solución:** Verificar configuración de CORS en Supabase

### 4. Componente no se renderiza
**Síntoma:** No hay logs de `[DeliveryKPIFilters] ✅ Component mounted` en absoluto
**Posibles causas:**
- Error de JavaScript anterior que rompe el renderizado
- `KPIsView.jsx` no está renderizando `DeliveryKPIFilters`
- Error en el import del componente
- Problema con React StrictMode

**Solución:**
1. Busca errores de JavaScript ANTES de que se renderice KPIsView
2. Verifica en React DevTools si `DeliveryKPIFilters` aparece en el árbol de componentes
3. Verifica que no haya errores de importación en la consola
4. Revisa si hay un error boundary que esté capturando el error silenciosamente

### 5. Error de JavaScript que rompe el renderizado
**Síntoma:** Errores de JavaScript en la consola que impiden el renderizado
**Solución:** Revisar todos los errores de JavaScript y corregirlos

## Logs específicos a capturar en PRODUCCIÓN

Si el problema persiste, captura estos logs específicos en este orden:

1. **Logs de renderizado (MÁS IMPORTANTE)**:
   ```javascript
   // Busca estos logs en orden:
   [KPIsView] ✅ Component rendered
   [KPIsView] 🔄 Rendering DeliveryKPIFilters component
   [DeliveryKPIFilters] ✅ Component mounted  // ← Si NO aparece, aquí está el problema
   [DeliveryKPIFilters] Props received
   [DeliveryKPIFilters] 🔄 Loading filter options...
   ```

2. **Consola completa del navegador** al cargar la página en Team Health
   - Captura TODOS los errores, incluso los que parecen no relacionados
   - Busca errores ANTES de que aparezcan los logs de KPIsView

3. **Network tab** filtrado por "supabase" mostrando todas las requests
   - Especialmente requests a `squads`, `sprints`, `developers`

4. **React DevTools** (si está disponible) mostrando el árbol de componentes
   - Verifica si `DeliveryKPIFilters` aparece como hijo de `KPIsView`
   - Verifica si hay algún Error Boundary activo

5. **Errores de JavaScript** completos con stack traces
   - Click derecho en el error → "Copy stack trace"

## Comandos útiles para debugging

### En la consola del navegador:

```javascript
// Verificar estado de Supabase
console.log('Supabase client:', window.supabase);

// Forzar recarga de filtros (si tienes acceso al componente)
// Esto requiere React DevTools

// Verificar si hay errores silenciosos
window.addEventListener('error', (e) => {
  console.error('Global error:', e.error);
});

// Verificar promesas rechazadas sin catch
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', e.reason);
});
```

## Archivos relacionados

- `src/components/KPIsView.jsx` - Componente principal que renderiza los filtros
- `src/components/DeliveryKPIFilters.jsx` - Componente de filtros compartido
- `src/components/TeamHealthKPIs.jsx` - Componente de Team Health que recibe los filtros
- `src/services/teamHealthKPIService.js` - Servicio que procesa los filtros
- `src/utils/supabaseApi.js` - Cliente de Supabase

## Error específico encontrado: `state=eq.closed:1`

### Síntoma
```
Failed to load resource: the server responded with a status of 400
URL: .../v_sprint_metrics_complete?select=*&project_name=eq.OBD&order=end_date.desc.nullslast&limit=20&state=eq.closed:1
```

### Causa
El parámetro `state=eq.closed:1` está mal formateado. El `:1` al final indica que algo está agregando un valor incorrecto a la query. Esto puede deberse a:

1. **Problema con la construcción de la query en Supabase**: El método `.eq('state', 'closed')` debería generar `state=eq.closed`, no `state=eq.closed:1`
2. **Extensión del navegador interceptando queries**: Algunas extensiones pueden modificar las URLs de las requests
3. **Código legacy usando `project_name` directamente**: La vista `v_sprint_metrics_complete` puede tener una columna `project_name`, pero el código debería usar `squad_key` o filtrar por `sprint_name`

### Solución inmediata

1. **Verificar si es una extensión del navegador**:
   - Abre la aplicación en modo incógnito (sin extensiones)
   - Si funciona en incógnito, desactiva extensiones una por una hasta encontrar la culpable

2. **Verificar la construcción de queries**:
   - Busca en el código cualquier uso directo de `project_name` con `v_sprint_metrics_complete`
   - Verifica que todas las queries usen `.eq('state', 'closed')` correctamente (sin valores adicionales)

3. **Verificar la vista `v_sprint_metrics_complete`**:
   ```sql
   -- Ejecutar en Supabase SQL Editor
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'v_sprint_metrics_complete'
   ORDER BY ordinal_position;
   ```

4. **Limpiar caché del navegador**:
   - Limpia el caché y las cookies del sitio
   - Recarga la página con Ctrl+Shift+R (hard refresh)

### Logs adicionales a buscar en PRODUCCIÓN

**En la consola del navegador (F12):**

```javascript
// 1. Buscar queries mal formadas detectadas:
[DELIVERY_KPI] ⚠️ Invalid state value detected: ...
[SUPABASE] ⚠️ State value contains invalid suffix, cleaning: ...

// 2. Buscar errores 400 detallados:
[DELIVERY_KPI] ❌ Error obteniendo métricas de sprint: {
  message: "...",
  code: "PGRST116",
  status: 400,
  filters: { squadId: ..., sprintId: ..., ... }
}

// 3. Ver todas las requests a Supabase:
// En DevTools → Network → Filtra por "supabase"
// Busca requests con "v_sprint_metrics_complete" y revisa:
//   - La URL completa (debería ser sin :1)
//   - El código de respuesta (400 = Bad Request)
//   - Los headers de respuesta para mensajes de error
```

**Comandos útiles para debugging en producción:**

```javascript
// En la consola del navegador, ejecuta:

// 1. Ver todas las requests fallidas a Supabase
// En Network tab, filtra por: "supabase" y "Failed" o "4xx"

// 2. Ver el stack trace completo del error
// Click derecho en el error → "Copy stack trace"

// 3. Verificar si hay extensiones interfiriendo
// Abre en modo incógnito y compara el comportamiento

// 4. Capturar el error completo para análisis
window.addEventListener('error', (e) => {
  if (e.message.includes('v_sprint_metrics_complete') || 
      e.message.includes('400') ||
      e.message.includes('state=eq.closed')) {
    console.error('[PROD_DEBUG] Error capturado:', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error
    });
  }
});
```

### Código a revisar

Archivos que podrían estar causando el problema:
- `src/utils/supabaseApi.js` - Función `getSprintMetrics()` (línea 33-95)
- `src/services/deliveryKPIService.js` - Queries a `v_sprint_metrics_complete` (línea 207-250)
- `src/services/teamHealthKPIService.js` - Cualquier query directa a la vista

### Solución implementada (PRODUCCIÓN)

Se ha agregado validación automática en el código para limpiar valores de `state` mal formados:

**Archivos modificados:**
- `src/services/deliveryKPIService.js` - Validación y mejor logging de errores
- `src/utils/supabaseApi.js` - Validación de `state` en `getSprintMetrics()`

**Qué hace la solución:**
1. Detecta valores de `state` con sufijos inválidos (ej: `closed:1`)
2. Limpia automáticamente el valor removiendo el sufijo
3. Registra warnings en la consola cuando detecta valores inválidos
4. Proporciona logs detallados de errores para debugging en producción

**Logs a buscar en producción después del fix:**
```javascript
// Si se detecta un valor inválido:
[DELIVERY_KPI] ⚠️ Invalid state value detected: closed:1
[SUPABASE] ⚠️ State value contains invalid suffix, cleaning: closed:1

// Si hay un error 400:
[DELIVERY_KPI] ❌ Error obteniendo métricas de sprint: {
  message: "...",
  code: "PGRST116",
  status: 400,
  filters: { ... }
}
```

## Notas adicionales

- Los filtros son **compartidos** entre Delivery, Quality y Team Health
- Si los filtros funcionan en Delivery pero no en Team Health, el problema probablemente está en cómo `TeamHealthKPIs` procesa los filtros
- Verifica que los filtros se estén pasando correctamente como props: `filters={filters}` en `KPIsView.jsx:71`
- El error `state=eq.closed:1` sugiere un problema con la construcción de la query, no con los filtros en sí
