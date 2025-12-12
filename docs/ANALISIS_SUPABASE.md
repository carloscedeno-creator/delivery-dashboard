# 🔍 Guía de Análisis de Supabase

Este documento explica cómo usar los scripts de análisis para hacer queries personalizadas a Supabase.

## 📋 Scripts Disponibles

### 1. `scripts/analyze-supabase.js`
Script principal con funciones para analizar datos.

**Funciones:**
- `analyzeData(queryParams)` - Ejecuta una query personalizada
- `compareQueries(query1, query2)` - Compara dos queries
- `showStats(table, groupBy)` - Muestra estadísticas

### 2. `scripts/query-example.js`
Ejemplo de cómo usar las funciones de análisis.

## 🚀 Uso Rápido

### Ejecutar un análisis simple

```javascript
import { analyzeData } from './scripts/analyze-supabase.js';

const results = await analyzeData({
  table: 'issues',
  filters: { assignee_id: '123' },
  select: 'id, summary, current_story_points',
  orderBy: 'created_date:desc',
  limit: 10
});

console.table(results);
```

### Comparar dos queries

```javascript
import { compareQueries } from './scripts/analyze-supabase.js';

const comparison = await compareQueries(
  {
    table: 'issues',
    filters: { assignee_id: '123' }
  },
  {
    table: 'issues',
    filters: { assignee_id: '456' }
  },
  'id' // clave de comparación
);
```

### Ver estadísticas

```javascript
import { showStats } from './scripts/analyze-supabase.js';

// Estadísticas generales
await showStats('issues');

// Agrupado por campo
await showStats('issues', 'current_status');
```

## 📊 Parámetros de `analyzeData`

```javascript
{
  table: 'issues',                    // Tabla a consultar (requerido)
  filters: {                          // Filtros (opcional)
    assignee_id: '123',               // Igualdad
    current_story_points: {            // Operadores
      operator: 'gte',
      value: 5
    },
    status: ['Done', 'In Progress']    // Array (IN)
  },
  select: 'id, summary, points',      // Campos a seleccionar (default: '*')
  orderBy: 'created_date:desc',       // Ordenar (formato: 'campo:direccion')
  limit: 10                           // Límite de resultados (opcional)
}
```

## 🔍 Operadores Disponibles

- `eq` - Igual a
- `neq` - No igual a
- `gt` - Mayor que
- `gte` - Mayor o igual que
- `lt` - Menor que
- `lte` - Menor o igual que
- `like` - Contiene (LIKE)
- `ilike` - Contiene (case-insensitive)
- `is` - Es null/not null
- `in` - En array (usar array directamente en filters)

## 📋 Tablas Disponibles

- `squads` - Squads/equipos
- `initiatives` - Iniciativas
- `issues` - Issues/tareas de Jira
- `developers` - Desarrolladores
- `sprints` - Sprints
- `issue_sprints` - Relación issues-sprints
- `v_sprint_metrics_complete` - Vista de métricas completas

## 💡 Ejemplos Comunes

### Issues activos en un sprint

```javascript
const activeIssues = await analyzeData({
  table: 'issues',
  filters: {
    current_status: { operator: 'neq', value: 'Done' }
  },
  select: 'id, summary, current_story_points, assignee_id'
});
```

### Issues de un desarrollador con más de 5 SP

```javascript
const highSPIssues = await analyzeData({
  table: 'issues',
  filters: {
    assignee_id: '123',
    current_story_points: { operator: 'gte', value: 5 }
  },
  select: 'id, summary, current_story_points'
});
```

### Comparar issues entre dos iniciativas

```javascript
const comparison = await compareQueries(
  {
    table: 'issues',
    filters: { initiative_id: 'init-1' },
    select: 'id, summary'
  },
  {
    table: 'issues',
    filters: { initiative_id: 'init-2' },
    select: 'id, summary'
  }
);
```

### Estadísticas de SP por desarrollador

```javascript
// Primero obtener todos los issues con sus asignados
const allIssues = await analyzeData({
  table: 'issues',
  select: 'assignee_id, current_story_points'
});

// Luego agrupar manualmente
const spByDev = {};
allIssues.forEach(issue => {
  const devId = issue.assignee_id || 'unassigned';
  spByDev[devId] = (spByDev[devId] || 0) + (issue.current_story_points || 0);
});

console.table(spByDev);
```

## 🎯 Cómo Usar con el Asistente

1. **Dime qué quieres analizar**: "Quiero ver los issues del desarrollador X"
2. **Te doy los parámetros**: Te proporciono el código con los filtros
3. **Ejecutamos y comparamos**: Ejecuto la query y te muestro los resultados
4. **Ajustamos**: Modificamos filtros y comparamos resultados

**Ejemplo de conversación:**
```
Tú: "Quiero ver los issues activos del desarrollador con ID 123"
Yo: Te doy el código y ejecuto la query
Tú: "Ahora compara con el desarrollador 456"
Yo: Ejecuto la comparación y te muestro las diferencias
```

## ⚙️ Configuración

El script usa las variables de entorno del archivo `.env`:
- `VITE_SUPABASE_URL` o `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` o `SUPABASE_ANON_KEY`

Si no están configuradas, el script mostrará un error con instrucciones.
