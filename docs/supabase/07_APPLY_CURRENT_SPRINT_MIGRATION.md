# Migración: Agregar columna current_sprint a la tabla issues

## Resumen

Se ha agregado la columna `current_sprint` a la tabla `issues` para almacenar el sprint actual/último de cada ticket. Esta columna es **crítica** para las métricas de Project y Developer Metrics porque es la métrica real que define si un ticket está o no en el sprint seleccionado.

## Lógica de cálculo

La columna `current_sprint` se calcula usando la siguiente lógica (igual que en el spreadsheet):

1. **Si hay un sprint "active"**: Se usa ese sprint como `current_sprint`
2. **Si no hay activo**: Se toma el último sprint de la lista (el más reciente)
3. **Si no hay sprints**: El valor por defecto es `"Backlog"`

## Archivos modificados

### 1. Migración SQL
- **Archivo**: `docs/supabase/07_add_current_sprint_column.sql`
- **Acción**: Agrega la columna `current_sprint` a la tabla `issues`
- **Índice**: Crea índice para búsquedas eficientes

### 2. Procesador de Issues
- **Archivo**: `jira-supabase-sync/src/processors/issue-processor.js`
- **Cambios**:
  - Calcula `current_sprint` usando la lógica del spreadsheet
  - Incluye `current_sprint` en el objeto `issueData`

### 3. Cliente de Supabase
- **Archivo**: `jira-supabase-sync/src/clients/supabase-client.js`
- **Cambios**:
  - Incluye `current_sprint` en el upsert de issues

### 4. APIs de Métricas
- **Archivos**:
  - `src/utils/projectMetricsApi.js`
  - `src/utils/developerMetricsApi.js`
- **Cambios**:
  - Actualizado para usar `current_sprint` directamente en lugar de `issue_sprints`
  - Filtra por `current_sprint = sprint_name` en lugar de usar la tabla intermedia

## Pasos para aplicar

### 1. Aplicar la migración SQL

Ejecuta el siguiente script en Supabase SQL Editor:

```sql
-- Ver archivo: docs/supabase/07_add_current_sprint_column.sql
```

O ejecuta directamente:

```sql
-- Agregar columna current_sprint
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS current_sprint VARCHAR(255) NULL DEFAULT 'Backlog';

-- Comentario para documentación
COMMENT ON COLUMN public.issues.current_sprint IS 'Sprint actual/último del ticket. Si hay sprint activo, usa ese. Si no, usa el último sprint. Si no hay sprints, es "Backlog". Esta es la métrica real para determinar si un ticket está en el sprint seleccionado.';

-- Crear índice para búsquedas eficientes por sprint actual
CREATE INDEX IF NOT EXISTS idx_issues_current_sprint ON public.issues(current_sprint) WHERE current_sprint IS NOT NULL;

-- Actualizar current_sprint para datos existentes basándose en sprint_history
UPDATE public.issues
SET current_sprint = CASE
    WHEN sprint_history IS NULL OR sprint_history = 'N/A' OR sprint_history = '' THEN 'Backlog'
    ELSE TRIM(SPLIT_PART(sprint_history, '; ', -1))
END
WHERE current_sprint IS NULL OR current_sprint = 'Backlog';
```

### 2. Ejecutar sincronización completa

Después de aplicar la migración, ejecuta una sincronización completa de Jira para recalcular `current_sprint` con la lógica correcta (basándose en el estado "active" de los sprints):

```bash
cd jira-supabase-sync
npm run sync
```

Esto actualizará todos los issues existentes con el `current_sprint` correcto.

### 3. Verificar los cambios

Puedes verificar que la columna se agregó correctamente:

```sql
-- Verificar estructura de la tabla
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'issues' AND column_name = 'current_sprint';

-- Verificar algunos registros
SELECT issue_key, current_sprint, sprint_history
FROM issues
LIMIT 10;
```

## Beneficios

1. **Métricas más precisas**: Las métricas de Project y Developer ahora usan `current_sprint` directamente, que es la métrica real que define si un ticket está en el sprint seleccionado.

2. **Consultas más eficientes**: Ya no es necesario hacer JOINs con `issue_sprints` para filtrar por sprint. Se filtra directamente por `current_sprint`.

3. **Consistencia con el spreadsheet**: La lógica de cálculo es idéntica a la del spreadsheet de Google Sheets, asegurando consistencia entre ambas fuentes de datos.

4. **Mejor rendimiento**: El índice en `current_sprint` permite búsquedas rápidas por sprint actual.

## Notas importantes

- **Datos existentes**: La migración actualiza `current_sprint` para datos existentes basándose en `sprint_history`, pero para una actualización más precisa, se recomienda ejecutar una sincronización completa después de aplicar la migración.

- **Sincronización futura**: Todos los issues sincronizados después de estos cambios tendrán `current_sprint` calculado correctamente usando la lógica del spreadsheet.

- **Compatibilidad**: Los cambios son compatibles con el código existente. La columna `sprint_history` se mantiene para referencia histórica.
