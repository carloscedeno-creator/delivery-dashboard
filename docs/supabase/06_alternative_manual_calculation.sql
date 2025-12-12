-- =====================================================
-- ALTERNATIVA: Función para Calcular Métricas Manualmente
-- Útil si el trigger no funciona o quieres control manual
-- =====================================================

-- =====================================================
-- FUNCIÓN: Calcular Métricas Después de Sync (Manual)
-- =====================================================
-- Esta función puede ser llamada directamente desde el servicio de sincronización
-- o desde cualquier cliente después de que se complete una sync

CREATE OR REPLACE FUNCTION calculate_metrics_after_sync(p_sync_log_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  sprints_processed INTEGER,
  developers_processed INTEGER
) AS $$
DECLARE
  v_sync_log RECORD;
  v_project_key TEXT;
  v_result RECORD;
BEGIN
  -- Obtener información de la sincronización
  SELECT * INTO v_sync_log
  FROM data_sync_log
  WHERE id = p_sync_log_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Sync log no encontrado'::TEXT, 0, 0;
    RETURN;
  END IF;
  
  -- Verificar que la sync esté completada
  IF v_sync_log.status != 'completed' THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('Sync no completada (status: %s)', v_sync_log.status)::TEXT, 
      0, 
      0;
    RETURN;
  END IF;
  
  -- Obtener project_key
  SELECT project_key INTO v_project_key
  FROM projects
  WHERE id = v_sync_log.project_id;
  
  IF v_project_key IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Project key no encontrado'::TEXT, 0, 0;
    RETURN;
  END IF;
  
  -- Calcular métricas
  SELECT * INTO v_result
  FROM calculate_all_metrics(v_project_key);
  
  RETURN QUERY SELECT 
    TRUE,
    format('Métricas calculadas exitosamente para proyecto %s', v_project_key)::TEXT,
    v_result.sprints_processed,
    v_result.developers_processed;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Calcular Métricas para Última Sync
-- =====================================================
-- Calcula métricas para la última sincronización completada de un proyecto

CREATE OR REPLACE FUNCTION calculate_metrics_for_last_sync(p_project_key TEXT)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  sprints_processed INTEGER,
  developers_processed INTEGER,
  sync_log_id UUID
) AS $$
DECLARE
  v_last_sync RECORD;
  v_result RECORD;
BEGIN
  -- Obtener última sincronización completada
  SELECT dsl.* INTO v_last_sync
  FROM data_sync_log dsl
  JOIN projects p ON dsl.project_id = p.id
  WHERE p.project_key = UPPER(p_project_key)
    AND dsl.status = 'completed'
  ORDER BY dsl.sync_completed_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('No se encontró sincronización completada para proyecto %s', p_project_key)::TEXT,
      0,
      0,
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Calcular métricas
  SELECT * INTO v_result
  FROM calculate_all_metrics(p_project_key);
  
  RETURN QUERY SELECT 
    TRUE,
    format('Métricas calculadas para última sync del proyecto %s', p_project_key)::TEXT,
    v_result.sprints_processed,
    v_result.developers_processed,
    v_last_sync.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON FUNCTION calculate_metrics_after_sync IS 
'Calcula métricas manualmente después de una sincronización específica. Útil si el trigger no funciona o quieres control manual.';

COMMENT ON FUNCTION calculate_metrics_for_last_sync IS 
'Calcula métricas para la última sincronización completada de un proyecto. Útil para recalcular después de cambios.';


