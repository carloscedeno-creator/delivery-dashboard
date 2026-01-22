/**
 * Validación Detallada del Filtro de Tickets Removidos
 * Verifica que el filtro status_at_sprint_close IS NOT NULL funciona correctamente
 */

-- ============================================
-- 1. ANÁLISIS DE TICKETS EN SPRINTS CERRADOS
-- ============================================

-- Ver distribución de tickets en sprints cerrados
SELECT 
  'Distribución de tickets en sprints cerrados' as validacion,
  s.sprint_name,
  s.state,
  s.end_date,
  COUNT(DISTINCT is_rel.issue_id) as total_tickets,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as tickets_al_cierre,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_removidos,
  -- Porcentaje
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) / 
    NULLIF(COUNT(DISTINCT is_rel.issue_id), 0), 
    2
  ) as porcentaje_removidos
FROM sprints s
LEFT JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
WHERE s.state = 'closed' AND s.end_date IS NOT NULL
GROUP BY s.sprint_name, s.state, s.end_date
ORDER BY s.end_date DESC
LIMIT 20;

-- ============================================
-- 2. VERIFICAR TICKETS REMOVIDOS ESPECÍFICOS
-- ============================================

-- Mostrar detalles de tickets removidos (si los hay)
SELECT 
  'Detalles de tickets removidos' as validacion,
  s.sprint_name,
  s.end_date,
  i.issue_key,
  i.current_status,
  is_rel.story_points_at_start,
  is_rel.story_points_at_close,
  is_rel.status_at_sprint_close,
  is_rel.added_to_sprint_date,
  is_rel.removed_from_sprint_date
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
INNER JOIN issues i ON is_rel.issue_id = i.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
  AND is_rel.status_at_sprint_close IS NULL
ORDER BY s.end_date DESC, i.issue_key
LIMIT 50;

-- ============================================
-- 3. VERIFICAR CONSISTENCIA: TICKETS QUE DEBERÍAN ESTAR REMOVIDOS
-- ============================================

-- Tickets que fueron removidos ANTES del cierre del sprint
-- (removed_from_sprint_date < end_date)
SELECT 
  'Tickets removidos antes del cierre (deben tener status_at_sprint_close NULL)' as validacion,
  COUNT(*) as cantidad,
  s.sprint_name,
  s.end_date
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
  AND is_rel.removed_from_sprint_date IS NOT NULL
  AND is_rel.removed_from_sprint_date < s.end_date
GROUP BY s.sprint_name, s.end_date
ORDER BY cantidad DESC;

-- Verificar que estos tickets tienen status_at_sprint_close NULL
SELECT 
  'Verificación: Tickets removidos antes del cierre deben tener status_at_sprint_close NULL' as validacion,
  COUNT(*) as total_removidos_antes_cierre,
  COUNT(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN 1 END) as con_status_null,
  COUNT(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN 1 END) as con_status_no_null,
  -- Si hay alguno con status no null, es un problema
  CASE 
    WHEN COUNT(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN 1 END) > 0 
    THEN '⚠️ PROBLEMA: Hay tickets removidos antes del cierre con status_at_sprint_close no null'
    ELSE '✅ OK: Todos los tickets removidos antes del cierre tienen status_at_sprint_close NULL'
  END as estado
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
  AND is_rel.removed_from_sprint_date IS NOT NULL
  AND is_rel.removed_from_sprint_date < s.end_date;

-- ============================================
-- 4. VERIFICAR TICKETS QUE ESTABAN AL CIERRE
-- ============================================

-- Tickets que estaban en el sprint al momento del cierre
-- (removed_from_sprint_date IS NULL OR removed_from_sprint_date >= end_date)
SELECT 
  'Tickets que estaban al cierre (deben tener status_at_sprint_close no null)' as validacion,
  COUNT(*) as total_al_cierre,
  COUNT(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN 1 END) as con_status_no_null,
  COUNT(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN 1 END) as con_status_null,
  -- Si hay alguno con status null, es un problema
  CASE 
    WHEN COUNT(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN 1 END) > 0 
    THEN '⚠️ PROBLEMA: Hay tickets al cierre con status_at_sprint_close null'
    ELSE '✅ OK: Todos los tickets al cierre tienen status_at_sprint_close no null'
  END as estado
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
  AND (
    is_rel.removed_from_sprint_date IS NULL 
    OR is_rel.removed_from_sprint_date >= s.end_date
  );

-- ============================================
-- 5. COMPARAR CON CÁLCULOS DE MÉTRICAS
-- ============================================

-- Comparar SP Commitment: debe excluir tickets removidos
SELECT 
  'Comparación SP Commitment (debe excluir removidos)' as validacion,
  s.sprint_name,
  sq.squad_name,
  -- Cálculo incluyendo todos (INCORRECTO)
  SUM(is_rel.story_points_at_start) as sp_committed_todos,
  -- Cálculo excluyendo removidos (CORRECTO)
  SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END) as sp_committed_sin_removidos,
  -- Diferencia
  SUM(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.story_points_at_start ELSE 0 END) as sp_de_tickets_removidos,
  COUNT(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN 1 END) as cantidad_tickets_removidos
FROM issue_sprints is_rel
INNER JOIN sprints s ON is_rel.sprint_id = s.id
INNER JOIN squads sq ON is_rel.squad_id = sq.id
WHERE s.state = 'closed' 
  AND s.end_date IS NOT NULL
GROUP BY s.sprint_name, sq.squad_name
HAVING SUM(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.story_points_at_start ELSE 0 END) > 0
ORDER BY sp_de_tickets_removidos DESC
LIMIT 20;

-- ============================================
-- 6. RESUMEN POR SPRINT
-- ============================================

-- Resumen detallado por sprint cerrado
SELECT 
  s.sprint_name,
  s.end_date,
  COUNT(DISTINCT is_rel.issue_id) as total_tickets,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as tickets_al_cierre,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_removidos,
  SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END) as sp_committed,
  SUM(CASE 
    WHEN is_rel.status_at_sprint_close IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM status_definitions sd 
      WHERE sd.status_name = is_rel.status_at_sprint_close 
      AND sd.is_completed = true
    )
    THEN is_rel.story_points_at_close 
    ELSE 0 
  END) as sp_completed
FROM sprints s
LEFT JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
WHERE s.state = 'closed' AND s.end_date IS NOT NULL
GROUP BY s.sprint_name, s.end_date
ORDER BY s.end_date DESC
LIMIT 15;
