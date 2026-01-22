-- Migración: Actualizar función calculate_squad_sprint_sp_done para usar status_definitions
-- Fecha: 2024
-- Objetivo: Usar tabla status_definitions en lugar de lógica hardcodeada
-- 
-- DISEÑO EXTENSIBLE: Esta función está diseñada para facilitar implementaciones futuras:
-- - Helper function is_status_completed puede extenderse con más parámetros sin cambiar la función principal
-- - Reportes avanzados pueden usar is_status_completed para otros cálculos
-- - Dashboard de salud puede agregar validaciones adicionales usando el mismo helper

-- Primero, crear función helper para verificar si estatus es completado
CREATE OR REPLACE FUNCTION is_status_completed(p_status TEXT, p_include_dev_done BOOLEAN DEFAULT true)
RETURNS BOOLEAN AS $$
DECLARE
  v_normalized_status TEXT;
  v_status_def RECORD;
BEGIN
  -- Normalizar estatus
  v_normalized_status := UPPER(TRIM(COALESCE(p_status, '')));
  
  IF v_normalized_status = '' THEN
    RETURN false;
  END IF;
  
  -- Buscar en status_definitions
  SELECT is_completed, is_dev_done, is_production_done
  INTO v_status_def
  FROM status_definitions
  WHERE normalized_name = v_normalized_status
  LIMIT 1;
  
  -- Si encontramos definición, usar esa
  IF FOUND THEN
    IF p_include_dev_done THEN
      RETURN v_status_def.is_completed OR v_status_def.is_dev_done;
    ELSE
      RETURN v_status_def.is_production_done;
    END IF;
  END IF;
  
  -- Fallback: buscar por substring si no está en definiciones
  IF v_normalized_status LIKE '%DONE%' 
     AND v_normalized_status NOT LIKE '%TO DO%' 
     AND v_normalized_status NOT LIKE '%TODO%' THEN
    RETURN p_include_dev_done OR v_normalized_status = 'DONE';
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_status_completed IS 
'Verifica si un estatus se considera completado usando status_definitions. Si include_dev_done es true, incluye Development Done.';

-- Actualizar función calculate_squad_sprint_sp_done para usar helper
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
  -- Usar función helper is_status_completed en lugar de lógica hardcodeada
  -- IMPORTANTE: Para sprints cerrados, solo contar tickets que estaban en el sprint al momento del cierre
  -- Si status_at_sprint_close es NULL, el ticket fue removido antes del cierre y NO debe contarse
  SELECT COALESCE(SUM(COALESCE(i.current_story_points, 0)), 0) INTO v_sp_done
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
