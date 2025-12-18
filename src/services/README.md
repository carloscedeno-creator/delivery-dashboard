# Services

Servicios de lógica de negocio pura (sin dependencias de React).

## Epic Service (`epicService.js`)

Maneja la lógica relacionada con épicas/initiatives y sus fechas del timeline de Jira.

### Funciones principales:

- `getEpicsWithDates(supabase)` - Obtiene épicas con sus fechas desde Supabase
- `formatEpicDate(date)` - Formatea fechas de épicas
- `getEpicStartDate(epic, fallbackSprint)` - Obtiene fecha de inicio con fallback
- `getEpicEndDate(epic, fallbackSprint)` - Obtiene fecha de fin con fallback
- `mapEpicToRoadmap(epic, squad, issues, metrics, fallbackSprint)` - Mapea épica a formato de roadmap

### Prioridad de fechas:

1. **Épica**: `initiative.start_date` y `initiative.end_date` (fechas del timeline de Jira)
2. **Sprint**: Fechas del sprint más reciente del squad
3. **Fallback**: `initiative.created_at` para start_date

## Dev Performance Service (`devPerformanceService.js`)

Maneja la lógica de métricas de rendimiento de desarrolladores.

### Funciones principales:

- `isDevDoneStatus(status)` - Verifica si un status indica "Dev Done"
- `isIssueDevDone(issue)` - Verifica si un issue está "Dev Done"
- `filterIssuesBySquad(issues, squadId)` - Filtra issues por squad
- `filterIssuesBySprint(issues, issueSprints, sprintId)` - Filtra issues por sprint
- `filterIssuesByDeveloper(issues, developerId)` - Filtra issues por developer
- `filterIssues(issues, issueSprints, filters)` - Aplica todos los filtros
- `calculateMetrics(filteredIssues)` - Calcula métricas de issues filtrados
- `calculateStatusBreakdown(issues)` - Calcula breakdown por estado
- `filterAndSortSprints(sprints, squadId)` - Filtra y ordena sprints
- `filterDevelopers(developers, issues, issueSprints, squadId, sprintId)` - Filtra developers





