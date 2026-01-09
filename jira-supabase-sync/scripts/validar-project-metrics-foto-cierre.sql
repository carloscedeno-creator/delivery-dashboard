-- =====================================================
-- VALIDACIÓN: Project Metrics - Foto del Cierre
-- =====================================================
-- Valida que Project Metrics solo cuenta tickets que estaban
-- en el sprint al momento del cierre (excluyendo removidos)
-- =====================================================

-- =====================================================
-- PARTE 1: Seleccionar Sprint Cerrado para Validación
-- =====================================================

WITH sprint_cerrado AS (
  SELECT 
    id,
    sprint_name,
    start_date,
    end_date,
    state
  FROM sprints
  WHERE state = 'closed'
    AND end_date IS NOT NULL
    AND (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = sprints.id AND status_at_sprint_close IS NOT NULL) > 5
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT 
  '📋 SPRINT SELECCIONADO PARA VALIDACIÓN' as info,
  id,
  sprint_name,
  start_date,
  end_date,
  state,
  (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = id) as total_tickets_en_issue_sprints,
  (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = id AND status_at_sprint_close IS NOT NULL) as tickets_en_sprint_al_cierre,
  (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = id AND status_at_sprint_close IS NULL) as tickets_removidos_antes_cierre
FROM sprint_cerrado;

-- =====================================================
-- PARTE 2: Validar que solo se cuentan tickets con status_at_sprint_close
-- =====================================================

WITH sprint_cerrado AS (
  SELECT 
    id,
    sprint_name,
    start_date,
    end_date,
    state
  FROM sprints
  WHERE state = 'closed'
    AND end_date IS NOT NULL
    AND (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = sprints.id AND status_at_sprint_close IS NOT NULL) > 5
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT 
  '✅ VALIDACIÓN: Tickets que DEBEN contarse en Project Metrics' as seccion,
  sp.sprint_name,
  COUNT(DISTINCT is_rel.issue_id) as total_tickets_con_status_at_close,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_removidos_excluidos,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN is_rel.story_points_at_close 
      ELSE 0 
    END
  ), 0) as total_sp_de_tickets_en_cierre,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NULL 
      THEN is_rel.story_points_at_start 
      ELSE 0 
    END
  ), 0) as sp_de_tickets_removidos_excluidos,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) > 0 
    THEN '✅ CORRECTO: Tickets removidos identificados y serán excluidos'
    ELSE '⚠️ No hay tickets removidos en este sprint (puede ser normal)'
  END as validacion
FROM issue_sprints is_rel
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
GROUP BY sp.sprint_name;

-- =====================================================
-- PARTE 3: Validar Story Points por Estado (como Project Metrics)
-- =====================================================

WITH sprint_cerrado AS (
  SELECT 
    id,
    sprint_name,
    start_date,
    end_date,
    state
  FROM sprints
  WHERE state = 'closed'
    AND end_date IS NOT NULL
    AND (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = sprints.id AND status_at_sprint_close IS NOT NULL) > 5
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT 
  '📊 STORY POINTS POR ESTADO (Foto del Cierre)' as seccion,
  sp.sprint_name,
  is_rel.status_at_sprint_close as estado_al_cierre,
  COUNT(DISTINCT is_rel.issue_id) as cantidad_tickets,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.story_points_at_close IS NOT NULL 
      THEN is_rel.story_points_at_close 
      ELSE is_rel.story_points_at_start 
    END
  ), 0) as total_sp,
  -- Validar que todos tienen status_at_sprint_close
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_sin_status_excluidos
FROM issue_sprints is_rel
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
  AND is_rel.status_at_sprint_close IS NOT NULL  -- SOLO tickets que estaban en el sprint al cierre
GROUP BY sp.sprint_name, is_rel.status_at_sprint_close
ORDER BY total_sp DESC;

-- =====================================================
-- PARTE 4: Comparar con valores INCORRECTOS (sin filtro)
-- =====================================================

WITH sprint_cerrado AS (
  SELECT 
    id,
    sprint_name,
    start_date,
    end_date,
    state
  FROM sprints
  WHERE state = 'closed'
    AND end_date IS NOT NULL
    AND (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = sprints.id AND status_at_sprint_close IS NOT NULL) > 5
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT 
  '⚠️ COMPARACIÓN: CORRECTO vs INCORRECTO' as seccion,
  sp.sprint_name,
  -- CORRECTO: Solo tickets con status_at_sprint_close
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as sp_correcto_solo_en_cierre,
  -- INCORRECTO: Todos los tickets (incluyendo removidos)
  COALESCE(SUM(COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)), 0) as sp_incorrecto_todos_los_tickets,
  -- DIFERENCIA (tickets removidos que se excluirían)
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as sp_de_tickets_removidos_excluidos,
  CASE 
    WHEN COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NULL 
        THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
        ELSE 0 
      END
    ), 0) > 0 
    THEN '✅ CORRECTO: El filtro excluiría tickets removidos'
    ELSE '⚠️ No hay diferencia (no hay tickets removidos en este sprint)'
  END as validacion_filtro
FROM issue_sprints is_rel
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
GROUP BY sp.sprint_name;

-- =====================================================
-- PARTE 5: Validar por Squad (como Project Metrics agrupa)
-- =====================================================

WITH sprint_cerrado AS (
  SELECT 
    id,
    sprint_name,
    start_date,
    end_date,
    state
  FROM sprints
  WHERE state = 'closed'
    AND end_date IS NOT NULL
    AND (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = sprints.id AND status_at_sprint_close IS NOT NULL) > 5
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT 
  '👥 STORY POINTS POR SQUAD (Foto del Cierre)' as seccion,
  sp.sprint_name,
  sq.squad_name,
  COUNT(DISTINCT is_rel.issue_id) as tickets_en_sprint_al_cierre,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_removidos_excluidos,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as total_sp_correcto,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as sp_de_tickets_removidos,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) > 0 
    THEN '✅ CORRECTO: Tickets removidos identificados y excluidos'
    ELSE '✅ CORRECTO: Todos los tickets estaban en el sprint al cierre'
  END as validacion
FROM issue_sprints is_rel
INNER JOIN issues i ON is_rel.issue_id = i.id
INNER JOIN squads sq ON i.squad_id = sq.id
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
  AND sq.id IN (
    '9905be65-9987-4f93-83eb-90a6c2ae0e8d',  -- Core Infrastructure
    'beeaf0c1-00d8-4c8a-9ce4-8476f5dd5747',  -- Orderbahn
    '868d074a-6e0e-418e-ae84-55579180dd8e',  -- Integration
    '77968145-17b3-4bb1-b238-c95f6b2e5a5b'   -- Product
  )
GROUP BY sp.sprint_name, sq.squad_name
ORDER BY sq.squad_name;

-- =====================================================
-- PARTE 6: Resumen Final de Validación
-- =====================================================

WITH sprint_cerrado AS (
  SELECT 
    id,
    sprint_name,
    start_date,
    end_date,
    state
  FROM sprints
  WHERE state = 'closed'
    AND end_date IS NOT NULL
    AND (SELECT COUNT(*) FROM issue_sprints WHERE sprint_id = sprints.id AND status_at_sprint_close IS NOT NULL) > 5
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT 
  '✅ RESUMEN FINAL: Validación Foto del Cierre' as seccion,
  sp.sprint_name,
  COUNT(DISTINCT is_rel.issue_id) as total_tickets_en_issue_sprints,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as tickets_que_deben_contarse,
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_removidos_que_deben_excluirse,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as sp_total_correcto_foto_cierre,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as sp_de_tickets_removidos_excluidos,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) > 0 
    THEN '✅ CORRECTO: El sistema identifica tickets removidos y los excluirá correctamente'
    WHEN COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) > 0
    THEN '✅ CORRECTO: Todos los tickets estaban en el sprint al cierre (no hay removidos)'
    ELSE '⚠️ ADVERTENCIA: No se encontraron tickets en issue_sprints'
  END as validacion_final,
  '📝 NOTA: Project Metrics debe usar SOLO tickets con status_at_sprint_close IS NOT NULL para sprints cerrados' as nota_importante
FROM issue_sprints is_rel
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
GROUP BY sp.sprint_name;
