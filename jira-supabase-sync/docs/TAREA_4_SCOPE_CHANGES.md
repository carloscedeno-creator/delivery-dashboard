# Tarea 4: Tracking Básico de Scope Changes

## 🎯 Objetivo
Detectar y mostrar cambios de scope durante sprints para que los PMs puedan ver qué issues fueron agregados o removidos durante el sprint.

## ✅ Implementación Completada

### 1. Tabla sprint_scope_changes ✅
**Archivo**: `migrations/create_sprint_scope_changes_table.sql` (nuevo)

**Estructura**:
- `id`: UUID primario
- `sprint_id`: Referencia al sprint
- `issue_id`: Referencia al issue
- `change_type`: Tipo de cambio ('added', 'removed', 'story_points_changed')
- `change_date`: Fecha del cambio según changelog de Jira
- `story_points_before`: SP antes del cambio (para cambios de SP)
- `story_points_after`: SP después del cambio (para cambios de SP)
- `detected_at`: Fecha en que se detectó el cambio
- Constraint único para evitar duplicados por día

**Vista útil**: `sprint_scope_changes_summary` - Resumen de cambios por sprint

### 2. Detector de Cambios de Scope ✅
**Archivo**: `src/processors/scope-change-detector.js` (nuevo)

**Funciones principales**:
- `detectIssueAddedToSprint()`: Detecta si un issue fue agregado después del inicio del sprint
- `detectIssueRemovedFromSprint()`: Detecta si un issue fue removido antes del cierre
- `detectStoryPointsChanges()`: Detecta cambios en Story Points durante el sprint
- `saveScopeChange()`: Guarda un cambio en la base de datos (evita duplicados)
- `detectAndSaveScopeChanges()`: Detecta y guarda todos los cambios para un issue

**Lógica de detección**:
- Analiza el changelog de Jira para encontrar cambios en el campo "Sprint"
- Compara fechas con `sprintStartDate` y `sprintEndDate`
- Detecta agregados: cuando el sprint aparece en `toString` pero no en `fromString`
- Detecta removidos: cuando el sprint desaparece de `toString` pero estaba en `fromString`
- Detecta cambios de SP: analiza cambios en campos de Story Points durante el sprint

### 3. Integración en Issue Processor ✅
**Archivo**: `src/processors/issue-processor.js`

**Cambios**:
- Integrado en `processIssue()` (línea ~722)
- Integrado en `processIssuesWithClientBatch()` (línea ~969)
- Se ejecuta después de guardar `issue_sprints`
- No falla el procesamiento si hay errores (solo logs warnings)

### 4. Visualización en ProjectsMetrics ✅
**Archivos**: 
- `src/utils/projectMetricsApi.js` - Función `getSprintScopeChanges()`
- `src/components/ProjectsMetrics.jsx` - Componente de visualización

**Funcionalidades**:
- Muestra resumen de cambios: Issues agregados, removidos, cambios de SP
- Muestra Story Points agregados/removidos
- Lista de cambios recientes con detalles
- Se carga automáticamente cuando se selecciona un sprint

## 📊 Estructura de Datos

### Tabla sprint_scope_changes
```sql
CREATE TABLE sprint_scope_changes (
  id UUID PRIMARY KEY,
  sprint_id UUID REFERENCES sprints(id),
  issue_id UUID REFERENCES issues(id),
  change_type VARCHAR(50) CHECK (change_type IN ('added', 'removed', 'story_points_changed')),
  change_date TIMESTAMP WITH TIME ZONE,
  story_points_before NUMERIC(10, 2),
  story_points_after NUMERIC(10, 2),
  detected_at TIMESTAMP WITH TIME ZONE,
  ...
);
```

### Vista sprint_scope_changes_summary
Proporciona resumen agregado por sprint:
- `issues_added`: Cantidad de issues agregados
- `issues_removed`: Cantidad de issues removidos
- `issues_sp_changed`: Cantidad de issues con cambios de SP
- `sp_added`: Total de SP agregados
- `sp_removed`: Total de SP removidos
- `sp_net_change`: Cambio neto de SP

## 🔍 Cómo Funciona

### Detección de Issues Agregados
1. Analiza changelog del issue
2. Busca cambios en el campo "Sprint" después de `sprintStartDate`
3. Si encuentra que el sprint fue agregado (aparece en `toString` pero no en `fromString`)
4. Guarda el cambio con tipo 'added' y fecha del cambio

### Detección de Issues Removidos
1. Analiza changelog del issue
2. Busca cambios en el campo "Sprint" durante el sprint (entre start y end)
3. Si encuentra que el sprint fue removido (desaparece de `toString` pero estaba en `fromString`)
4. Guarda el cambio con tipo 'removed' y fecha del cambio

### Detección de Cambios de Story Points
1. Analiza changelog del issue
2. Busca cambios en campos de Story Points durante el sprint
3. Para cada cambio, guarda 'before' y 'after' values
4. Guarda múltiples registros si hay múltiples cambios

## 📈 Visualización en UI

### Resumen de Cambios
- **Issues Added**: Cantidad de issues agregados + SP agregados
- **Issues Removed**: Cantidad de issues removidos + SP removidos
- **SP Changes**: Cantidad de issues con cambios de SP + cambio neto

### Lista de Cambios Recientes
- Muestra los últimos 10 cambios
- Incluye: tipo de cambio, issue key, SP antes/después (si aplica), fecha

## ⚠️ Consideraciones

1. **Detección solo durante sync**: Los cambios se detectan durante la sincronización, no en tiempo real
2. **Evita duplicados**: Constraint único previene múltiples registros del mismo cambio en el mismo día
3. **Performance**: La detección se ejecuta después de procesar issues, no afecta el tiempo principal de sync
4. **Sprints cerrados**: Para sprints cerrados, solo detecta removidos si ocurrieron antes del cierre

## 🔗 Archivos Relacionados

- `migrations/create_sprint_scope_changes_table.sql` - Migración SQL
- `src/processors/scope-change-detector.js` - Detector de cambios
- `src/processors/issue-processor.js` - Integración en procesamiento
- `src/utils/projectMetricsApi.js` - API para obtener cambios
- `src/components/ProjectsMetrics.jsx` - Visualización en UI
- `docs/TAREA_4_SCOPE_CHANGES.md` - Esta documentación

## 📋 Próximos Pasos

1. ⏳ Aplicar migración SQL en Supabase
2. ⏳ Ejecutar sync para detectar cambios existentes
3. ⏳ Verificar visualización en ProjectsMetrics
4. ⏳ Validar que los cambios se detectan correctamente
