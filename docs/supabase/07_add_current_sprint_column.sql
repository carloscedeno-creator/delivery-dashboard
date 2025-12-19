-- Migración: Agregar columna current_sprint a la tabla issues
-- Esta columna almacena el sprint actual/último del ticket según la lógica:
-- 1. Si hay un sprint "active", ese es el current_sprint
-- 2. Si no hay activo, se toma el último sprint de la lista
-- 3. Si no hay sprints, el valor por defecto es "Backlog"
-- Esta columna es crítica para las métricas de Project y Developer Metrics

-- Agregar columna current_sprint
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS current_sprint VARCHAR(255) NULL DEFAULT 'Backlog';

-- Comentario para documentación
COMMENT ON COLUMN public.issues.current_sprint IS 'Sprint actual/último del ticket. Si hay sprint activo, usa ese. Si no, usa el último sprint. Si no hay sprints, es "Backlog". Esta es la métrica real para determinar si un ticket está en el sprint seleccionado.';

-- Crear índice para búsquedas eficientes por sprint actual
CREATE INDEX IF NOT EXISTS idx_issues_current_sprint ON public.issues(current_sprint) WHERE current_sprint IS NOT NULL;

-- Actualizar current_sprint para datos existentes basándose en sprint_history
-- Si hay sprint_history, extraer el último sprint (después del último "; ")
-- Si no hay sprint_history, dejar como "Backlog"
UPDATE public.issues
SET current_sprint = CASE
    WHEN sprint_history IS NULL OR sprint_history = 'N/A' OR sprint_history = '' THEN 'Backlog'
    ELSE TRIM(SPLIT_PART(sprint_history, '; ', -1))
END
WHERE current_sprint IS NULL OR current_sprint = 'Backlog';

-- Nota: Para una actualización más precisa, se recomienda ejecutar una sincronización completa
-- que recalcule current_sprint basándose en el estado "active" de los sprints en Jira
