-- =====================================================
-- QUERY PARA VERIFICAR DATOS DE CAPACITY ACCURACY
-- Ejecuta esta query en Supabase SQL Editor
-- =====================================================

SELECT 
  s.id as sprint_id,
  s.sprint_name,
  s.state,
  s.end_date,
  
  -- Planned Capacity Sources
  s.planned_capacity_hours,
  s.planned_story_points,
  sm.total_story_points,
  
  -- Actual Capacity Sources
  sm.actual_capacity_hours,
  COUNT(dsm.id) as developer_metrics_count,
  SUM(dsm.workload_sp) as total_dev_workload_sp,
  
  -- Calculated Values
  COALESCE(
    s.planned_capacity_hours,
    s.planned_story_points * 5,
    sm.total_story_points * 5
  ) as calculated_planned_capacity_hours,
  
  COALESCE(
    sm.actual_capacity_hours,
    SUM(dsm.workload_sp) * 5
  ) as calculated_actual_capacity_hours,
  
  -- Capacity Accuracy Ratio
  CASE 
    WHEN COALESCE(
      s.planned_capacity_hours,
      s.planned_story_points * 5,
      sm.total_story_points * 5
    ) > 0 
    THEN ROUND(
      COALESCE(
        sm.actual_capacity_hours,
        SUM(dsm.workload_sp) * 5
      )::DECIMAL / 
      COALESCE(
        s.planned_capacity_hours,
        s.planned_story_points * 5,
        sm.total_story_points * 5
      )::DECIMAL,
      2
    )
    ELSE NULL
  END as capacity_accuracy_ratio,
  
  -- Status
  CASE 
    WHEN COALESCE(
      s.planned_capacity_hours,
      s.planned_story_points * 5,
      sm.total_story_points * 5
    ) IS NULL THEN '❌ Missing Planned Capacity'
    WHEN COALESCE(
      sm.actual_capacity_hours,
      SUM(dsm.workload_sp) * 5
    ) IS NULL THEN '❌ Missing Actual Capacity'
    ELSE '✅ Can Calculate'
  END as calculation_status

FROM sprints s
LEFT JOIN sprint_metrics sm ON s.id = sm.sprint_id
LEFT JOIN developer_sprint_metrics dsm ON s.id = dsm.sprint_id
WHERE s.state = 'closed'
GROUP BY s.id, s.sprint_name, s.state, s.end_date, 
         s.planned_capacity_hours, s.planned_story_points,
         sm.total_story_points, sm.actual_capacity_hours
ORDER BY s.end_date DESC
LIMIT 10;

-- =====================================================
-- RESUMEN: QUÉ DATOS FALTAN
-- =====================================================

SELECT 
  'SUMMARY' as section,
  COUNT(*) FILTER (WHERE s.planned_capacity_hours IS NOT NULL) as sprints_with_planned_capacity_hours,
  COUNT(*) FILTER (WHERE s.planned_story_points IS NOT NULL) as sprints_with_planned_story_points,
  COUNT(*) FILTER (WHERE sm.total_story_points IS NOT NULL) as sprints_with_total_story_points,
  COUNT(*) FILTER (WHERE sm.actual_capacity_hours IS NOT NULL) as sprints_with_actual_capacity_hours,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM developer_sprint_metrics dsm WHERE dsm.sprint_id = s.id
  )) as sprints_with_developer_metrics,
  COUNT(*) FILTER (WHERE EXISTS (
    SELECT 1 FROM developer_sprint_metrics dsm 
    WHERE dsm.sprint_id = s.id AND dsm.workload_sp IS NOT NULL
  )) as sprints_with_workload_sp
FROM sprints s
LEFT JOIN sprint_metrics sm ON s.id = sm.sprint_id
WHERE s.state = 'closed';

