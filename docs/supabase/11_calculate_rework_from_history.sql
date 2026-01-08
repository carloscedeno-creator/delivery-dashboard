-- =====================================================
-- FUNCIÓN: Calcular Rework Rate desde historial de estados
-- Propósito: Calcular Rework Rate sin necesidad de tabla adicional
--            usando el historial de estados en issues
-- =====================================================

-- =====================================================
-- FUNCIÓN: Detectar rework en un issue
-- =====================================================

CREATE OR REPLACE FUNCTION detect_issue_rework(p_issue_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_rework_count INTEGER := 0;
  v_status_history JSONB;
  v_statuses TEXT[];
  v_current_status TEXT;
  v_previous_status TEXT;
  v_i INTEGER;
BEGIN
  -- Obtener historial de estados desde status_by_sprint
  SELECT status_by_sprint INTO v_status_history
  FROM issues
  WHERE id = p_issue_id;
  
  IF v_status_history IS NULL OR v_status_history = '{}'::JSONB THEN
    RETURN 0;
  END IF;
  
  -- Convertir JSONB a array de estados (ordenados por sprint)
  -- Asumimos que los estados están en orden cronológico
  SELECT ARRAY_AGG(value::TEXT ORDER BY key)
  INTO v_statuses
  FROM jsonb_each_text(v_status_history);
  
  -- Detectar cambios hacia atrás (rework)
  -- Un cambio hacia atrás ocurre cuando un estado "avanzado" 
  -- vuelve a un estado "anterior"
  -- Estados ordenados: To Do -> In Progress -> QA -> Done
  -- Si vamos de QA a In Progress, es rework
  
  FOR v_i IN 2..array_length(v_statuses, 1) LOOP
    v_current_status := v_statuses[v_i];
    v_previous_status := v_statuses[v_i - 1];
    
    -- Detectar rework: si volvemos a un estado anterior
    IF (
      (v_previous_status = 'Done' AND v_current_status != 'Done') OR
      (v_previous_status = 'QA' AND v_current_status IN ('In Progress', 'To Do')) OR
      (v_previous_status = 'In Progress' AND v_current_status = 'To Do') OR
      (v_previous_status != 'Reopen' AND v_current_status = 'Reopen')
    ) THEN
      v_rework_count := v_rework_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_rework_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION detect_issue_rework IS 
'Detecta rework en un issue analizando su historial de estados.
Cuenta cambios hacia atrás en el flujo: To Do -> In Progress -> QA -> Done';

-- =====================================================
-- FUNCIÓN: Calcular Rework Rate para un sprint o período
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_rework_rate(
  p_sprint_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  rework_rate_percentage DECIMAL(5,2),
  total_issues INTEGER,
  reworked_issues INTEGER,
  total_rework_count INTEGER
) AS $$
DECLARE
  v_total_issues INTEGER := 0;
  v_reworked_issues INTEGER := 0;
  v_total_rework_count INTEGER := 0;
  v_rework_count INTEGER;
  v_issue_record RECORD;
BEGIN
  -- Obtener issues según filtros
  FOR v_issue_record IN
    SELECT DISTINCT i.id
    FROM issues i
    LEFT JOIN issue_sprints is_rel ON i.id = is_rel.issue_id
    WHERE 
      (p_sprint_id IS NULL OR is_rel.sprint_id = p_sprint_id)
      AND (
        p_start_date IS NULL OR 
        (i.created_date IS NOT NULL AND i.created_date::DATE >= p_start_date)
      )
      AND (
        p_end_date IS NULL OR 
        (i.created_date IS NOT NULL AND i.created_date::DATE <= p_end_date)
      )
  LOOP
    v_total_issues := v_total_issues + 1;
    
    -- Detectar rework en este issue
    v_rework_count := detect_issue_rework(v_issue_record.id);
    
    IF v_rework_count > 0 THEN
      v_reworked_issues := v_reworked_issues + 1;
      v_total_rework_count := v_total_rework_count + v_rework_count;
    END IF;
  END LOOP;
  
  -- Calcular porcentaje de rework rate
  RETURN QUERY SELECT
    CASE 
      WHEN v_total_issues > 0 THEN 
        (v_reworked_issues::DECIMAL / v_total_issues * 100)
      ELSE 0 
    END,
    v_total_issues,
    v_reworked_issues,
    v_total_rework_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_rework_rate IS 
'Calcula Rework Rate para un sprint o período.
Rework Rate = (Issues con rework / Total issues) * 100';

-- =====================================================
-- VISTA: Rework Rate por Sprint
-- =====================================================

CREATE OR REPLACE VIEW v_rework_rate_by_sprint AS
SELECT 
  s.id AS sprint_id,
  s.sprint_name,
  s.start_date,
  s.end_date,
  r.rework_rate_percentage,
  r.total_issues,
  r.reworked_issues,
  r.total_rework_count
FROM sprints s
CROSS JOIN LATERAL calculate_rework_rate(s.id) r
WHERE s.state = 'closed'
ORDER BY s.end_date DESC;

COMMENT ON VIEW v_rework_rate_by_sprint IS 
'Vista que muestra Rework Rate por sprint cerrado';

-- =====================================================
-- NOTAS DE USO
-- =====================================================
-- Esta función calcula Rework Rate desde el historial de estados
-- almacenado en status_by_sprint (JSONB) en la tabla issues.
--
-- Ejemplo de uso:
--
-- -- Calcular rework rate para un sprint específico
-- SELECT * FROM calculate_rework_rate('sprint-uuid');
--
-- -- Calcular rework rate para un período
-- SELECT * FROM calculate_rework_rate(
--   NULL, 
--   CURRENT_DATE - INTERVAL '30 days', 
--   CURRENT_DATE
-- );
--
-- -- Ver rework rate por sprint
-- SELECT * FROM v_rework_rate_by_sprint;
-- =====================================================

