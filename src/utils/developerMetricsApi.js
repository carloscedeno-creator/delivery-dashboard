/**
 * API para obtener métricas de desarrolladores desde Supabase
 * Específico para el board de Developer Metrics
 */

import { supabase } from './supabaseApi';
import { isDevDoneStatusSync } from './statusHelper.js';
import { filterRecentSprints } from './sprintFilterHelper.js';

/**
 * Obtiene todos los squads disponibles
 */
export const getSquads = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .order('squad_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error getting squads:', error);
    throw error;
  }
};

/**
 * Obtiene sprints para un squad específico
 */
export const getSprintsForSquad = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date, complete_date, state, squad_id, created_at')
      .eq('squad_id', squadId)
      .ilike('sprint_name', '%Sprint%')
      .order('start_date', { ascending: false });

    if (error) throw error;
    
    // Filtrar para mantener solo últimos 10 cerrados + activos (NO futuros)
    const filteredSprints = filterRecentSprints(data || [], squadId);
    
    // Determinar sprint actual (active state o el más reciente que no ha terminado)
    const now = new Date();
    const sprintsWithCurrent = filteredSprints.map(sprint => {
      // Un sprint está activo si:
      // 1. Tiene state === 'active', O
      // 2. No tiene end_date o end_date es en el futuro (y no está cerrado)
      const isActive = sprint.state === 'active' || 
        (sprint.state !== 'closed' && (!sprint.end_date || new Date(sprint.end_date) >= now));
      return { ...sprint, is_active: isActive };
    });
    
    return sprintsWithCurrent;
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error getting sprints:', error);
    throw error;
  }
};

/**
 * Obtiene desarrolladores para un squad específico
 */
export const getDevelopersForSquad = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    // Obtener developers que tienen issues asignados en iniciativas del squad
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('assignee_id')
      .not('assignee_id', 'is', null);

    if (issuesError) throw issuesError;

    const assigneeIds = [...new Set(issues.map(i => i.assignee_id).filter(Boolean))];

    if (assigneeIds.length === 0) return [];

    // Obtener información de los developers
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name, email')
      .in('id', assigneeIds)
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (devsError) throw devsError;

    // Filtrar solo los que tienen issues en iniciativas del squad
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id')
      .eq('squad_id', squadId);

    if (initiativesError) throw initiativesError;

    const initiativeIds = (initiatives || []).map(i => i.id);

    const { data: squadIssues, error: squadIssuesError } = await supabase
      .from('issues')
      .select('assignee_id')
      .in('initiative_id', initiativeIds)
      .not('assignee_id', 'is', null);

    if (squadIssuesError) throw squadIssuesError;

    const squadAssigneeIds = [...new Set(squadIssues.map(i => i.assignee_id).filter(Boolean))];

    return (developers || []).filter(d => squadAssigneeIds.includes(d.id));
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error getting developers:', error);
    throw error;
  }
};

/**
 * Gets metrics for a specific developer
 * @param {string} developerId - UUID del desarrollador
 * @param {string} squadId - UUID del squad (opcional)
 * @param {string} sprintId - UUID del sprint (opcional)
 */
export const getDeveloperMetricsData = async (developerId, squadId = null, sprintId = null) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  if (!developerId) {
    throw new Error('Developer ID is required');
  }

  // Validar que el ID sea un UUID válido (formato básico)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof developerId !== 'string' || !uuidRegex.test(developerId)) {
    console.error('[DEVELOPER_METRICS] ID inválido:', developerId, typeof developerId);
    throw new Error(`ID de desarrollador inválido: ${developerId}. Debe ser un UUID válido.`);
  }

  try {
    // Obtener el nombre del sprint y estado si está seleccionado
    let sprintName = null;
    let sprintCloseDate = null;
    let isSprintClosed = false;
    if (sprintId) {
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .select('sprint_name, end_date, complete_date, state')
        .eq('id', sprintId)
        .single();

      if (sprintError) throw sprintError;
      sprintName = sprint?.sprint_name?.trim();
      sprintCloseDate = sprint?.complete_date || sprint?.end_date || null;
      isSprintClosed = sprint?.state === 'closed' || (sprintCloseDate && new Date(sprintCloseDate) < new Date());
      
      console.log('[DEVELOPER_METRICS] Selected sprint:', {
        sprintId,
        sprintName,
        sprintNameLength: sprintName?.length,
        isSprintClosed,
        sprintCloseDate
      });
      
      if (!sprintName) {
        // Si no se encuentra el sprint, retornar datos vacíos
        return {
          tickets: [],
          metrics: {
            totalTickets: 0,
            withSP: 0,
            noSP: 0,
            totalSP: 0,
            devDone: 0,
            devDoneSP: 0,
            totalSPAssigned: 0,
            devDoneRate: 0,
            spDevDoneRate: 0
          },
          statusBreakdown: {}
        };
      }
    }

    // Para sprints cerrados, usar issue_sprints (sprint snapshot) como fuente de verdad
    let issues = [];
    if (sprintId && sprintName && isSprintClosed) {
      // Estrategia 1: Usar issue_sprints para sprints cerrados
      const { data: issueSprints, error: issueSprintsError } = await supabase
        .from('issue_sprints')
        .select(`
          issue_id,
          status_at_sprint_close,
          story_points_at_close,
          issues!inner(
            id,
            issue_key,
            summary,
            current_status,
            current_story_points,
            assignee_id,
            initiative_id,
            initiatives(
              id,
              squad_id,
              squads(
                id,
                squad_key,
                squad_name
              )
            )
          )
        `)
        .eq('sprint_id', sprintId)
        .eq('issues.assignee_id', developerId)
        .not('status_at_sprint_close', 'is', null); // Solo tickets que estaban en el sprint al cierre

      if (!issueSprintsError && issueSprints && issueSprints.length > 0) {
        // Extraer issues y mapear status_at_sprint_close y story_points_at_close
        issues = issueSprints.map(is => {
          const issue = is.issues;
          if (issue) {
            // Para sprints cerrados, usar status_at_sprint_close y story_points_at_close
            return {
              ...issue,
              status_at_sprint_close: is.status_at_sprint_close,
              story_points_at_close: is.story_points_at_close
            };
          }
          return null;
        }).filter(Boolean);

        // Filtrar por squad si se especifica
        if (squadId) {
          issues = issues.filter(issue => {
            return issue.initiatives?.squad_id === squadId;
          });
        }

        console.log(`[DEVELOPER_METRICS] Issues encontrados via issue_sprints (sprint cerrado): ${issues.length}`);
      }
    }

    // Estrategia 2: Para sprints activos o si no hay resultados, usar current_sprint
    if (issues.length === 0) {
      let query = supabase
        .from('issues')
        .select(`
          id,
          issue_key,
          summary,
          current_status,
          current_story_points,
          current_sprint,
          assignee_id,
          initiative_id,
          initiatives(
            id,
            squad_id,
            squads(
              id,
              squad_key,
              squad_name
            )
          )
        `)
        .eq('assignee_id', developerId);

      // Filtrar por current_sprint para sprints activos
      if (sprintName && !isSprintClosed) {
        const trimmedSprintName = sprintName.trim();
        query = query.eq('current_sprint', trimmedSprintName);
      }

      const { data: queryIssues, error } = await query;
      if (error) {
        console.error('[DEVELOPER_METRICS] Error en query:', error);
        throw error;
      }
      
      issues = queryIssues || [];

      // Filtrar por squad si se especifica
      if (squadId) {
        issues = issues.filter(issue => {
          return issue.initiatives?.squad_id === squadId;
        });
      }

      console.log(`[DEVELOPER_METRICS] Issues encontrados via current_sprint: ${issues.length}`);
    }

    // Calcular métricas usando el estado correcto según si el sprint está cerrado o no
    const tickets = issues.map(issue => {
      // Para sprints cerrados, usar status_at_sprint_close y story_points_at_close
      // Para sprints activos, usar current_status y current_story_points
      const status = isSprintClosed && issue.status_at_sprint_close 
        ? issue.status_at_sprint_close 
        : issue.current_status;
      const storyPoints = isSprintClosed && issue.story_points_at_close !== null && issue.story_points_at_close !== undefined
        ? issue.story_points_at_close
        : (issue.current_story_points || 0);

      return {
        id: issue.id,
        key: issue.issue_key,
        summary: issue.summary,
        status: status,
        storyPoints: storyPoints,
        hasSP: storyPoints > 0,
        squad: issue.initiatives?.squads?.squad_name || 'Unknown'
      };
    });

    // Usar helper centralizado para consistencia en todos los módulos
    // Reemplazado función isDevDone local con statusHelper.js

    const totalTickets = tickets.length;
    const withSP = tickets.filter(t => t.hasSP).length;
    const noSP = tickets.filter(t => !t.hasSP).length;
    const totalSP = tickets.reduce((sum, t) => sum + t.storyPoints, 0);
    const devDone = tickets.filter(t => isDevDoneStatusSync(t.status)).length;
    const devDoneSP = tickets
      .filter(t => isDevDoneStatusSync(t.status) && t.hasSP)
      .reduce((sum, t) => sum + t.storyPoints, 0);
    const totalSPAssigned = tickets
      .filter(t => t.hasSP)
      .reduce((sum, t) => sum + t.storyPoints, 0);

    // Breakdown por status
    const statusBreakdown = {};
    tickets.forEach(ticket => {
      const status = ticket.status || 'Unknown';
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = { count: 0, percentage: 0 };
      }
      statusBreakdown[status].count++;
    });

    // Calcular porcentajes
    Object.keys(statusBreakdown).forEach(status => {
      statusBreakdown[status].percentage = totalTickets > 0 
        ? Math.round((statusBreakdown[status].count / totalTickets) * 100) 
        : 0;
    });

    return {
      tickets,
      metrics: {
        totalTickets,
        withSP,
        noSP,
        totalSP,
        devDone,
        devDoneSP,
        totalSPAssigned,
        devDoneRate: totalTickets > 0 ? Math.round((devDone / totalTickets) * 100) : 0,
        spDevDoneRate: totalSPAssigned > 0 ? Math.round((devDoneSP / totalSPAssigned) * 100) : 0
      },
      statusBreakdown
    };
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error getting metrics:', error);
    throw error;
  }
};

/**
 * Obtiene información de un desarrollador por ID
 * @param {string} developerId - UUID del desarrollador
 */
export const getDeveloperById = async (developerId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  if (!developerId) {
    throw new Error('Developer ID is required');
  }

  // Validar que el ID sea un UUID válido (formato básico)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof developerId !== 'string' || !uuidRegex.test(developerId)) {
    console.error('[DEVELOPER_METRICS] ID inválido:', developerId, typeof developerId);
    throw new Error(`ID de desarrollador inválido: ${developerId}. Debe ser un UUID válido.`);
  }

  try {
    const { data, error } = await supabase
      .from('developers')
      .select('id, display_name, email')
      .eq('id', developerId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error getting developer:', error);
    throw error;
  }
};

