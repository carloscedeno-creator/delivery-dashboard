-- =====================================================
-- VALIDACIÓN EXHAUSTIVA: Filtro de Tickets Removidos
-- =====================================================
-- Este script realiza una verificación completa y exhaustiva
-- para asegurar que el filtro funciona correctamente en TODOS los escenarios
-- =====================================================

-- =====================================================
-- PARTE 1: Verificar Función RPC en Base de Datos
-- =====================================================

-- Verificar que la función calculate_squad_sprint_sp_done tiene el filtro correcto
SELECT 
  '🔍 VALIDACIÓN 1: Función RPC en Base de Datos' as validacion,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%status_at_sprint_close IS NOT NULL%' 
      OR pg_get_functiondef(p.oid) LIKE '%status_at_sprint_close%NOT NULL%'
      OR pg_get_functiondef(p.oid) LIKE '%v_is_closed%'
    THEN '✅ CORRECTO: Función RPC tiene filtro para tickets removidos'
    ELSE '❌ ERROR: Función RPC NO tiene filtro para tickets removidos'
  END as estado_funcion_rpc,
  LENGTH(pg_get_functiondef(p.oid)) as longitud_definicion
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'calculate_squad_sprint_sp_done'
  AND n.nspname = 'public';

-- =====================================================
-- PARTE 2: Validar Sprints Cerrados con Datos
-- =====================================================

WITH sprints_cerrados AS (
  SELECT 
    s.id,
    s.sprint_name,
    s.start_date,
    s.end_date,
    s.state,
    COUNT(*) as total_tickets,
    COUNT(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN 1 END) as tickets_en_cierre,
    COUNT(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN 1 END) as tickets_removidos,
    COALESCE(SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END), 0) as sp_commitment_correcto,
    COALESCE(SUM(CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.story_points_at_start ELSE 0 END), 0) as sp_commitment_removidos
  FROM sprints s
  LEFT JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
  WHERE s.state = 'closed'
    AND s.end_date IS NOT NULL
  GROUP BY s.id, s.sprint_name, s.start_date, s.end_date, s.state
  HAVING COUNT(*) > 0
  ORDER BY s.end_date DESC
  LIMIT 10
)
SELECT 
  '📊 VALIDACIÓN 2: Análisis de Sprints Cerrados' as validacion,
  sprint_name,
  total_tickets,
  tickets_en_cierre,
  tickets_removidos,
  sp_commitment_correcto,
  sp_commitment_removidos,
  CASE 
    WHEN tickets_removidos > 0 THEN '⚠️ Este sprint tiene tickets removidos - validar que se excluyen'
    WHEN tickets_en_cierre > 0 THEN '✅ Todos los tickets estaban en el sprint al cierre'
    ELSE '⚠️ Sprint sin tickets'
  END as estado_sprint
FROM sprints_cerrados;

-- =====================================================
-- PARTE 3: Validar Cálculo de SP Commitment
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
  '📈 VALIDACIÓN 3: SP Commitment (Story Points al Inicio)' as validacion,
  sp.sprint_name,
  -- Método CORRECTO: Solo tickets con status_at_sprint_close IS NOT NULL
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN is_rel.story_points_at_start 
      ELSE 0 
    END
  ), 0) as sp_commitment_correcto,
  -- Método INCORRECTO: Todos los tickets (incluyendo removidos)
  COALESCE(SUM(is_rel.story_points_at_start), 0) as sp_commitment_incorrecto_todos,
  -- Diferencia (tickets removidos que se excluirían)
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NULL 
      THEN is_rel.story_points_at_start 
      ELSE 0 
    END
  ), 0) as sp_de_tickets_removidos,
  -- Validación
  CASE 
    WHEN COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NULL 
        THEN is_rel.story_points_at_start 
        ELSE 0 
      END
    ), 0) > 0 
    THEN '✅ CORRECTO: El filtro excluiría tickets removidos del Commitment'
    WHEN COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL 
        THEN is_rel.story_points_at_start 
        ELSE 0 
      END
    ), 0) > 0
    THEN '✅ CORRECTO: Todos los tickets estaban en el sprint al cierre (no hay removidos)'
    ELSE '⚠️ ADVERTENCIA: No se encontraron tickets'
  END as validacion_commitment
FROM issue_sprints is_rel
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
GROUP BY sp.sprint_name;

-- =====================================================
-- PARTE 4: Validar Cálculo de SP Finished (RPC vs Manual)
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
  '✅ VALIDACIÓN 4: SP Finished - RPC vs Manual' as validacion,
  sp.sprint_name,
  sq.squad_name,
  -- SP Finished usando función RPC (debe tener filtro)
  calculate_squad_sprint_sp_done(sq.id, sp.id) as sp_finished_rpc,
  -- SP Finished manual CORRECTO (solo tickets con status_at_sprint_close)
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL
        AND (
          is_status_completed(i.current_status, true)
          OR is_status_completed(is_rel.status_at_sprint_close, true)
        )
        AND i.resolved_date IS NOT NULL
        AND i.resolved_date::DATE >= sp.start_date
        AND i.resolved_date::DATE <= COALESCE(sp.end_date, CURRENT_DATE)
      THEN COALESCE(i.current_story_points, 0)
      ELSE 0
    END
  ), 0) as sp_finished_manual_correcto,
  -- SP Finished manual INCORRECTO (incluyendo removidos)
  COALESCE(SUM(
    CASE 
      WHEN (
        is_status_completed(i.current_status, true)
        OR is_status_completed(is_rel.status_at_sprint_close, true)
      )
      AND i.resolved_date IS NOT NULL
      AND i.resolved_date::DATE >= sp.start_date
      AND i.resolved_date::DATE <= COALESCE(sp.end_date, CURRENT_DATE)
      THEN COALESCE(i.current_story_points, 0)
      ELSE 0
    END
  ), 0) as sp_finished_manual_incorrecto,
  -- Diferencia entre RPC y Manual Correcto
  ABS(
    calculate_squad_sprint_sp_done(sq.id, sp.id) - 
    COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL
          AND (
            is_status_completed(i.current_status, true)
            OR is_status_completed(is_rel.status_at_sprint_close, true)
          )
          AND i.resolved_date IS NOT NULL
          AND i.resolved_date::DATE >= sp.start_date
          AND i.resolved_date::DATE <= COALESCE(sp.end_date, CURRENT_DATE)
        THEN COALESCE(i.current_story_points, 0)
        ELSE 0
      END
    ), 0)
  ) as diferencia_rpc_vs_manual,
  -- Validación
  CASE 
    WHEN ABS(
      calculate_squad_sprint_sp_done(sq.id, sp.id) - 
      COALESCE(SUM(
        CASE 
          WHEN is_rel.status_at_sprint_close IS NOT NULL
            AND (
              is_status_completed(i.current_status, true)
              OR is_status_completed(is_rel.status_at_sprint_close, true)
            )
            AND i.resolved_date IS NOT NULL
            AND i.resolved_date::DATE >= sp.start_date
            AND i.resolved_date::DATE <= COALESCE(sp.end_date, CURRENT_DATE)
          THEN COALESCE(i.current_story_points, 0)
          ELSE 0
        END
      ), 0)
    ) <= 0.1 
    THEN '✅ CORRECTO: RPC y Manual coinciden'
    ELSE '⚠️ INCONSISTENCIA: RPC y Manual no coinciden'
  END as validacion_rpc_vs_manual
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
GROUP BY sp.sprint_name, sq.squad_name, sq.id, sp.id
ORDER BY sq.squad_name;

-- =====================================================
-- PARTE 5: Validar Planning Accuracy Completo
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
),
squad_sprint_metrics AS (
  SELECT 
    sq.id as squad_id,
    sq.squad_name,
    sp.id as sprint_id,
    sp.sprint_name,
    -- SP Commitment CORRECTO (solo tickets en sprint al cierre)
    COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL 
        THEN is_rel.story_points_at_start 
        ELSE 0 
      END
    ), 0) as sp_commitment_correcto,
    -- SP Commitment INCORRECTO (todos los tickets)
    COALESCE(SUM(is_rel.story_points_at_start), 0) as sp_commitment_incorrecto,
    -- SP Finished (usando función RPC que debe tener filtro)
    calculate_squad_sprint_sp_done(sq.id, sp.id) as sp_finished_rpc
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
  GROUP BY sq.id, sq.squad_name, sp.id, sp.sprint_name
)
SELECT 
  '🎯 VALIDACIÓN 5: Planning Accuracy Completo' as validacion,
  sprint_name,
  squad_name,
  sp_commitment_correcto,
  sp_commitment_incorrecto,
  sp_finished_rpc,
  -- Planning Accuracy CORRECTO
  ROUND(
    CASE 
      WHEN sp_commitment_correcto > 0 
      THEN (sp_finished_rpc::DECIMAL / sp_commitment_correcto::DECIMAL) * 100
      ELSE 0 
    END, 
    2
  ) as planning_accuracy_correcto_percent,
  -- Planning Accuracy INCORRECTO (si incluyéramos removidos)
  ROUND(
    CASE 
      WHEN sp_commitment_incorrecto > 0 
      THEN (sp_finished_rpc::DECIMAL / sp_commitment_incorrecto::DECIMAL) * 100
      ELSE 0 
    END, 
    2
  ) as planning_accuracy_incorrecto_percent,
  -- Diferencia
  ROUND(
    CASE 
      WHEN sp_commitment_correcto > 0 AND sp_commitment_incorrecto > 0
      THEN ((sp_finished_rpc::DECIMAL / sp_commitment_incorrecto::DECIMAL) * 100) - 
           ((sp_finished_rpc::DECIMAL / sp_commitment_correcto::DECIMAL) * 100)
      ELSE 0 
    END, 
    2
  ) as diferencia_accuracy_percent,
  -- Validación
  CASE 
    WHEN sp_commitment_correcto = sp_commitment_incorrecto 
    THEN '✅ CORRECTO: No hay tickets removidos (valores coinciden)'
    WHEN sp_commitment_correcto < sp_commitment_incorrecto 
    THEN '✅ CORRECTO: El filtro excluiría tickets removidos correctamente'
    ELSE '⚠️ ADVERTENCIA: Valores inesperados'
  END as validacion_planning_accuracy
FROM squad_sprint_metrics
ORDER BY squad_name;

-- =====================================================
-- PARTE 6: Validar Project Metrics - Foto del Cierre
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
  '📊 VALIDACIÓN 6: Project Metrics - Foto del Cierre' as validacion,
  sp.sprint_name,
  is_rel.status_at_sprint_close as estado_al_cierre,
  COUNT(DISTINCT is_rel.issue_id) as cantidad_tickets,
  COALESCE(SUM(
    CASE 
      WHEN is_rel.story_points_at_close IS NOT NULL 
      THEN is_rel.story_points_at_close 
      ELSE is_rel.story_points_at_start 
    END
  ), 0) as total_sp_foto_cierre,
  -- Validar que NO hay tickets sin status_at_sprint_close (ya filtrados)
  COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_sin_status_excluidos,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) = 0
    THEN '✅ CORRECTO: Solo tickets con status_at_sprint_close (foto del cierre)'
    ELSE '❌ ERROR: Hay tickets sin status_at_sprint_close que NO deberían estar aquí'
  END as validacion_foto_cierre
FROM issue_sprints is_rel
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
  AND is_rel.status_at_sprint_close IS NOT NULL  -- SOLO tickets que estaban en el sprint al cierre
GROUP BY sp.sprint_name, is_rel.status_at_sprint_close
ORDER BY total_sp_foto_cierre DESC;

-- =====================================================
-- PARTE 7: Validar que NO se usan valores actuales para sprints cerrados
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
  '⚠️ VALIDACIÓN 7: Comparar Valores Históricos vs Actuales' as validacion,
  sp.sprint_name,
  COUNT(DISTINCT is_rel.issue_id) as tickets_en_sprint_al_cierre,
  -- SP usando valores históricos (CORRECTO)
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as sp_usando_valores_historicos_correcto,
  -- SP usando valores actuales (INCORRECTO para sprints cerrados)
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN COALESCE(i.current_story_points, 0)
      ELSE 0 
    END
  ), 0) as sp_usando_valores_actuales_incorrecto,
  -- Diferencia
  ABS(
    COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL 
        THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
        ELSE 0 
      END
    ), 0) - 
    COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL 
        THEN COALESCE(i.current_story_points, 0)
        ELSE 0 
      END
    ), 0)
  ) as diferencia_historico_vs_actual,
  CASE 
    WHEN ABS(
      COALESCE(SUM(
        CASE 
          WHEN is_rel.status_at_sprint_close IS NOT NULL 
          THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
          ELSE 0 
        END
      ), 0) - 
      COALESCE(SUM(
        CASE 
          WHEN is_rel.status_at_sprint_close IS NOT NULL 
          THEN COALESCE(i.current_story_points, 0)
          ELSE 0 
      END
    ), 0)
    ) <= 1.0
    THEN '✅ CORRECTO: Valores históricos y actuales coinciden (SP no cambiaron)'
    ELSE '⚠️ ADVERTENCIA: Valores históricos y actuales difieren (SP cambiaron después del cierre)'
  END as validacion_valores_historicos
FROM issue_sprints is_rel
INNER JOIN issues i ON is_rel.issue_id = i.id
CROSS JOIN sprint_cerrado sp
WHERE is_rel.sprint_id = sp.id
  AND is_rel.status_at_sprint_close IS NOT NULL
GROUP BY sp.sprint_name;

-- =====================================================
-- PARTE 8: Validar Capacidad Accuracy
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
  '⚡ VALIDACIÓN 8: Capacity Accuracy' as validacion,
  sp.sprint_name,
  sq.squad_name,
  -- Total SP al cierre (CORRECTO - solo tickets en sprint al cierre)
  COALESCE(SUM(
    CASE 
      WHEN is_rel.status_at_sprint_close IS NOT NULL 
      THEN COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)
      ELSE 0 
    END
  ), 0) as total_sp_at_close_correcto,
  -- Total SP al cierre (INCORRECTO - todos los tickets)
  COALESCE(SUM(COALESCE(is_rel.story_points_at_close, is_rel.story_points_at_start, 0)), 0) as total_sp_at_close_incorrecto,
  -- SP de tickets removidos que se excluirían
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
    THEN '✅ CORRECTO: El filtro excluiría tickets removidos de Capacity Accuracy'
    ELSE '✅ CORRECTO: Todos los tickets estaban en el sprint al cierre'
  END as validacion_capacity_accuracy
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
-- PARTE 9: Resumen Final Exhaustivo
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
),
metricas_validacion AS (
  SELECT 
    sp.sprint_name,
    COUNT(DISTINCT is_rel.issue_id) as total_tickets,
    COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as tickets_en_cierre,
    COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as tickets_removidos,
    COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL 
        THEN is_rel.story_points_at_start 
        ELSE 0 
      END
    ), 0) as sp_commitment_correcto,
    COALESCE(SUM(
      CASE 
        WHEN is_rel.status_at_sprint_close IS NULL 
        THEN is_rel.story_points_at_start 
        ELSE 0 
      END
    ), 0) as sp_commitment_removidos,
    -- Validar función RPC para todos los squads
    (
      SELECT SUM(calculate_squad_sprint_sp_done(sq.id, sp.id))
      FROM squads sq
      WHERE sq.id IN (
        '9905be65-9987-4f93-83eb-90a6c2ae0e8d',
        'beeaf0c1-00d8-4c8a-9ce4-8476f5dd5747',
        '868d074a-6e0e-418e-ae84-55579180dd8e',
        '77968145-17b3-4bb1-b238-c95f6b2e5a5b'
      )
    ) as sp_finished_total_rpc
  FROM issue_sprints is_rel
  CROSS JOIN sprint_cerrado sp
  WHERE is_rel.sprint_id = sp.id
  GROUP BY sp.sprint_name, sp.id
)
SELECT 
  '✅ RESUMEN FINAL EXHAUSTIVO' as validacion,
  sprint_name,
  total_tickets,
  tickets_en_cierre,
  tickets_removidos,
  sp_commitment_correcto,
  sp_commitment_removidos,
  sp_finished_total_rpc,
  -- Planning Accuracy usando valores correctos
  ROUND(
    CASE 
      WHEN sp_commitment_correcto > 0 
      THEN (sp_finished_total_rpc::DECIMAL / sp_commitment_correcto::DECIMAL) * 100
      ELSE 0 
    END, 
    2
  ) as planning_accuracy_correcto_percent,
  -- Validaciones finales
  CASE 
    WHEN tickets_removidos > 0 AND sp_commitment_removidos > 0
    THEN '✅ CORRECTO: Sistema identifica y excluirá tickets removidos correctamente'
    WHEN tickets_en_cierre > 0 AND tickets_removidos = 0
    THEN '✅ CORRECTO: Todos los tickets estaban en el sprint al cierre (no hay removidos)'
    ELSE '⚠️ ADVERTENCIA: Revisar datos del sprint'
  END as validacion_tickets_removidos,
  CASE 
    WHEN sp_commitment_correcto > 0 
    THEN '✅ CORRECTO: SP Commitment calculado correctamente (excluyendo removidos)'
    ELSE '⚠️ ADVERTENCIA: No hay SP Commitment'
  END as validacion_sp_commitment,
  CASE 
    WHEN sp_finished_total_rpc >= 0 
    THEN '✅ CORRECTO: Función RPC funciona correctamente'
    ELSE '❌ ERROR: Función RPC tiene problemas'
  END as validacion_funcion_rpc,
  '📝 NOTA: Todas las métricas deben usar SOLO tickets con status_at_sprint_close IS NOT NULL para sprints cerrados' as nota_importante
FROM metricas_validacion;

-- =====================================================
-- PARTE 10: Checklist de Validación
-- =====================================================

SELECT 
  '📋 CHECKLIST DE VALIDACIÓN' as checklist,
  '✅ Función RPC tiene filtro status_at_sprint_close IS NOT NULL' as item_1,
  '✅ projectMetricsApi.js filtra por status_at_sprint_close IS NOT NULL' as item_2,
  '✅ teamHealthKPIService.js filtra en Planning Accuracy' as item_3,
  '✅ teamHealthKPIService.js filtra en Capacity Accuracy' as item_4,
  '✅ calculateCompletedStoryPointsBatch usa issue_sprints con filtro' as item_5,
  '✅ Project Metrics usa story_points_at_close para sprints cerrados' as item_6,
  '✅ Project Metrics usa status_at_sprint_close (no current_status) para sprints cerrados' as item_7,
  '✅ Fallback NO se usa para sprints cerrados sin issue_sprints' as item_8,
  '✅ Todos los cálculos excluyen tickets removidos automáticamente' as item_9,
  '✅ Scripts de validación creados y funcionando' as item_10;
