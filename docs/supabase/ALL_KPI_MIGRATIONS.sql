-- =====================================================
-- MIGRACIONES KPI - EJECUTAR EN ORDEN
-- =====================================================
-- Este archivo contiene todas las migraciones necesarias
-- para habilitar el cálculo de KPIs reales.
-- 
-- INSTRUCCIONES:
-- 1. Abre Supabase Dashboard > SQL Editor
-- 2. Copia y pega cada sección completa
-- 3. Ejecuta cada sección en orden
-- 4. Verifica que no haya errores antes de continuar
-- =====================================================

-- =====================================================
-- MIGRACIÓN 1: Planning y Capacity Fields
-- =====================================================
-- Agrega campos necesarios para Planning Accuracy y Capacity Accuracy
-- =====================================================

-- Agregar campos a tabla sprints
ALTER TABLE sprints
ADD COLUMN IF NOT EXISTS planned_story_points INTEGER,
ADD COLUMN IF NOT EXISTS planned_capacity_hours DECIMAL(10,2);

-- Comentarios
COMMENT ON COLUMN sprints.planned_story_points IS 
'Story Points planificados antes del inicio del sprint (planning)';

COMMENT ON COLUMN sprints.planned_capacity_hours IS 
'Capacidad planificada en horas para el sprint (para evitar burnout)';

-- Agregar campos a tabla sprint_metrics
ALTER TABLE sprint_metrics
ADD COLUMN IF NOT EXISTS added_story_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_capacity_hours DECIMAL(10,2);

-- Comentarios
COMMENT ON COLUMN sprint_metrics.added_story_points IS 
'Story Points agregados durante el sprint (issues agregados después del planning)';

COMMENT ON COLUMN sprint_metrics.actual_capacity_hours IS 
'Capacidad real utilizada en horas durante el sprint';

-- Función helper para calcular added_story_points
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

-- Función helper para actualizar métricas con nuevos campos
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
-- MIGRACIÓN 2: Rework Rate Functions
-- =====================================================
-- Crea funciones para calcular Rework Rate desde historial de estados
-- =====================================================

-- Función: Detectar rework en un issue
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
  SELECT ARRAY_AGG(value::TEXT ORDER BY key)
  INTO v_statuses
  FROM jsonb_each_text(v_status_history);
  
  -- Detectar cambios hacia atrás (rework)
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

-- Función: Calcular Rework Rate para un sprint o período
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

-- Vista: Rework Rate por Sprint
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
-- MIGRACIÓN 3: Deployments Table
-- =====================================================
-- Crea tabla para almacenar información de deployments
-- =====================================================

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deploy_date TIMESTAMPTZ NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('staging', 'production', 'development')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'rollback')),
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  deployed_by_id UUID REFERENCES developers(id) ON DELETE SET NULL,
  rollback_date TIMESTAMPTZ,
  failure_reason TEXT,
  deployment_duration_seconds INTEGER,
  version TEXT,
  commit_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_deployments_deploy_date ON deployments(deploy_date DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_sprint_id ON deployments(sprint_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_by ON deployments(deployed_by_id);
CREATE INDEX IF NOT EXISTS idx_deployments_env_status_date 
ON deployments(environment, status, deploy_date DESC);

-- Comentarios para documentación
COMMENT ON TABLE deployments IS 
'Tabla para almacenar información de deployments. 
Sincronización desde CI/CD: To Be Connected';

COMMENT ON COLUMN deployments.environment IS 
'Ambiente donde se desplegó: staging, production, development';

COMMENT ON COLUMN deployments.status IS 
'Estado del deployment: success, failure, rollback';

COMMENT ON COLUMN deployments.sprint_id IS 
'Sprint asociado al deployment (opcional)';

COMMENT ON COLUMN deployments.deployed_by_id IS 
'Desarrollador que realizó el deployment (opcional)';

COMMENT ON COLUMN deployments.rollback_date IS 
'Fecha del rollback si el deployment fue revertido';

COMMENT ON COLUMN deployments.failure_reason IS 
'Razón del fallo si status = failure';

COMMENT ON COLUMN deployments.deployment_duration_seconds IS 
'Duración del deployment en segundos (útil para métricas)';

COMMENT ON COLUMN deployments.version IS 
'Versión desplegada (ej: v1.2.3)';

COMMENT ON COLUMN deployments.commit_hash IS 
'Hash del commit desplegado (para trazabilidad)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deployments_updated_at
BEFORE UPDATE ON deployments
FOR EACH ROW
EXECUTE FUNCTION update_deployments_updated_at();

-- =====================================================
-- MIGRACIÓN 4: eNPS Responses Table
-- =====================================================
-- Crea tabla para almacenar respuestas de eNPS
-- =====================================================

CREATE TABLE IF NOT EXISTS enps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_date DATE NOT NULL,
  respondent_id UUID REFERENCES developers(id) ON DELETE CASCADE,
  nps_score INTEGER NOT NULL CHECK (nps_score >= 0 AND nps_score <= 10),
  comments TEXT,
  survey_period TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_respondent_survey_date UNIQUE (respondent_id, survey_date)
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_enps_responses_survey_date ON enps_responses(survey_date DESC);
CREATE INDEX IF NOT EXISTS idx_enps_responses_respondent ON enps_responses(respondent_id);
CREATE INDEX IF NOT EXISTS idx_enps_responses_nps_score ON enps_responses(nps_score);
CREATE INDEX IF NOT EXISTS idx_enps_responses_survey_period ON enps_responses(survey_period);
CREATE INDEX IF NOT EXISTS idx_enps_responses_period_date 
ON enps_responses(survey_period, survey_date DESC);

-- Comentarios para documentación
COMMENT ON TABLE enps_responses IS 
'Tabla para almacenar respuestas de eNPS (Employee Net Promoter Score).
UI de encuestas: To Be Connected';

COMMENT ON COLUMN enps_responses.survey_date IS 
'Fecha de la encuesta (normalmente fecha de respuesta)';

COMMENT ON COLUMN enps_responses.respondent_id IS 
'Desarrollador que respondió la encuesta';

COMMENT ON COLUMN enps_responses.nps_score IS 
'Puntuación NPS (0-10): 
0-6 = Detractor, 7-8 = Passive, 9-10 = Promoter';

COMMENT ON COLUMN enps_responses.comments IS 
'Comentarios opcionales del respondiente';

COMMENT ON COLUMN enps_responses.survey_period IS 
'Período de la encuesta: weekly, monthly, quarterly, ad-hoc';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_enps_responses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_enps_responses_updated_at
BEFORE UPDATE ON enps_responses
FOR EACH ROW
EXECUTE FUNCTION update_enps_responses_updated_at();

-- Función: Calcular eNPS para un período
CREATE OR REPLACE FUNCTION calculate_enps(
  p_start_date DATE,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  enps_value INTEGER,
  total_responses INTEGER,
  promoters INTEGER,
  passives INTEGER,
  detractors INTEGER,
  promoter_percentage DECIMAL(5,2),
  detractor_percentage DECIMAL(5,2)
) AS $$
DECLARE
  v_total INTEGER;
  v_promoters INTEGER;
  v_passives INTEGER;
  v_detractors INTEGER;
  v_enps INTEGER;
BEGIN
  -- Contar respuestas en el período
  SELECT 
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE nps_score >= 9)::INTEGER,
    COUNT(*) FILTER (WHERE nps_score IN (7, 8))::INTEGER,
    COUNT(*) FILTER (WHERE nps_score <= 6)::INTEGER
  INTO v_total, v_promoters, v_passives, v_detractors
  FROM enps_responses
  WHERE survey_date >= p_start_date
    AND (p_end_date IS NULL OR survey_date <= p_end_date);
  
  -- Calcular eNPS: % Promoters - % Detractors
  IF v_total > 0 THEN
    v_enps := ROUND(
      ((v_promoters::DECIMAL / v_total) * 100) - 
      ((v_detractors::DECIMAL / v_total) * 100)
    )::INTEGER;
  ELSE
    v_enps := 0;
  END IF;
  
  RETURN QUERY SELECT
    v_enps,
    v_total,
    v_promoters,
    v_passives,
    v_detractors,
    CASE WHEN v_total > 0 THEN (v_promoters::DECIMAL / v_total * 100) ELSE 0 END,
    CASE WHEN v_total > 0 THEN (v_detractors::DECIMAL / v_total * 100) ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_enps IS 
'Calcula eNPS para un período dado. 
Fórmula: (% Promoters - % Detractors) donde:
- Promoters: nps_score >= 9
- Passives: nps_score IN (7, 8)
- Detractors: nps_score <= 6';

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
-- Ejecuta estas queries para verificar que todo se creó correctamente
-- =====================================================

-- Verificar tablas creadas
SELECT 'Tables' as type, table_name as name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('deployments', 'enps_responses')
ORDER BY table_name;

-- Verificar funciones creadas
SELECT 'Functions' as type, routine_name as name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'calculate_added_story_points',
  'update_sprint_metrics_with_planning_fields',
  'detect_issue_rework',
  'calculate_rework_rate',
  'calculate_enps'
)
ORDER BY routine_name;

-- Verificar campos agregados a sprints
SELECT 'Sprints Columns' as type, column_name as name
FROM information_schema.columns 
WHERE table_name = 'sprints' 
AND column_name IN ('planned_story_points', 'planned_capacity_hours')
ORDER BY column_name;

-- Verificar campos agregados a sprint_metrics
SELECT 'Sprint Metrics Columns' as type, column_name as name
FROM information_schema.columns 
WHERE table_name = 'sprint_metrics' 
AND column_name IN ('added_story_points', 'actual_capacity_hours')
ORDER BY column_name;

-- Verificar vista creada
SELECT 'Views' as type, table_name as name
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name = 'v_rework_rate_by_sprint';

