# API Guidelines - Supabase & Frontend

**Última actualización:** 2024-12-19

---

## 🔌 Supabase Client

### Configuración
- **Cliente centralizado:** `src/utils/supabaseApi.js`
- **Variables de entorno:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Siempre usar** el cliente exportado: `import { supabase } from '@/utils/supabaseApi'`

### Patrones de Query

#### Query Básica
```javascript
const { data, error } = await supabase
  .from('table_name')
  .select('column1, column2')
  .eq('column', value)
  .order('created_at', { ascending: false });
```

#### Con Relaciones
```javascript
const { data, error } = await supabase
  .from('issues')
  .select(`
    id,
    issue_key,
    summary,
    initiatives!inner(
      squad_id,
      squad_name
    )
  `)
  .eq('assignee_id', developerId);
```

#### Manejo de Errores
```javascript
if (error) {
  console.error('[MODULE_NAME] Error:', error);
  throw error;
}
return data || [];
```

---

## 📊 Funciones RPC

### Funciones Disponibles

#### `calculate_squad_sprint_sp_done(squad_id, sprint_id)`
- **Propósito:** Calcular Story Points "Done" para un squad y sprint
- **Usa:** `is_status_completed()` que consulta `status_definitions`
- **Retorna:** Número (SP Done)
- **Ejemplo:**
```javascript
const { data, error } = await supabase
  .rpc('calculate_squad_sprint_sp_done', {
    squad_id: squadId,
    sprint_id: sprintId
  });
```

#### `calculate_rework_rate(squad_id, sprint_id)`
- **Propósito:** Calcular tasa de rework
- **Retorna:** Número (tasa de rework)

#### `is_status_completed(status_name, include_dev_done)`
- **Propósito:** Verificar si un estatus es "completed"
- **Parámetros:**
  - `status_name`: Nombre del estatus
  - `include_dev_done`: Boolean (true = incluye DEV DONE)
- **Retorna:** Boolean

---

## 🎯 Patrones de API por Módulo

### Project Metrics API
- **Archivo:** `src/utils/projectMetricsApi.js`
- **Funciones principales:**
  - `getSquads()` - Obtener todos los squads
  - `getSprintsForSquad(squadId)` - Sprints de un squad
  - `getProjectMetricsData(squadId, sprintId)` - Métricas de proyecto
  - `getSprintScopeChanges(sprintId)` - Cambios de scope

### Developer Metrics API
- **Archivo:** `src/utils/developerMetricsApi.js`
- **Usa:** `statusHelper.js` para verificar estatus "Done"
- **No hardcodear** lógica de estatus

### Sprint Burndown API
- **Archivo:** `src/utils/sprintBurndownApi.js`
- **Usa:** `statusHelper.js` para verificar estatus completados

---

## ⚠️ Anti-Patterns

### ❌ NO Hacer
- Hardcodear lógica de estatus (ej: `status === 'DONE'`)
- Crear múltiples clientes de Supabase
- Calcular SP Done manualmente (usar RPC function)
- Usar imports relativos profundos (`../../../`)

### ✅ SIEMPRE Hacer
- Usar `statusHelper.js` para verificar estatus
- Usar función RPC `calculate_squad_sprint_sp_done`
- Usar alias `@/` para imports
- Manejar errores con try-catch

---

## 🔗 Referencias

- Supabase Client: `src/utils/supabaseApi.js`
- Status Helper: `src/utils/statusHelper.js`
- Database Schema: `/reference/database_schema.md`
