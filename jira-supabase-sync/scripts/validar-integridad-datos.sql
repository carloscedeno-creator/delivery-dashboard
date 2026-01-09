/**
 * Script de Validación de Integridad de Datos
 * Verifica que los datos sincronizados sean consistentes y completos
 * 
 * USO: Ejecutar después de cada sync para validar integridad
 */

-- ============================================
-- 1. VALIDACIÓN DE SPRINTS
-- ============================================

-- Verificar sprints sin end_date pero con state='closed'
SELECT 
  'Sprints cerrados sin end_date' as validacion,
  COUNT(*) as cantidad,
  ARRAY_AGG(sprint_name) as sprints_afectados
FROM sprints
WHERE state = 'closed' AND end_date IS NULL;

-- Verificar sprints con end_date pero sin complete_date (deberían tenerlo si están cerrados)
SELECT 
  'Sprints cerrados sin complete_date' as validacion,
  COUNT(*) as cantidad,
  ARRAY_AGG(sprint_name) as sprints_afectados
FROM sprints
WHERE state = 'closed' AND end_date IS NOT NULL AND complete_date IS NULL;

-- Verificar sprints con fechas inconsistentes (end_date antes de start_date)
SELECT 
  'Sprints con fechas inconsistentes' as validacion,
  COUNT(*) as cantidad,
  ARRAY_AGG(sprint_name) as sprints_afectados
FROM sprints
WHERE start_date IS NOT NULL 
  AND end_date IS NOT NULL 
  AND end_date < start_date;

-- ============================================
-- 2. VALIDACIÓN DE ISSUES EN SPRINTS
-- ============================================

-- Verificar issues en sprints cerrados sin status_at_sprint_close (tickets removidos)
SELECT 
  'Issues en sprints cerrados sin status_at_sprint_close' as validacion,
  COUNT(*) as cantidad,
  s.sprint_name,
  s.state
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
  AND is_rel.status_at_sprint_close IS NULL
GROUP BY s.sprint_name, s.state
ORDER BY cantidad DESC;

-- Verificar issues con story_points_at_start pero sin story_points_at_close en sprints cerrados
SELECT 
  'Issues en sprints cerrados sin story_points_at_close' as validacion,
  COUNT(*) as cantidad,
  s.sprint_name
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
  AND is_rel.status_at_sprint_close IS NOT NULL -- Solo tickets que estaban al cierre
  AND is_rel.story_points_at_start IS NOT NULL
  AND is_rel.story_points_at_close IS NULL
GROUP BY s.sprint_name
ORDER BY cantidad DESC;

-- ============================================
-- 3. VALIDACIÓN DE CONSISTENCIA DE STORY POINTS
-- ============================================

-- Verificar issues donde story_points_at_close > story_points_at_start (puede ser válido)
SELECT 
  'Issues con SP aumentados durante sprint' as validacion,
  COUNT(*) as cantidad,
  s.sprint_name,
  s.state
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
INNER JOIN issues i ON is_rel.issue_id = i.id
WHERE s.state = 'closed'
  AND is_rel.status_at_sprint_close IS NOT NULL
  AND is_rel.story_points_at_start IS NOT NULL
  AND is_rel.story_points_at_close IS NOT NULL
  AND is_rel.story_points_at_close > is_rel.story_points_at_start
GROUP BY s.sprint_name, s.state
ORDER BY cantidad DESC;

-- Verificar issues donde current_story_points difiere de story_points_at_close en sprints cerrados
SELECT 
  'Issues con SP actual diferente a SP al cierre (sprints cerrados)' as validacion,
  COUNT(*) as cantidad,
  s.sprint_name
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
INNER JOIN issues i ON is_rel.issue_id = i.id
WHERE s.state = 'closed'
  AND is_rel.status_at_sprint_close IS NOT NULL
  AND is_rel.story_points_at_close IS NOT NULL
  AND i.current_story_points IS NOT NULL
  AND i.current_story_points != is_rel.story_points_at_close
GROUP BY s.sprint_name
ORDER BY cantidad DESC;

-- ============================================
-- 4. VALIDACIÓN DE STATUS
-- ============================================

-- Verificar issues con status_at_sprint_close que no existe en status_definitions
SELECT 
  'Issues con status_at_sprint_close no reconocido' as validacion,
  COUNT(DISTINCT is_rel.status_at_sprint_close) as statuses_unicos,
  ARRAY_AGG(DISTINCT is_rel.status_at_sprint_close) as statuses_no_reconocidos
FROM issue_sprints is_rel
WHERE is_rel.status_at_sprint_close IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM status_definitions sd 
    WHERE sd.status_name = is_rel.status_at_sprint_close
  );

-- Verificar issues completados sin status_at_sprint_close en sprints cerrados
SELECT 
  'Issues completados sin status_at_sprint_close (sprints cerrados)' as validacion,
  COUNT(*) as cantidad,
  s.sprint_name
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
INNER JOIN issues i ON is_rel.issue_id = i.id
WHERE s.state = 'closed'
  AND is_rel.status_at_sprint_close IS NULL
  AND EXISTS (
    SELECT 1 FROM status_definitions sd 
    WHERE sd.status_name = i.current_status 
    AND sd.is_completed = true
  )
GROUP BY s.sprint_name
ORDER BY cantidad DESC;

-- ============================================
-- 5. VALIDACIÓN DE RELACIONES
-- ============================================

-- Verificar issue_sprints sin issue asociado (datos huérfanos)
SELECT 
  'issue_sprints sin issue asociado' as validacion,
  COUNT(*) as cantidad
FROM issue_sprints is_rel
WHERE NOT EXISTS (
  SELECT 1 FROM issues i WHERE i.id = is_rel.issue_id
);

-- Verificar issue_sprints sin sprint asociado (datos huérfanos)
SELECT 
  'issue_sprints sin sprint asociado' as validacion,
  COUNT(*) as cantidad
FROM issue_sprints is_rel
WHERE NOT EXISTS (
  SELECT 1 FROM sprints s WHERE s.id = is_rel.sprint_id
);

-- Verificar issues sin squad asignado
SELECT 
  'Issues sin squad asignado' as validacion,
  COUNT(*) as cantidad
FROM issues
WHERE squad_id IS NULL;

-- ============================================
-- 6. VALIDACIÓN DE MÉTRICAS DE VELOCIDAD
-- ============================================

-- Verificar sprints con velocidad calculada pero sin issues
SELECT 
  'Sprints con velocidad pero sin issues' as validacion,
  COUNT(*) as cantidad,
  ARRAY_AGG(sprint_name) as sprints_afectados
FROM sprint_velocity sv
WHERE NOT EXISTS (
  SELECT 1 FROM issue_sprints is_rel 
  WHERE is_rel.sprint_id = sv.sprint_id
);

-- Verificar inconsistencias entre sprint_velocity y issue_sprints
-- Nota: sprint_velocity es por sprint (no por squad), así que comparamos con la suma total de todos los squads
SELECT 
  'Inconsistencias entre sprint_velocity y issue_sprints' as validacion,
  sv.sprint_id,
  sv.sprint_name,
  sv.commitment as commitment_velocity,
  sv.completed as completed_velocity,
  COUNT(DISTINCT is_rel.issue_id) as issues_count,
  -- Cálculo manual: suma de todos los squads del sprint
  SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END) as commitment_manual,
  SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END) as completed_manual,
  -- Diferencia
  ABS(COALESCE(sv.commitment, 0) - SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END)) as diff_committed,
  ABS(COALESCE(sv.completed, 0) - SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END)) as diff_completed
FROM sprint_velocity sv
LEFT JOIN issue_sprints is_rel ON sv.sprint_id = is_rel.sprint_id
WHERE sv.commitment IS NOT NULL OR sv.completed IS NOT NULL
GROUP BY sv.sprint_id, sv.sprint_name, sv.commitment, sv.completed
HAVING ABS(COALESCE(sv.commitment, 0) - SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END)) > 0.1
   OR ABS(COALESCE(sv.completed, 0) - SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END)) > 0.1
ORDER BY diff_committed DESC, diff_completed DESC;

-- ============================================
-- 7. RESUMEN GENERAL DE INTEGRIDAD
-- ============================================

SELECT 
  'RESUMEN GENERAL' as tipo_validacion,
  COUNT(DISTINCT s.id) as total_sprints,
  COUNT(DISTINCT CASE WHEN s.state = 'closed' THEN s.id END) as sprints_cerrados,
  COUNT(DISTINCT CASE WHEN s.state = 'active' THEN s.id END) as sprints_activos,
  COUNT(DISTINCT i.id) as total_issues,
  COUNT(DISTINCT is_rel.issue_id) as issues_en_sprints,
  COUNT(DISTINCT CASE WHEN s.state = 'closed' AND is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as issues_en_sprints_cerrados,
  COUNT(DISTINCT CASE WHEN s.state = 'closed' AND is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as issues_removidos_de_sprints_cerrados
FROM sprints s
LEFT JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
LEFT JOIN issues i ON is_rel.issue_id = i.id;
