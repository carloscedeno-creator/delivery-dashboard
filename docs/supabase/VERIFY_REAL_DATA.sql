-- =====================================================
-- QUERIES PARA VERIFICAR DATOS REALES DE JIRA
-- Ejecuta estas queries en Supabase SQL Editor
-- para verificar qué datos están disponibles para KPIs
-- =====================================================

-- =====================================================
-- 1. VERIFICAR issue_type (Para Net Bug Flow)
-- =====================================================

-- Ver tipos de issues disponibles
SELECT 
  'Issue Types' as check_name,
  issue_type, 
  COUNT(*) as count
FROM issues
GROUP BY issue_type
ORDER BY count DESC
LIMIT 10;

-- Verificar si hay bugs
SELECT 
  'Bugs Available' as check_name,
  COUNT(*) as total_bugs,
  COUNT(*) FILTER (WHERE created_date >= CURRENT_DATE - INTERVAL '90 days') as bugs_last_90_days,
  COUNT(*) FILTER (WHERE resolved_date >= CURRENT_DATE - INTERVAL '90 days') as bugs_resolved_last_90_days
FROM issues
WHERE issue_type = 'Bug';

-- =====================================================
-- 2. VERIFICAR status_by_sprint (Para Rework Rate)
-- =====================================================

-- Verificar si status_by_sprint está poblado
SELECT 
  'Status History' as check_name,
  COUNT(*) as total_issues,
  COUNT(status_by_sprint) as issues_with_history,
  COUNT(*) FILTER (
    WHERE status_by_sprint IS NOT NULL 
    AND status_by_sprint != '{}'::JSONB
  ) as issues_with_valid_history,
  ROUND(
    (COUNT(*) FILTER (
      WHERE status_by_sprint IS NOT NULL 
      AND status_by_sprint != '{}'::JSONB
    )::DECIMAL / COUNT(*)) * 100, 
    2
  ) as percentage_with_history
FROM issues;

-- Ver ejemplo de historial
SELECT 
  'Sample History' as check_name,
  issue_key,
  status_by_sprint
FROM issues
WHERE status_by_sprint IS NOT NULL
  AND status_by_sprint != '{}'::JSONB
LIMIT 5;

-- =====================================================
-- 3. VERIFICAR PLANNING FIELDS (Para Planning Accuracy)
-- =====================================================

-- Verificar planned_story_points en sprints
SELECT 
  'Sprint Planning Fields' as check_name,
  COUNT(*) as total_closed_sprints,
  COUNT(planned_story_points) as sprints_with_planned_sp,
  COUNT(planned_capacity_hours) as sprints_with_planned_capacity
FROM sprints
WHERE state = 'closed';

-- Verificar sprint_metrics
SELECT 
  'Sprint Metrics' as check_name,
  COUNT(*) as total_metrics,
  COUNT(total_story_points) as with_total_sp,
  COUNT(completed_story_points) as with_completed_sp,
  COUNT(added_story_points) as with_added_sp,
  AVG(total_story_points) as avg_total_sp,
  AVG(completed_story_points) as avg_completed_sp
FROM sprint_metrics;

-- =====================================================
-- 4. VERIFICAR CAPACITY DATA (Para Capacity Accuracy)
-- =====================================================

-- Verificar developer_sprint_metrics
SELECT 
  'Developer Metrics' as check_name,
  COUNT(*) as total_dev_metrics,
  COUNT(workload_sp) as with_workload,
  COUNT(velocity_sp) as with_velocity,
  AVG(workload_sp) as avg_workload,
  AVG(velocity_sp) as avg_velocity
FROM developer_sprint_metrics;

-- Ver ejemplo de datos de capacidad
SELECT 
  'Sample Capacity Data' as check_name,
  workload_sp,
  velocity_sp,
  sprint_id
FROM developer_sprint_metrics
WHERE workload_sp IS NOT NULL
LIMIT 10;

-- =====================================================
-- 5. VERIFICAR CYCLE TIME (Ya funciona)
-- =====================================================

-- Verificar avg_lead_time
SELECT 
  'Cycle Time Data' as check_name,
  COUNT(*) as total_metrics,
  COUNT(avg_lead_time_days) as with_lead_time,
  AVG(avg_lead_time_days) as avg_lead_time_days,
  MIN(avg_lead_time_days) as min_lead_time,
  MAX(avg_lead_time_days) as max_lead_time
FROM sprint_metrics
WHERE avg_lead_time_days IS NOT NULL;

-- =====================================================
-- RESUMEN: QUÉ PUEDE CALCULARSE
-- =====================================================

-- Resumen general
SELECT 
  'SUMMARY' as section,
  'Net Bug Flow' as kpi,
  CASE 
    WHEN EXISTS (SELECT 1 FROM issues WHERE issue_type = 'Bug' LIMIT 1) 
    THEN '✅ Can calculate' 
    ELSE '❌ Cannot calculate' 
  END as status
UNION ALL
SELECT 
  'SUMMARY',
  'Rework Rate',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM issues 
      WHERE status_by_sprint IS NOT NULL 
      AND status_by_sprint != '{}'::JSONB 
      LIMIT 1
    ) 
    THEN '✅ Can calculate' 
    ELSE '❌ Cannot calculate' 
  END
UNION ALL
SELECT 
  'SUMMARY',
  'Planning Accuracy',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sprint_metrics 
      WHERE total_story_points IS NOT NULL 
      AND completed_story_points IS NOT NULL 
      LIMIT 1
    ) 
    THEN '✅ Can calculate' 
    ELSE '❌ Cannot calculate' 
  END
UNION ALL
SELECT 
  'SUMMARY',
  'Capacity Accuracy',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM developer_sprint_metrics 
      WHERE workload_sp IS NOT NULL 
      LIMIT 1
    ) 
    THEN '✅ Can calculate' 
    ELSE '❌ Cannot calculate' 
  END
UNION ALL
SELECT 
  'SUMMARY',
  'Cycle Time',
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM sprint_metrics 
      WHERE avg_lead_time_days IS NOT NULL 
      LIMIT 1
    ) 
    THEN '✅ Can calculate' 
    ELSE '❌ Cannot calculate' 
  END;

