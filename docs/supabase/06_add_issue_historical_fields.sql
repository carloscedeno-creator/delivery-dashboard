-- Migración: Agregar campos históricos a la tabla issues
-- Estos campos permiten mejor sincronización y análisis histórico

-- Agregar campos para historial de sprints y estados
ALTER TABLE public.issues
ADD COLUMN IF NOT EXISTS sprint_history TEXT NULL,
ADD COLUMN IF NOT EXISTS status_by_sprint JSONB NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS story_points_by_sprint JSONB NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status_history_days TEXT NULL,
ADD COLUMN IF NOT EXISTS epic_name VARCHAR(255) NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.issues.sprint_history IS 'Historial de todos los sprints del ticket, separado por "; " (ej: "Sprint 1; Sprint 2; Sprint 3")';
COMMENT ON COLUMN public.issues.status_by_sprint IS 'JSON con el estado histórico por sprint (ej: {"Sprint 1": "To Do", "Sprint 2": "In Progress"})';
COMMENT ON COLUMN public.issues.story_points_by_sprint IS 'JSON con SP iniciales por sprint (ej: {"Sprint 1": 3, "Sprint 2": 5}). Si el ticket se creó después del inicio del sprint, el valor es 0';
COMMENT ON COLUMN public.issues.status_history_days IS 'Tiempo en cada estado en formato legible (ej: "To Do: 2.5d; In Progress: 5.0d")';
COMMENT ON COLUMN public.issues.epic_name IS 'Nombre de la épica asociada (para acceso rápido sin JOIN)';

-- Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_issues_sprint_history ON public.issues USING gin (status_by_sprint jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_issues_story_points_by_sprint ON public.issues USING gin (story_points_by_sprint jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_issues_epic_name ON public.issues USING btree (epic_name) WHERE epic_name IS NOT NULL;

-- Actualizar epic_name desde la tabla initiatives para datos existentes
UPDATE public.issues i
SET epic_name = e.initiative_name
FROM public.initiatives e
WHERE i.epic_id = e.id
  AND i.epic_name IS NULL;
