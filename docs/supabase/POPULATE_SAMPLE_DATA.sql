-- =====================================================
-- SCRIPT: Poblar Datos de Ejemplo para KPIs
-- Propósito: Insertar datos de ejemplo para poder ver
--            los KPIs funcionando con datos reales
-- =====================================================

-- =====================================================
-- 1. Poblar Deployments (Para Change Failure Rate)
-- =====================================================

-- Insertar deployments de ejemplo para los últimos sprints cerrados
INSERT INTO deployments (deploy_date, environment, status, sprint_id)
SELECT 
  s.end_date - (random() * INTERVAL '14 days') as deploy_date,
  CASE 
    WHEN random() < 0.7 THEN 'production'
    WHEN random() < 0.9 THEN 'staging'
    ELSE 'development'
  END as environment,
  CASE 
    WHEN random() < 0.95 THEN 'success'
    WHEN random() < 0.98 THEN 'failure'
    ELSE 'rollback'
  END as status,
  s.id as sprint_id
FROM sprints s
WHERE s.state = 'closed'
  AND s.end_date IS NOT NULL
ORDER BY s.end_date DESC
LIMIT 30
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. Poblar eNPS Responses (Para eNPS)
-- =====================================================

-- Insertar respuestas eNPS de ejemplo para desarrolladores activos
INSERT INTO enps_responses (survey_date, respondent_id, nps_score, survey_period)
SELECT 
  CURRENT_DATE - (random() * INTERVAL '60 days')::INTEGER as survey_date,
  d.id as respondent_id,
  CASE 
    WHEN random() < 0.3 THEN (random() * 3 + 9)::INTEGER  -- Promoters (9-10)
    WHEN random() < 0.6 THEN (random() * 2 + 7)::INTEGER  -- Passives (7-8)
    ELSE (random() * 7)::INTEGER                          -- Detractors (0-6)
  END as nps_score,
  CASE 
    WHEN random() < 0.5 THEN 'weekly'
    WHEN random() < 0.8 THEN 'monthly'
    ELSE 'quarterly'
  END as survey_period
FROM developers d
WHERE d.active = true
  AND NOT EXISTS (
    SELECT 1 FROM enps_responses er 
    WHERE er.respondent_id = d.id 
    AND er.survey_date = CURRENT_DATE - (random() * INTERVAL '60 days')::INTEGER
  )
LIMIT 30
ON CONFLICT (respondent_id, survey_date) DO NOTHING;

-- =====================================================
-- 3. Poblar Planning Fields (Para Planning Accuracy)
-- =====================================================

-- Poblar planned_story_points desde sprint_metrics si no está definido
UPDATE sprints s
SET planned_story_points = (
  SELECT total_story_points 
  FROM sprint_metrics sm
  WHERE sm.sprint_id = s.id
  ORDER BY sm.calculated_at DESC
  LIMIT 1
)
WHERE s.state = 'closed' 
  AND s.planned_story_points IS NULL
  AND EXISTS (
    SELECT 1 FROM sprint_metrics sm2 
    WHERE sm2.sprint_id = s.id
  );

-- Poblar planned_capacity_hours (estimación: 1 SP ≈ 5 horas)
UPDATE sprints s
SET planned_capacity_hours = (
  SELECT (total_story_points * 5.0)::DECIMAL(10,2)
  FROM sprint_metrics sm
  WHERE sm.sprint_id = s.id
  ORDER BY sm.calculated_at DESC
  LIMIT 1
)
WHERE s.state = 'closed' 
  AND s.planned_capacity_hours IS NULL
  AND EXISTS (
    SELECT 1 FROM sprint_metrics sm2 
    WHERE sm2.sprint_id = s.id
  );

-- =====================================================
-- 4. Verificar Datos Insertados
-- =====================================================

-- Verificar deployments
SELECT 
  'Deployments' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE environment = 'production') as production_deploys,
  COUNT(*) FILTER (WHERE status = 'success') as successful_deploys,
  COUNT(*) FILTER (WHERE status IN ('failure', 'rollback')) as failed_deploys
FROM deployments;

-- Verificar eNPS responses
SELECT 
  'eNPS Responses' as table_name,
  COUNT(*) as total_responses,
  COUNT(*) FILTER (WHERE nps_score >= 9) as promoters,
  COUNT(*) FILTER (WHERE nps_score IN (7, 8)) as passives,
  COUNT(*) FILTER (WHERE nps_score <= 6) as detractors,
  ROUND(AVG(nps_score), 2) as avg_score
FROM enps_responses;

-- Verificar planning fields
SELECT 
  'Sprints with Planning Fields' as info,
  COUNT(*) FILTER (WHERE planned_story_points IS NOT NULL) as with_planned_sp,
  COUNT(*) FILTER (WHERE planned_capacity_hours IS NOT NULL) as with_planned_capacity,
  COUNT(*) as total_closed_sprints
FROM sprints
WHERE state = 'closed';

-- =====================================================
-- NOTAS
-- =====================================================
-- Este script inserta datos de ejemplo para poder ver
-- los KPIs funcionando con datos reales.
--
-- Los datos son generados aleatoriamente pero realistas.
-- Para datos reales, necesitas:
-- 1. Conectar CI/CD para poblar deployments automáticamente
-- 2. Implementar UI de encuestas para eNPS
-- 3. Poblar planned_story_points durante el planning real
-- =====================================================

