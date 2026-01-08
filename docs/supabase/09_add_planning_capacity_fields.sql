-- =====================================================
-- MIGRACIÓN: Agregar campos de Planning y Capacity
-- Propósito: Habilitar cálculo preciso de Planning Accuracy
--            y Capacity Accuracy para Team Health Score
-- =====================================================

-- =====================================================
-- 1. Agregar campos a tabla sprints
-- =====================================================

ALTER TABLE sprints
ADD COLUMN IF NOT EXISTS planned_story_points INTEGER,
ADD COLUMN IF NOT EXISTS planned_capacity_hours DECIMAL(10,2);

-- Comentarios
COMMENT ON COLUMN sprints.planned_story_points IS 
'Story Points planificados antes del inicio del sprint (planning)';

COMMENT ON COLUMN sprints.planned_capacity_hours IS 
'Capacidad planificada en horas para el sprint (para evitar burnout)';

-- =====================================================
-- 2. Agregar campos a tabla sprint_metrics
-- =====================================================

ALTER TABLE sprint_metrics
ADD COLUMN IF NOT EXISTS added_story_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_capacity_hours DECIMAL(10,2);

-- Comentarios
COMMENT ON COLUMN sprint_metrics.added_story_points IS 
'Story Points agregados durante el sprint (issues agregados después del planning)';

COMMENT ON COLUMN sprint_metrics.actual_capacity_hours IS 
'Capacidad real utilizada en horas durante el sprint';

-- =====================================================
-- 3. Actualizar función calculate_sprint_metrics si es necesario
-- =====================================================
-- Nota: La función calculate_sprint_metrics puede necesitar actualización
-- para calcular added_story_points automáticamente.
-- Por ahora, estos campos pueden poblarse manualmente o mediante
-- actualización de la función de cálculo.

-- =====================================================
-- 4. Función helper para calcular added_story_points
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_added_story_points(p_sprint_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_sprint RECORD;
  v_added_sp INTEGER := 0;
BEGIN
  -- Obtener datos del sprint
  SELECT * INTO v_sprint
  FROM sprints
  WHERE id = p_sprint_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Calcular SP de issues creados después del inicio del sprint
  SELECT COALESCE(SUM(i.current_story_points), 0) INTO v_added_sp
  FROM issue_sprints is_rel
  JOIN issues i ON is_rel.issue_id = i.id
  WHERE is_rel.sprint_id = p_sprint_id
    AND i.created_date IS NOT NULL
    AND v_sprint.start_date IS NOT NULL
    AND i.created_date::DATE > v_sprint.start_date;
  
  RETURN v_added_sp;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_added_story_points IS 
'Calcula los Story Points agregados durante el sprint (issues creados después del inicio)';

-- =====================================================
-- 5. Función helper para actualizar métricas con nuevos campos
-- =====================================================

CREATE OR REPLACE FUNCTION update_sprint_metrics_with_planning_fields(p_sprint_id UUID)
RETURNS VOID AS $$
DECLARE
  v_added_sp INTEGER;
BEGIN
  -- Calcular added_story_points
  v_added_sp := calculate_added_story_points(p_sprint_id);
  
  -- Actualizar sprint_metrics con added_story_points
  UPDATE sprint_metrics
  SET added_story_points = v_added_sp
  WHERE sprint_id = p_sprint_id
    AND calculated_at = (
      SELECT MAX(calculated_at) 
      FROM sprint_metrics 
      WHERE sprint_id = p_sprint_id
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_sprint_metrics_with_planning_fields IS 
'Actualiza sprint_metrics con added_story_points calculado para un sprint';

-- =====================================================
-- NOTAS DE USO
-- =====================================================
-- 1. planned_story_points debe poblarse durante el planning del sprint
-- 2. planned_capacity_hours debe poblarse durante el planning del sprint
-- 3. added_story_points se calcula automáticamente con la función helper
-- 4. actual_capacity_hours puede calcularse desde developer_sprint_metrics
--    o poblarse manualmente
--
-- Ejemplo de uso:
-- 
-- -- Poblar planned_story_points durante planning
-- UPDATE sprints 
-- SET planned_story_points = 200, planned_capacity_hours = 160.0
-- WHERE id = 'sprint-uuid';
--
-- -- Actualizar métricas con added_story_points
-- SELECT update_sprint_metrics_with_planning_fields('sprint-uuid');
-- =====================================================

