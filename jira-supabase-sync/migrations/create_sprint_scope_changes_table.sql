/**
 * Migración: Crear tabla sprint_scope_changes
 * Tarea 4: Tracking Básico de Scope Changes
 * 
 * Esta tabla almacena los cambios de scope durante un sprint:
 * - Issues agregados al sprint
 * - Issues removidos del sprint
 * - Cambios en Story Points durante el sprint
 */

-- Crear tabla sprint_scope_changes
CREATE TABLE IF NOT EXISTS sprint_scope_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('added', 'removed', 'story_points_changed')),
  change_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  story_points_before NUMERIC(10, 2),
  story_points_after NUMERIC(10, 2),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice único para evitar duplicados básicos (la deduplicación por día se maneja en el código)
CREATE UNIQUE INDEX IF NOT EXISTS unique_scope_change_basic 
ON sprint_scope_changes(sprint_id, issue_id, change_type, change_date);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_sprint_scope_changes_sprint_id ON sprint_scope_changes(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_scope_changes_issue_id ON sprint_scope_changes(issue_id);
CREATE INDEX IF NOT EXISTS idx_sprint_scope_changes_change_type ON sprint_scope_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_sprint_scope_changes_change_date ON sprint_scope_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_sprint_scope_changes_sprint_change_date ON sprint_scope_changes(sprint_id, change_date);

-- Comentarios para documentación
COMMENT ON TABLE sprint_scope_changes IS 'Registra cambios de scope durante sprints (issues agregados, removidos, cambios en SP)';
COMMENT ON COLUMN sprint_scope_changes.change_type IS 'Tipo de cambio: added (agregado), removed (removido), story_points_changed (SP cambiado)';
COMMENT ON COLUMN sprint_scope_changes.change_date IS 'Fecha en que ocurrió el cambio según el changelog de Jira';
COMMENT ON COLUMN sprint_scope_changes.detected_at IS 'Fecha en que se detectó el cambio durante la sincronización';
COMMENT ON COLUMN sprint_scope_changes.story_points_before IS 'Story Points antes del cambio (solo para change_type = story_points_changed)';
COMMENT ON COLUMN sprint_scope_changes.story_points_after IS 'Story Points después del cambio (solo para change_type = story_points_changed)';

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_sprint_scope_changes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_sprint_scope_changes_updated_at ON sprint_scope_changes;
CREATE TRIGGER trigger_update_sprint_scope_changes_updated_at
  BEFORE UPDATE ON sprint_scope_changes
  FOR EACH ROW
  EXECUTE FUNCTION update_sprint_scope_changes_updated_at();

-- Vista útil para consultar cambios de scope por sprint
CREATE OR REPLACE VIEW sprint_scope_changes_summary AS
SELECT 
  s.id as sprint_id,
  s.sprint_name,
  s.start_date,
  s.end_date,
  s.state,
  sq.squad_name,
  COUNT(DISTINCT CASE WHEN ssc.change_type = 'added' THEN ssc.issue_id END) as issues_added,
  COUNT(DISTINCT CASE WHEN ssc.change_type = 'removed' THEN ssc.issue_id END) as issues_removed,
  COUNT(DISTINCT CASE WHEN ssc.change_type = 'story_points_changed' THEN ssc.issue_id END) as issues_sp_changed,
  COALESCE(SUM(CASE WHEN ssc.change_type = 'added' THEN ssc.story_points_after ELSE 0 END), 0) as sp_added,
  COALESCE(SUM(CASE WHEN ssc.change_type = 'removed' THEN ssc.story_points_before ELSE 0 END), 0) as sp_removed,
  COALESCE(SUM(CASE WHEN ssc.change_type = 'story_points_changed' THEN (ssc.story_points_after - ssc.story_points_before) ELSE 0 END), 0) as sp_net_change
FROM sprints s
INNER JOIN squads sq ON s.squad_id = sq.id
LEFT JOIN sprint_scope_changes ssc ON s.id = ssc.sprint_id
GROUP BY s.id, s.sprint_name, s.start_date, s.end_date, s.state, sq.squad_name;

COMMENT ON VIEW sprint_scope_changes_summary IS 'Resumen de cambios de scope por sprint';
