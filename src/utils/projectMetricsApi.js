/**
 * API para obtener métricas de proyectos por squad y sprint desde Supabase
 * Agrupa issues por Board State (current_status) sin filtrar por developer
 */

import { supabase } from './supabaseApi';

/**
 * Normaliza el nombre del estado para agrupar correctamente
 * Convierte variaciones a formato estándar en mayúsculas
 */
function normalizeStatus(status) {
  if (!status || status === 'Unknown') return 'Unknown';
  
  // Mapeo de estados comunes a su formato estándar
  const statusMap = {
    'to do': 'TO DO',
    'todo': 'TO DO',
    'to-do': 'TO DO',
    'in progress': 'IN PROGRESS',
    'in-progress': 'IN PROGRESS',
    'en progreso': 'IN PROGRESS',
    'done': 'DONE',
    'testing': 'TESTING',
    'test': 'TESTING',
    'blocked': 'BLOCKED',
    'security review': 'SECURITY REVIEW',
    'security-review': 'SECURITY REVIEW',
    'reopen': 'REOPEN',
    're-opened': 'REOPEN',
    'compliance check': 'COMPLIANCE CHECK',
    'compliance-check': 'COMPLIANCE CHECK',
    'development done': 'DEVELOPMENT DONE',
    'development-done': 'DEVELOPMENT DONE',
    'qa': 'QA',
    'qa external': 'QA EXTERNAL',
    'qa-external': 'QA EXTERNAL',
    'staging': 'STAGING',
    'ready to release': 'READY TO RELEASE',
    'ready-to-release': 'READY TO RELEASE',
    'in review': 'IN REVIEW',
    'in-review': 'IN REVIEW',
    'open': 'OPEN',
    'hold': 'HOLD',
    'requisitions': 'REQUISITIONS',
  };

  const normalized = status.trim();
  const lowerStatus = normalized.toLowerCase();
  
  // Si está en el mapa, usar el valor mapeado
  if (statusMap[lowerStatus]) {
    return statusMap[lowerStatus];
  }
  
  // Si ya está completamente en mayúsculas, verificar si es un estado válido
  if (normalized === normalized.toUpperCase()) {
    // Estados válidos que ya están en mayúsculas
    const validUpperStates = ['QA', 'BLOCKED', 'DONE', 'TO DO', 'IN PROGRESS', 'TESTING', 
                              'SECURITY REVIEW', 'REOPEN', 'STAGING', 'OPEN', 'HOLD', 
                              'IN REVIEW', 'REQUISITIONS', 'DEVELOPMENT DONE', 'QA EXTERNAL', 
                              'READY TO RELEASE', 'COMPLIANCE CHECK'];
    
    if (validUpperStates.includes(normalized)) {
      return normalized;
    }
  }
  
  // Convertir a mayúsculas por defecto
  return normalized.toUpperCase();
}

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
    console.error('[PROJECT_METRICS] Error obteniendo squads:', error);
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
      return {
        ...sprint,
        is_active: isActive
      };
    });

    return sprintsWithCurrent;
  } catch (error) {
    console.error('[PROJECT_METRICS] Error obteniendo sprints:', error);
    throw error;
  }
};

/**
 * Obtiene métricas de issues por squad y sprint
 * Agrupa por Board State (current_status) sin filtrar por developer
 */
export const getProjectMetricsData = async (squadId, sprintId) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    console.log(`[PROJECT_METRICS] Obteniendo métricas para squad: ${squadId}, sprint: ${sprintId}`);

    // Obtener initiative_ids del squad si está seleccionado
    let initiativeIds = null;
    if (squadId) {
      const { data: initiatives, error: initiativesError } = await supabase
        .from('initiatives')
        .select('id')
        .eq('squad_id', squadId);

      if (initiativesError) throw initiativesError;
      initiativeIds = (initiatives || []).map(i => i.id);
      
      if (initiativeIds.length === 0) {
        // Si no hay iniciativas en el squad, retornar datos vacíos
        return {
          tickets: [],
          statusBreakdown: {},
          statusData: [],
          totalTickets: 0,
          totalSP: 0
        };
      }
    }

    // Obtener issue_ids del sprint si está seleccionado
    let sprintIssueIds = null;
    if (sprintId) {
      const { data: sprintIssues, error: sprintError } = await supabase
        .from('issue_sprints')
        .select('issue_id')
        .eq('sprint_id', sprintId);

      if (sprintError) throw sprintError;
      sprintIssueIds = (sprintIssues || []).map(si => si.issue_id);
      
      if (sprintIssueIds.length === 0) {
        // Si no hay issues en el sprint, retornar datos vacíos
        return {
          tickets: [],
          statusBreakdown: {},
          statusData: [],
          totalTickets: 0,
          totalSP: 0
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
      `);

    // Filtrar por initiatives del squad
    if (initiativeIds) {
      query = query.in('initiative_id', initiativeIds);
    }

    // Filtrar por issues del sprint
    if (sprintIssueIds) {
      query = query.in('id', sprintIssueIds);
    }

    const { data: issues, error } = await query;

    if (error) throw error;

    console.log(`[PROJECT_METRICS] Issues encontrados: ${(issues || []).length}`);

    // Agrupar por Board State (current_status) con normalización
    const statusBreakdown = {};
    let totalSP = 0;

    (issues || []).forEach(issue => {
      const rawStatus = issue.current_status || 'Unknown';
      const status = normalizeStatus(rawStatus);
      
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = {
          name: status,
          count: 0,
          sp: 0
        };
      }
      statusBreakdown[status].count++;
      const sp = issue.current_story_points || 0;
      statusBreakdown[status].sp += sp;
      totalSP += sp;
    });

    // Convertir a array para los gráficos
    const statusData = Object.values(statusBreakdown).map(status => ({
      name: status.name,
      value: status.count,
      sp: status.sp,
      percentage: 0 // Se calculará después
    }));

    // Calcular porcentajes
    const totalTickets = issues?.length || 0;
    statusData.forEach(status => {
      status.percentage = totalTickets > 0 ? (status.value / totalTickets) * 100 : 0;
    });

    // Ordenar por count descendente
    statusData.sort((a, b) => b.value - a.value);

    return {
      tickets: issues || [],
      statusBreakdown: statusBreakdown,
      statusData: statusData,
      totalTickets: totalTickets,
      totalSP: totalSP
    };
  } catch (error) {
    console.error('[PROJECT_METRICS] Error obteniendo métricas:', error);
    throw error;
  }
};

/**
 * Obtiene información del squad
 */
export const getSquadById = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    const { data, error } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .eq('id', squadId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[PROJECT_METRICS] Error obteniendo squad:', error);
    throw error;
  }
};

/**
 * Obtiene información del sprint
 */
export const getSprintById = async (sprintId) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado');
  }

  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date')
      .eq('id', sprintId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('[PROJECT_METRICS] Error obteniendo sprint:', error);
    throw error;
  }
};

