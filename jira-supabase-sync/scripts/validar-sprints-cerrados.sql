/**
 * Script SQL para Validar Sprints Cerrados
 * Verifica que los sprints cerrados están correctamente procesados
 * 
 * USO: Ejecutar en Supabase SQL Editor
 */

-- =====================================================
-- 1. Sprints Cerrados sin complete_date
-- =====================================================
SELECT 
  s.id,
  s.sprint_name,
  s.state,
  s.start_date,
  s.end_date,
  s.complete_date,
  s.squad_id,
  sq.squad_name,
  CASE 
    WHEN s.complete_date IS NULL AND s.end_date IS NOT NULL THEN '⚠️ Falta complete_date'
    WHEN s.complete_date IS NULL AND s.end_date IS NULL THEN '❌ Falta end_date y complete_date'
    ELSE '✅ OK'
  END as estado
FROM sprints s
INNER JOIN squads sq ON s.squad_id = sq.id
WHERE s.state = 'closed'
ORDER BY s.end_date DESC NULLS LAST;

-- =====================================================
-- 2. Issues sin status_at_sprint_close en Sprints Cerrados
-- =====================================================
SELECT 
  s.sprint_name,
  sq.squad_name,
  COUNT(*) as issues_sin_status,
  ARRAY_AGG(i.issue_key ORDER BY i.issue_key) FILTER (WHERE ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY i.issue_key) <= 10) as ejemplo_issues
FROM sprints s
INNER JOIN squads sq ON s.squad_id = sq.id
INNER JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
INNER JOIN issues i ON is_rel.issue_id = i.id
WHERE s.state = 'closed'
  AND is_rel.status_at_sprint_close IS NULL
GROUP BY s.id, s.sprint_name, sq.squad_name
ORDER BY issues_sin_status DESC;

-- =====================================================
-- 3. Resumen por Squad
-- =====================================================
SELECT 
  sq.squad_name,
  COUNT(DISTINCT s.id) as total_sprints_cerrados,
  COUNT(DISTINCT CASE WHEN s.complete_date IS NOT NULL THEN s.id END) as sprints_con_complete_date,
  COUNT(DISTINCT CASE WHEN s.complete_date IS NULL THEN s.id END) as sprints_sin_complete_date,
  COUNT(DISTINCT is_rel.issue_id) as total_issues_en_sprints_cerrados,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as issues_con_status_at_close,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as issues_sin_status_at_close,
  -- Porcentajes
  ROUND(
    COUNT(DISTINCT CASE WHEN s.complete_date IS NOT NULL THEN s.id END)::numeric / 
    NULLIF(COUNT(DISTINCT s.id), 0) * 100, 
    2
  ) as porcentaje_con_complete_date,
  ROUND(
    COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END)::numeric / 
    NULLIF(COUNT(DISTINCT is_rel.issue_id), 0) * 100, 
    2
  ) as porcentaje_con_status_at_close
FROM squads sq
INNER JOIN sprints s ON sq.id = s.squad_id
LEFT JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
WHERE s.state = 'closed'
GROUP BY sq.id, sq.squad_name
ORDER BY sq.squad_name;

-- =====================================================
-- 4. Detalle de Sprint Específico
-- =====================================================
-- Reemplaza 'SPRINT-ID-AQUI' con el ID del sprint
WITH sprint_info AS (
  SELECT id, sprint_name, start_date, end_date, complete_date, state
  FROM sprints
  WHERE id = 'SPRINT-ID-AQUI'::UUID  -- ⚠️ REEMPLAZA CON ID REAL
)
SELECT 
  si.sprint_name,
  si.state,
  si.start_date,
  si.end_date,
  si.complete_date,
  CASE 
    WHEN si.complete_date IS NULL AND si.end_date IS NOT NULL THEN '⚠️ Falta complete_date'
    WHEN si.complete_date IS NULL AND si.end_date IS NULL THEN '❌ Falta end_date y complete_date'
    ELSE '✅ OK'
  END as estado_complete_date,
  COUNT(DISTINCT is_rel.issue_id) as total_issues,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as issues_con_status,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as issues_sin_status,
  -- Lista de issues sin status_at_sprint_close
  ARRAY_AGG(i.issue_key ORDER BY i.issue_key) FILTER (
    WHERE is_rel.status_at_sprint_close IS NULL
  ) as issues_sin_status_list
FROM sprint_info si
LEFT JOIN issue_sprints is_rel ON si.id = is_rel.sprint_id
LEFT JOIN issues i ON is_rel.issue_id = i.id
GROUP BY si.sprint_name, si.state, si.start_date, si.end_date, si.complete_date;

-- =====================================================
-- 5. Comparar Estado en Jira vs Supabase (requiere sprint_key)
-- =====================================================
-- Nota: Esta query solo muestra sprints con sprint_key
-- Para verificar estado real en Jira, usar el script validar-cierre-sprint.js
SELECT 
  s.sprint_name,
  s.sprint_key,
  s.state as estado_supabase,
  s.end_date,
  s.complete_date,
  CASE 
    WHEN s.complete_date IS NULL THEN '⚠️ Falta complete_date'
    ELSE '✅ OK'
  END as estado
FROM sprints s
WHERE s.state = 'closed'
  AND s.sprint_key IS NOT NULL
ORDER BY s.end_date DESC NULLS LAST;
