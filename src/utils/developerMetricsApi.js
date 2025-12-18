/**
 * API para obtener métricas de desarrolladores desde Supabase
 * Específico para el board de Developer Metrics
 */

import { supabase } from './supabaseApi';

/**
 * Obtiene todos los squads disponibles
 */
export const getSquads = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    const { data, error } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .order('squad_name', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error obteniendo squads:', error);
    throw error;
  }
};

/**
 * Obtiene sprints para un squad específico
 */
export const getSprintsForSquad = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date, squad_id')
      .eq('squad_id', squadId)
      .order('start_date', { ascending: false });

    if (error) throw error;
    
    // Determinar sprint actual (el más reciente que no ha terminado)
    const now = new Date();
    const sprintsWithCurrent = (data || []).map(sprint => {
      const endDate = sprint.end_date ? new Date(sprint.end_date) : null;
      const isActive = endDate ? endDate >= now : false;
      return { ...sprint, is_active: isActive };
    });
    
    return sprintsWithCurrent;
  } catch (error) {
    console.error('[DEVELOPER_METRICS] Error obteniendo sprints:', error);
    throw error;
  }
};

/**
 * Obtiene desarrolladores para un squad específico
 */
export const getDevelopersForSquad = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
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
    console.error('[DEVELOPER_METRICS] Error obteniendo developers:', error);
    throw error;
  }
};

/**
 * Obtiene métricas de un desarrollador específico
 * @param {number} developerId - ID del desarrollador
 * @param {number} squadId - ID del squad (opcional)
 * @param {number} sprintId - ID del sprint (opcional)
 */
export const getDeveloperMetricsData = async (developerId, squadId = null, sprintId = null) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    // Primero obtener los issue_ids del sprint si se especifica
    let issueIds = null;
    if (sprintId) {
      const { data: sprintIssues, error: sprintIssuesError } = await supabase
        .from('issue_sprints')
        .select('issue_id')
        .eq('sprint_id', sprintId);

      if (sprintIssuesError) throw sprintIssuesError;

      issueIds = (sprintIssues || []).map(si => si.issue_id);
      if (issueIds.length === 0) {
        // Si no hay issues en el sprint, retornar array vacío
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

    // Construir query base
    let query = supabase
      .from('issues')
      .select(`
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
      `)
      .eq('assignee_id', developerId);

    // Filtrar por sprint si se especifica
    if (issueIds) {
      query = query.in('id', issueIds);
    }

    const { data: issues, error } = await query;
    if (error) throw error;

    // Filtrar por squad si se especifica (después de obtener los datos)
    let filteredIssues = issues || [];
    if (squadId) {
      filteredIssues = filteredIssues.filter(issue => {
        return issue.initiatives?.squad_id === squadId;
      });
    }

    // Calcular métricas
    const tickets = filteredIssues.map(issue => ({
      id: issue.id,
      key: issue.issue_key,
      summary: issue.summary,
      status: issue.current_status,
      storyPoints: issue.current_story_points || 0,
      hasSP: (issue.current_story_points || 0) > 0,
      squad: issue.initiatives?.squads?.squad_name || 'Unknown'
    }));

    // Estados considerados como "Dev Done"
    // Basado en devPerformanceService.js
    const isDevDone = (status) => {
      if (!status) return false;
      const statusUpper = status.trim().toUpperCase();
      return statusUpper === 'DONE' || 
             statusUpper === 'DEVELOPMENT DONE' ||
             statusUpper.includes('DEVELOPMENT DONE') ||
             statusUpper.includes('DEV DONE') ||
             (statusUpper.includes('DONE') && !statusUpper.includes('TO DO') && !statusUpper.includes('TODO')) ||
             statusUpper === 'CLOSED' ||
             statusUpper === 'RESOLVED' ||
             statusUpper === 'COMPLETED';
    };

    const totalTickets = tickets.length;
    const withSP = tickets.filter(t => t.hasSP).length;
    const noSP = tickets.filter(t => !t.hasSP).length;
    const totalSP = tickets.reduce((sum, t) => sum + t.storyPoints, 0);
    const devDone = tickets.filter(t => isDevDone(t.status)).length;
    const devDoneSP = tickets
      .filter(t => isDevDone(t.status) && t.hasSP)
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
    console.error('[DEVELOPER_METRICS] Error obteniendo métricas:', error);
    throw error;
  }
};

/**
 * Obtiene información de un desarrollador por ID
 */
export const getDeveloperById = async (developerId) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
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
    console.error('[DEVELOPER_METRICS] Error obteniendo developer:', error);
    throw error;
  }
};

