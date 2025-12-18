# Campos Históricos en Issues

## Resumen

Se han agregado campos históricos adicionales a la tabla `issues` para mejorar la sincronización y permitir análisis histórico más detallados, alineándose con los datos que se importan en Google Spreadsheet.

## Campos Agregados

### 1. `sprint_history` (TEXT)
- **Descripción**: Historial de todos los sprints del ticket, separados por "; " (ej: "Sprint 1; Sprint 2; Sprint 3")
- **Uso**: Permite ver rápidamente todos los sprints en los que ha estado un ticket
- **Ejemplo**: `"Sprint 1; Sprint 2; Sprint 3"`

### 2. `status_by_sprint` (JSONB)
- **Descripción**: JSON con el estado histórico por sprint
- **Uso**: Permite conocer el estado de un ticket al momento del cierre de cada sprint
- **Ejemplo**: `{"Sprint 1": "TO DO", "Sprint 2": "IN PROGRESS", "Sprint 3": "DONE"}`
- **Nota**: Para sprints activos, se guarda el estado actual

### 3. `story_points_by_sprint` (JSONB)
- **Descripción**: JSON con Story Points iniciales por sprint
- **Uso**: Permite calcular métricas precisas evitando "scope creep" (tickets creados durante el sprint no cuentan como SP iniciales)
- **Ejemplo**: `{"Sprint 1": 3, "Sprint 2": 5, "Sprint 3": 0}`
- **Nota**: Si un ticket se creó después del inicio del sprint, el valor es 0

### 4. `status_history_days` (TEXT)
- **Descripción**: Tiempo en cada estado en formato legible
- **Uso**: Permite análisis de tiempo en cada estado del ciclo de vida del ticket
- **Ejemplo**: `"To Do: 2.5d; In Progress: 5.0d; QA: 1.0d; Done: 0.5d"`

### 5. `epic_name` (VARCHAR(255))
- **Descripción**: Nombre de la épica asociada
- **Uso**: Permite acceso rápido al nombre de la épica sin necesidad de JOIN
- **Ejemplo**: `"Implementar autenticación OAuth"`

## Migración

### Aplicar la Migración SQL

```bash
# Opción 1: Usando Supabase CLI
supabase db push

# Opción 2: Ejecutar directamente en Supabase Dashboard
# Copiar y pegar el contenido de docs/supabase/06_add_issue_historical_fields.sql
```

### Verificar la Migración

```sql
-- Verificar que las columnas existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'issues' 
  AND column_name IN ('sprint_history', 'status_by_sprint', 'story_points_by_sprint', 'status_history_days', 'epic_name');

-- Verificar índices
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'issues' 
  AND indexname LIKE '%sprint%' OR indexname LIKE '%epic_name%';
```

## Cambios en el Código

### 1. Procesador de Issues (`issue-processor.js`)

Se agregaron funciones helper:
- `findHistoryValueAtDate()`: Encuentra el valor de un campo en el changelog en una fecha específica
- `calculateTimeInStatus()`: Calcula el tiempo en cada estado basado en el changelog

Se actualizó `processIssue()` para calcular:
- Sprint History desde `sprintData`
- Status by Sprint usando `findHistoryValueAtDate()` con fechas de cierre de sprint
- Story Points by Sprint usando `findHistoryValueAtDate()` con fechas de inicio de sprint
- Status History Days usando `calculateTimeInStatus()`
- Epic Name desde `fields.parent.fields.summary`

### 2. Cliente de Supabase (`supabase-client.js`)

Se actualizó `upsertIssue()` para incluir los nuevos campos:
- `epic_name`
- `sprint_history`
- `status_by_sprint`
- `story_points_by_sprint`
- `status_history_days`

## Lógica de Cálculo

### Status by Sprint

1. **Sprint cerrado**: Se busca el estado al momento del cierre usando `findHistoryValueAtDate()` con la fecha de `completeDate`, `endDate` o fecha de cierre calculada
2. **Sprint activo**: Se usa el estado actual del ticket
3. **Sin historial**: Se marca como `"N/A (Sin Historial)"`

### Story Points by Sprint

1. **Ticket creado antes del inicio del sprint**: Se busca el SP al inicio del sprint en el changelog
2. **Ticket creado después del inicio del sprint**: Se asigna 0 SP iniciales (evita scope creep)
3. **Sin changelog**: Se usa el SP actual si el ticket fue creado antes del inicio del sprint

### Status History Days

Se calcula procesando el changelog:
1. Se identifican todos los cambios de estado
2. Se calcula el tiempo entre cada cambio
3. Se agrupa por estado y se suma el tiempo total
4. Se formatea como string legible: `"Estado: X.Xd; Estado2: Y.Yd"`

## Próximos Pasos

1. **Aplicar la migración** en el entorno de desarrollo
2. **Ejecutar una sincronización completa** para poblar los nuevos campos:
   ```bash
   cd jira-supabase-sync
   npm run force-full-sync
   ```
3. **Verificar los datos** usando queries SQL o scripts de diagnóstico
4. **Actualizar el dashboard** para usar estos nuevos campos en las visualizaciones

## Consultas Útiles

### Ver issues con historial de sprints
```sql
SELECT 
  issue_key,
  summary,
  sprint_history,
  status_by_sprint,
  story_points_by_sprint,
  status_history_days
FROM issues
WHERE sprint_history IS NOT NULL
LIMIT 10;
```

### Ver distribución de estados por sprint
```sql
SELECT 
  sprint_name,
  status_by_sprint->>sprint_name as status,
  COUNT(*) as count
FROM issues,
LATERAL jsonb_each_text(status_by_sprint) as sprint_status
GROUP BY sprint_name, status
ORDER BY sprint_name, count DESC;
```

### Ver SP iniciales por sprint
```sql
SELECT 
  sprint_name,
  SUM((story_points_by_sprint->>sprint_name)::int) as total_sp
FROM issues,
LATERAL jsonb_each_text(story_points_by_sprint) as sprint_sp
GROUP BY sprint_name
ORDER BY sprint_name;
```

## Notas Importantes

- Los campos JSONB permiten búsquedas eficientes usando índices GIN
- El cálculo de estos campos requiere acceso al `changelog` completo de Jira
- Para tickets antiguos sin changelog completo, algunos campos pueden ser `null` o `"N/A"`
- La sincronización incremental también actualizará estos campos para issues modificados
