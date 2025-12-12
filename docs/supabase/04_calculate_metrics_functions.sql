-- =====================================================
-- FUNCIONES PARA CÁLCULO DE MÉTRICAS ANALÍTICAS
-- Replican la lógica de Google Apps Script
-- =====================================================

-- =====================================================
-- FUNCIÓN 1: Mapeo de Estados de Jira a Estados Objetivo
-- =====================================================
CREATE OR REPLACE FUNCTION map_to_target_status(jira_status TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Normalizar estado
  jira_status := LOWER(TRIM(COALESCE(jira_status, '')));
  
  -- Si está vacío o es N/A, retornar QA
  IF jira_status = '' OR jira_status = 'n/a (sin foto)' THEN
    RETURN 'QA';
  END IF;
  
  -- Mapear a estados objetivo
  IF jira_status IN ('done', 'development done', 'resolved', 'closed', 'finished') THEN
    RETURN 'Done';
  ELSIF jira_status IN ('blocked', 'impediment') THEN
    RETURN 'Blocked';
  ELSIF jira_status LIKE '%in progress%' OR 
        jira_status IN ('in development', 'doing', 'desarrollo') THEN
    RETURN 'In Progress';
  ELSIF jira_status LIKE '%reopen%' THEN
    RETURN 'Reopen';
  ELSIF jira_status LIKE '%qa%' OR 
        jira_status LIKE '%test%' OR 
        jira_status LIKE '%review%' OR 
        jira_status LIKE '%staging%' OR 
        jira_status LIKE '%testing%' OR 
        jira_status LIKE '%compliance check%' THEN
    RETURN 'QA';
  ELSIF jira_status IN ('to do', 'backlog') OR 
        jira_status LIKE '%pendiente%' THEN
    RETURN 'To Do';
  ELSE
    RETURN 'QA'; -- Default
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCIÓN 2: Obtener Estado Histórico para Sprint
-- =====================================================
CREATE OR REPLACE FUNCTION get_historical_status_for_sprint(
  current_status TEXT,
  status_at_sprint_close TEXT,
  sprint_state TEXT,
  sprint_complete_date TIMESTAMPTZ,
  sprint_end_date TIMESTAMPTZ
)
RETURNS TEXT AS $$
DECLARE
  sprint_foto_date TIMESTAMPTZ;
BEGIN
  -- Si el sprint está activo, usar estado actual
  IF sprint_state = 'active' THEN
    RETURN COALESCE(current_status, 'N/A');
  END IF;
  
  -- Determinar fecha de "foto"
  IF sprint_complete_date IS NOT NULL THEN
    sprint_foto_date := sprint_complete_date;
  ELSIF sprint_state = 'closed' AND sprint_end_date IS NOT NULL THEN
    sprint_foto_date := sprint_end_date;
  ELSIF sprint_end_date IS NOT NULL AND sprint_end_date < NOW() THEN
    sprint_foto_date := sprint_end_date;
  ELSE
    -- Sprint activo o sin fecha, usar estado actual
    RETURN COALESCE(current_status, 'N/A');
  END IF;
  
  -- Si hay estado al cierre del sprint, usarlo
  IF status_at_sprint_close IS NOT NULL AND status_at_sprint_close != '' THEN
    RETURN status_at_sprint_close;
  END IF;
  
  -- Fallback: estado actual
  RETURN COALESCE(current_status, 'N/A (Sin Foto)');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCIÓN 3: Obtener SP Iniciales del Sprint
-- =====================================================
CREATE OR REPLACE FUNCTION get_initial_sp_for_sprint(
  story_points_at_start INTEGER,
  current_story_points INTEGER,
  issue_created_date TIMESTAMPTZ,
  sprint_start_date DATE
)
RETURNS INTEGER AS $$
BEGIN
  -- Si hay SP inicial guardado, usarlo
  IF story_points_at_start IS NOT NULL THEN
    RETURN story_points_at_start;
  END IF;
  
  -- Si el ticket fue creado después del inicio del sprint: 0 SP
  IF issue_created_date IS NOT NULL AND sprint_start_date IS NOT NULL THEN
    IF issue_created_date::DATE > sprint_start_date THEN
      RETURN 0;
    END IF;
  END IF;
  
  -- Fallback: usar SP actual (para tickets antiguos)
  RETURN COALESCE(current_story_points, 0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- FUNCIÓN 4: Calcular Métricas de Sprint
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_sprint_metrics(p_sprint_id UUID)
RETURNS VOID AS $$
DECLARE
  v_sprint RECORD;
  v_issue_sprint RECORD;
  v_status TEXT;
  v_mapped_status TEXT;
  v_total_sp INTEGER := 0;
  v_completed_sp INTEGER := 0;
  v_total_tickets INTEGER := 0;
  v_completed_tickets INTEGER := 0;
  v_impediments INTEGER := 0;
  v_lead_time_sum DECIMAL := 0;
  v_lead_time_count INTEGER := 0;
  v_tickets_with_sp INTEGER := 0;
  v_tickets_no_sp INTEGER := 0;
  v_status_counts JSONB := '{}'::JSONB;
  v_avg_lead_time DECIMAL;
BEGIN
  -- Obtener datos del sprint
  SELECT * INTO v_sprint
  FROM sprints
  WHERE id = p_sprint_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sprint % no encontrado', p_sprint_id;
  END IF;
  
  -- Inicializar contadores de estado
  v_status_counts := jsonb_build_object(
    'To Do', 0,
    'Reopen', 0,
    'In Progress', 0,
    'QA', 0,
    'Blocked', 0,
    'Done', 0
  );
  
  -- Procesar cada issue del sprint
  FOR v_issue_sprint IN
    SELECT 
      is_rel.*,
      i.current_status,
      i.current_story_points,
      i.dev_start_date,
      i.dev_close_date,
      i.created_date
    FROM issue_sprints is_rel
    JOIN issues i ON is_rel.issue_id = i.id
    WHERE is_rel.sprint_id = p_sprint_id
  LOOP
    v_total_tickets := v_total_tickets + 1;
    
    -- Obtener estado histórico
    v_status := get_historical_status_for_sprint(
      v_issue_sprint.current_status,
      v_issue_sprint.status_at_sprint_close,
      v_sprint.state,
      v_sprint.complete_date,
      v_sprint.end_date
    );
    
    -- Mapear estado
    v_mapped_status := map_to_target_status(v_status);
    
    -- Incrementar contador de estado
    v_status_counts := jsonb_set(
      v_status_counts,
      ARRAY[v_mapped_status],
      to_jsonb((v_status_counts->>v_mapped_status)::INTEGER + 1)
    );
    
    -- Story Points
    v_total_sp := v_total_sp + COALESCE(v_issue_sprint.current_story_points, 0);
    
    IF COALESCE(v_issue_sprint.current_story_points, 0) > 0 THEN
      v_tickets_with_sp := v_tickets_with_sp + 1;
    ELSE
      v_tickets_no_sp := v_tickets_no_sp + 1;
    END IF;
    
    -- Métricas de completación
    IF v_mapped_status = 'Done' THEN
      v_completed_sp := v_completed_sp + COALESCE(v_issue_sprint.current_story_points, 0);
      v_completed_tickets := v_completed_tickets + 1;
    END IF;
    
    -- Impedimentos
    IF v_mapped_status = 'Blocked' THEN
      v_impediments := v_impediments + 1;
    END IF;
    
    -- Lead Time
    IF v_issue_sprint.dev_start_date IS NOT NULL AND 
       v_issue_sprint.dev_close_date IS NOT NULL AND
       v_mapped_status = 'Done' THEN
      v_lead_time_sum := v_lead_time_sum + 
        EXTRACT(EPOCH FROM (v_issue_sprint.dev_close_date - v_issue_sprint.dev_start_date)) / 86400;
      v_lead_time_count := v_lead_time_count + 1;
    END IF;
  END LOOP;
  
  -- Calcular promedio de lead time
  IF v_lead_time_count > 0 THEN
    v_avg_lead_time := v_lead_time_sum / v_lead_time_count;
  ELSE
    v_avg_lead_time := NULL;
  END IF;
  
  -- Guardar métricas
  INSERT INTO sprint_metrics (
    sprint_id,
    calculated_at,
    total_story_points,
    completed_story_points,
    carryover_story_points,
    total_tickets,
    completed_tickets,
    pending_tickets,
    impediments,
    avg_lead_time_days,
    completion_percentage,
    tickets_to_do,
    tickets_in_progress,
    tickets_qa,
    tickets_blocked,
    tickets_done,
    tickets_reopen,
    tickets_with_sp,
    tickets_no_sp
  ) VALUES (
    p_sprint_id,
    NOW(),
    v_total_sp,
    v_completed_sp,
    v_total_sp - v_completed_sp,
    v_total_tickets,
    v_completed_tickets,
    v_total_tickets - v_completed_tickets,
    v_impediments,
    v_avg_lead_time,
    CASE WHEN v_total_tickets > 0 THEN (v_completed_tickets::DECIMAL / v_total_tickets * 100) ELSE 0 END,
    (v_status_counts->>'To Do')::INTEGER,
    (v_status_counts->>'In Progress')::INTEGER,
    (v_status_counts->>'QA')::INTEGER,
    (v_status_counts->>'Blocked')::INTEGER,
    (v_status_counts->>'Done')::INTEGER,
    (v_status_counts->>'Reopen')::INTEGER,
    v_tickets_with_sp,
    v_tickets_no_sp
  )
  ON CONFLICT (sprint_id, calculated_at) 
  DO UPDATE SET
    total_story_points = EXCLUDED.total_story_points,
    completed_story_points = EXCLUDED.completed_story_points,
    carryover_story_points = EXCLUDED.carryover_story_points,
    total_tickets = EXCLUDED.total_tickets,
    completed_tickets = EXCLUDED.completed_tickets,
    pending_tickets = EXCLUDED.pending_tickets,
    impediments = EXCLUDED.impediments,
    avg_lead_time_days = EXCLUDED.avg_lead_time_days,
    completion_percentage = EXCLUDED.completion_percentage,
    tickets_to_do = EXCLUDED.tickets_to_do,
    tickets_in_progress = EXCLUDED.tickets_in_progress,
    tickets_qa = EXCLUDED.tickets_qa,
    tickets_blocked = EXCLUDED.tickets_blocked,
    tickets_done = EXCLUDED.tickets_done,
    tickets_reopen = EXCLUDED.tickets_reopen,
    tickets_with_sp = EXCLUDED.tickets_with_sp,
    tickets_no_sp = EXCLUDED.tickets_no_sp;
    
  RAISE NOTICE 'Métricas calculadas para sprint %: % tickets, % SP total, % SP completados', 
    p_sprint_id, v_total_tickets, v_total_sp, v_completed_sp;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN 5: Calcular Métricas de Desarrollador por Sprint
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_developer_sprint_metrics(
  p_developer_id UUID,
  p_sprint_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_sprint RECORD;
  v_issue_sprint RECORD;
  v_status TEXT;
  v_mapped_status TEXT;
  v_workload INTEGER := 0;
  v_velocity INTEGER := 0;
  v_tickets_assigned INTEGER := 0;
  v_tickets_completed INTEGER := 0;
  v_lead_time_sum DECIMAL := 0;
  v_lead_time_count INTEGER := 0;
  v_status_counts JSONB := '{}'::JSONB;
  v_avg_lead_time DECIMAL;
BEGIN
  -- Obtener datos del sprint
  SELECT * INTO v_sprint
  FROM sprints
  WHERE id = p_sprint_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sprint % no encontrado', p_sprint_id;
  END IF;
  
  -- Inicializar contadores
  v_status_counts := jsonb_build_object(
    'To Do', 0,
    'Reopen', 0,
    'In Progress', 0,
    'QA', 0,
    'Blocked', 0,
    'Done', 0
  );
  
  -- Procesar issues del desarrollador en este sprint
  FOR v_issue_sprint IN
    SELECT 
      is_rel.*,
      i.current_status,
      i.current_story_points,
      i.dev_start_date,
      i.dev_close_date,
      i.created_date
    FROM issue_sprints is_rel
    JOIN issues i ON is_rel.issue_id = i.id
    WHERE is_rel.sprint_id = p_sprint_id
      AND i.assignee_id = p_developer_id
  LOOP
    v_tickets_assigned := v_tickets_assigned + 1;
    
    -- Obtener estado histórico
    v_status := get_historical_status_for_sprint(
      v_issue_sprint.current_status,
      v_issue_sprint.status_at_sprint_close,
      v_sprint.state,
      v_sprint.complete_date,
      v_sprint.end_date
    );
    
    -- Mapear estado
    v_mapped_status := map_to_target_status(v_status);
    
    -- Incrementar contador de estado
    v_status_counts := jsonb_set(
      v_status_counts,
      ARRAY[v_mapped_status],
      to_jsonb((v_status_counts->>v_mapped_status)::INTEGER + 1)
    );
    
    -- Workload (SP inicial)
    v_workload := v_workload + get_initial_sp_for_sprint(
      v_issue_sprint.story_points_at_start,
      v_issue_sprint.current_story_points,
      v_issue_sprint.created_date,
      v_sprint.start_date
    );
    
    -- Velocity (SP completados)
    IF v_mapped_status = 'Done' THEN
      v_velocity := v_velocity + COALESCE(v_issue_sprint.current_story_points, 0);
      v_tickets_completed := v_tickets_completed + 1;
      
      -- Lead Time
      IF v_issue_sprint.dev_start_date IS NOT NULL AND 
         v_issue_sprint.dev_close_date IS NOT NULL THEN
        v_lead_time_sum := v_lead_time_sum + 
          EXTRACT(EPOCH FROM (v_issue_sprint.dev_close_date - v_issue_sprint.dev_start_date)) / 86400;
        v_lead_time_count := v_lead_time_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Calcular promedio de lead time
  IF v_lead_time_count > 0 THEN
    v_avg_lead_time := v_lead_time_sum / v_lead_time_count;
  ELSE
    v_avg_lead_time := NULL;
  END IF;
  
  -- Guardar métricas
  INSERT INTO developer_sprint_metrics (
    developer_id,
    sprint_id,
    calculated_at,
    workload_sp,
    velocity_sp,
    carryover_sp,
    tickets_assigned,
    tickets_completed,
    avg_lead_time_days,
    tickets_to_do,
    tickets_in_progress,
    tickets_qa,
    tickets_blocked,
    tickets_done,
    tickets_reopen
  ) VALUES (
    p_developer_id,
    p_sprint_id,
    NOW(),
    v_workload,
    v_velocity,
    v_workload - v_velocity,
    v_tickets_assigned,
    v_tickets_completed,
    v_avg_lead_time,
    (v_status_counts->>'To Do')::INTEGER,
    (v_status_counts->>'In Progress')::INTEGER,
    (v_status_counts->>'QA')::INTEGER,
    (v_status_counts->>'Blocked')::INTEGER,
    (v_status_counts->>'Done')::INTEGER,
    (v_status_counts->>'Reopen')::INTEGER
  )
  ON CONFLICT (developer_id, sprint_id, calculated_at)
  DO UPDATE SET
    workload_sp = EXCLUDED.workload_sp,
    velocity_sp = EXCLUDED.velocity_sp,
    carryover_sp = EXCLUDED.carryover_sp,
    tickets_assigned = EXCLUDED.tickets_assigned,
    tickets_completed = EXCLUDED.tickets_completed,
    avg_lead_time_days = EXCLUDED.avg_lead_time_days,
    tickets_to_do = EXCLUDED.tickets_to_do,
    tickets_in_progress = EXCLUDED.tickets_in_progress,
    tickets_qa = EXCLUDED.tickets_qa,
    tickets_blocked = EXCLUDED.tickets_blocked,
    tickets_done = EXCLUDED.tickets_done,
    tickets_reopen = EXCLUDED.tickets_reopen;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN 6: Calcular Todas las Métricas de un Proyecto
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_all_metrics(p_project_key TEXT)
RETURNS TABLE(
  sprints_processed INTEGER,
  developers_processed INTEGER,
  metrics_calculated INTEGER
) AS $$
DECLARE
  v_project_id UUID;
  v_sprint RECORD;
  v_developer RECORD;
  v_sprint_count INTEGER := 0;
  v_dev_count INTEGER := 0;
  v_metrics_count INTEGER := 0;
BEGIN
  -- Obtener proyecto
  SELECT id INTO v_project_id
  FROM projects
  WHERE project_key = UPPER(p_project_key);
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Proyecto % no encontrado', p_project_key;
  END IF;
  
  -- Calcular métricas para cada sprint
  FOR v_sprint IN
    SELECT id FROM sprints WHERE project_id = v_project_id
  LOOP
    PERFORM calculate_sprint_metrics(v_sprint.id);
    v_sprint_count := v_sprint_count + 1;
    
    -- Calcular métricas por desarrollador para este sprint
    FOR v_developer IN
      SELECT DISTINCT i.assignee_id
      FROM issue_sprints is_rel
      JOIN issues i ON is_rel.issue_id = i.id
      WHERE is_rel.sprint_id = v_sprint.id
        AND i.assignee_id IS NOT NULL
    LOOP
      PERFORM calculate_developer_sprint_metrics(v_developer.assignee_id, v_sprint.id);
      v_dev_count := v_dev_count + 1;
    END LOOP;
  END LOOP;
  
  v_metrics_count := v_sprint_count + v_dev_count;
  
  RETURN QUERY SELECT v_sprint_count, v_dev_count, v_metrics_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION map_to_target_status IS 
'Mapea estados de Jira a estados objetivo normalizados (To Do, In Progress, QA, Blocked, Done, Reopen)';

COMMENT ON FUNCTION get_historical_status_for_sprint IS 
'Obtiene el estado histórico de un ticket para un sprint específico, considerando si el sprint está activo o cerrado';

COMMENT ON FUNCTION get_initial_sp_for_sprint IS 
'Obtiene los Story Points iniciales de un ticket para un sprint, considerando si fue creado después del inicio del sprint';

COMMENT ON FUNCTION calculate_sprint_metrics IS 
'Calcula y guarda todas las métricas analíticas de un sprint';

COMMENT ON FUNCTION calculate_developer_sprint_metrics IS 
'Calcula y guarda las métricas analíticas de un desarrollador para un sprint específico';

COMMENT ON FUNCTION calculate_all_metrics IS 
'Calcula todas las métricas (sprint y desarrollador) para un proyecto completo';


