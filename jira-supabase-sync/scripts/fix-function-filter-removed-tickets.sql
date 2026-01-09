-- =====================================================
-- FIX: Filtrar tickets removidos del sprint antes del cierre
-- =====================================================
-- Actualizar función calculate_squad_sprint_sp_done para excluir
-- tickets que fueron removidos del sprint antes del cierre
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_squad_sprint_sp_done(
  p_squad_id UUID,
  p_sprint_id UUID
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  v_sp_done DECIMAL(10, 2) := 0;
  v_sprint RECORD;
  v_is_closed BOOLEAN := false;
BEGIN
  -- Get sprint dates and state
  SELECT start_date, end_date, sprint_name, state INTO v_sprint
  FROM sprints
  WHERE id = p_sprint_id;

  IF v_sprint IS NULL THEN
    RETURN 0;
  END IF;

  -- Determinar si el sprint está cerrado
  v_is_closed := (v_sprint.state = 'closed') OR 
                 (v_sprint.end_date IS NOT NULL AND v_sprint.end_date < CURRENT_DATE);

  -- Calculate SP from issues that reached Done during sprint
  -- IMPORTANTE: Para sprints cerrados, solo contar tickets que estaban en el sprint al momento del cierre
  -- Si status_at_sprint_close es NULL, el ticket fue removido antes del cierre y NO debe contarse
  -- IMPORTANTE: Para sprints cerrados, usar story_points_at_close (SP al final del sprint) en lugar de current_story_points
  SELECT COALESCE(SUM(
    CASE 
      -- Para sprints cerrados, usar story_points_at_close (la foto al cierre)
      WHEN v_is_closed AND is_rel.story_points_at_close IS NOT NULL 
      THEN is_rel.story_points_at_close
      -- Para sprints activos o cuando no hay story_points_at_close, usar current_story_points
      ELSE COALESCE(i.current_story_points, 0)
    END
  ), 0) INTO v_sp_done
  FROM issues i
  INNER JOIN issue_sprints is_rel ON i.id = is_rel.issue_id
  WHERE is_rel.sprint_id = p_sprint_id
    AND i.squad_id = p_squad_id
    -- IMPORTANTE: Para sprints cerrados, solo contar tickets que estaban en el sprint al momento del cierre
    AND (
      NOT v_is_closed  -- Para sprints activos, no aplicar este filtro
      OR is_rel.status_at_sprint_close IS NOT NULL  -- Para sprints cerrados, solo tickets con status_at_sprint_close
    )
    AND (
      -- Issue was resolved during sprint dates
      (
        i.resolved_date IS NOT NULL
        AND i.resolved_date::DATE >= v_sprint.start_date
        AND i.resolved_date::DATE <= COALESCE(v_sprint.end_date, CURRENT_DATE)
        AND (
          is_status_completed(i.current_status, true) -- incluye DEV DONE
          OR is_status_completed(is_rel.status_at_sprint_close, true) -- incluye DEV DONE
        )
      )
      OR
      -- Issue status history shows it reached Done during sprint
      (
        i.status_by_sprint IS NOT NULL
        AND i.status_by_sprint != '{}'::JSONB
        AND EXISTS (
          SELECT 1
          FROM jsonb_each_text(i.status_by_sprint) AS status_entry
          WHERE status_entry.key = v_sprint.sprint_name
            AND is_status_completed(status_entry.value, true) -- incluye DEV DONE
        )
      )
    );

  RETURN v_sp_done;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_squad_sprint_sp_done IS 
'Calculates SP Done for a squad and sprint based on issues that reached Done or Development Done status during the sprint dates. Uses status_definitions table for consistency. For closed sprints, only counts tickets that were in the sprint at closure time (status_at_sprint_close IS NOT NULL).';

-- Verificar que la función se actualizó correctamente
SELECT 'Función calculate_squad_sprint_sp_done actualizada correctamente' as verificacion
WHERE EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'calculate_squad_sprint_sp_done'
);
