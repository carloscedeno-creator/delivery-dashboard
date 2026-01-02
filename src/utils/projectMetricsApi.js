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
    console.error('[PROJECT_METRICS] Error getting squads:', error);
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
    console.error('[PROJECT_METRICS] Error getting sprints:', error);
    throw error;
  }
};

/**
 * Gets issue metrics by squad and sprint
 * Groups by Board State (current_status) without filtering by developer
 */
export const getProjectMetricsData = async (squadId, sprintId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    console.log(`[PROJECT_METRICS] Getting metrics for squad: ${squadId}, sprint: ${sprintId}`);

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

    // Obtener el nombre del sprint si está seleccionado para filtrar por current_sprint
    let sprintName = null;
    if (sprintId) {
      const { data: sprint, error: sprintError } = await supabase
        .from('sprints')
        .select('sprint_name')
        .eq('id', sprintId)
        .single();

      if (sprintError) throw sprintError;
      sprintName = sprint?.sprint_name;
      
      if (!sprintName) {
        // Si no se encuentra el sprint, retornar datos vacíos
        return {
          tickets: [],
          statusBreakdown: {},
          statusData: [],
          totalTickets: 0,
          totalSP: 0
        };
      }
    }

    // Construir query base (incluyendo status_by_sprint para calcular completados durante el sprint)
    let query = supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_status,
        current_story_points,
        current_sprint,
        status_by_sprint,
        initiative_id,
        initiatives(
          id,
          initiative_name,
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

    // Filtrar por current_sprint (métrica real que define si está en el sprint seleccionado)
    if (sprintName) {
      query = query.eq('current_sprint', sprintName);
    }

    const { data: issues, error } = await query;

    if (error) throw error;

    console.log(`[PROJECT_METRICS] Issues encontrados: ${(issues || []).length}`);

    // Función para determinar si un estado es "Dev Done"
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

    // Agrupar por Board State (current_status) con normalización
    const statusBreakdown = {};
    let totalSP = 0;
    let completedSP = 0; // SP de tickets completados

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
      
      // Calcular SP completados
      if (isDevDone(status)) {
        completedSP += sp;
      }
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

    // Calcular métricas de épicas/iniciativas
    const epicMetrics = await calculateEpicMetrics(issues || [], sprintName, squadId);

    return {
      tickets: issues || [],
      statusBreakdown: statusBreakdown,
      statusData: statusData,
      totalTickets: totalTickets,
      totalSP: totalSP,
      completedSP: completedSP, // SP completados
      epicMetrics: epicMetrics // Métricas por épica
    };
  } catch (error) {
    console.error('[PROJECT_METRICS] Error getting metrics:', error);
    throw error;
  }
};

/**
 * Calcula métricas por épica/iniciativa
 * IMPORTANTE: Para lifetime, necesitamos TODOS los tickets de la épica, no solo los del sprint
 */
async function calculateEpicMetrics(issues, sprintName, squadId) {
  if (!issues || issues.length === 0) return [];

  // Función para determinar si un estado es "Dev Done"
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

  // Obtener todas las iniciativas del squad para calcular lifetime
  let allEpicIssues = [];
  if (squadId) {
    try {
      const { data: initiatives, error: initiativesError } = await supabase
        .from('initiatives')
        .select('id')
        .eq('squad_id', squadId);

      if (!initiativesError && initiatives && initiatives.length > 0) {
        const initiativeIds = initiatives.map(i => i.id);
        
        // Obtener TODOS los issues de estas iniciativas (lifetime) - sin filtrar por sprint
        const { data: allIssues, error: allIssuesError } = await supabase
          .from('issues')
          .select(`
            id,
            initiative_id,
            current_status,
            current_story_points,
            current_sprint,
            status_by_sprint,
            initiatives(
              id,
              initiative_name
            )
          `)
          .in('initiative_id', initiativeIds);

        if (!allIssuesError) {
          allEpicIssues = allIssues || [];
        }
      }
    } catch (error) {
      console.error('[PROJECT_METRICS] Error getting issues lifetime:', error);
      // Continuar con solo los issues del sprint si falla
    }
  }

  // Agrupar issues por iniciativa para lifetime
  const epicMap = new Map();

  // Identify epics that have tickets in the selected sprint
  const epicIdsInSprint = new Set(issues.map(i => i.initiative_id).filter(Boolean));
  
  // Primero, procesar todos los issues (lifetime) - solo épicas que tienen tickets en el sprint
  // Para evitar mostrar épicas que no tienen trabajo en el sprint
  allEpicIssues.forEach(issue => {
    const epicId = issue.initiative_id;
    // Only process epics that have tickets in the selected sprint
    if (!epicId || !epicIdsInSprint.has(epicId)) return;
    
    const epicName = issue.initiatives?.initiative_name || 'Sin Iniciativa';
    
    if (!epicMap.has(epicId)) {
      epicMap.set(epicId, {
        epicId: epicId,
        epicName: epicName,
        totalTickets: 0,
        completedTicketsLifetime: 0,
        completedTicketsInSprint: 0,
        remainingTicketsInSprint: 0,
        totalSP: 0,
        completedSPLifetime: 0,
        completedSPInSprint: 0
      });
    }

    const epic = epicMap.get(epicId);
    const sp = issue.current_story_points || 0;
    const currentStatus = issue.current_status || 'Unknown';
    const isCompleted = isDevDone(currentStatus);
    
    // Métricas lifetime (todos los tickets de la épica)
    epic.totalTickets++;
    epic.totalSP += sp;
    if (isCompleted) {
      epic.completedTicketsLifetime++;
      epic.completedSPLifetime += sp;
    }
  });

  // Ahora, procesar solo los issues del sprint para métricas del sprint
  issues.forEach(issue => {
    const epicId = issue.initiative_id;
    if (!epicId) return; // Skip si no tiene iniciativa
    
    let epic = epicMap.get(epicId);
    if (!epic) {
      // Si la épica no está en el mapa (no se encontraron issues lifetime), 
      // crear entrada solo con datos del sprint (usar los issues del sprint como total)
      const epicName = issue.initiatives?.initiative_name || 'Sin Iniciativa';
      epicMap.set(epicId, {
        epicId: epicId,
        epicName: epicName,
        totalTickets: 0, // Se calculará después
        completedTicketsLifetime: 0,
        completedTicketsInSprint: 0,
        remainingTicketsInSprint: 0,
        totalSP: 0,
        completedSPLifetime: 0,
        completedSPInSprint: 0
      });
      epic = epicMap.get(epicId);
    }
    
    const sp = issue.current_story_points || 0;
    const currentStatus = issue.current_status || 'Unknown';
    const isCompleted = isDevDone(currentStatus);

    // Sprint metrics (only if sprint is selected and ticket is in sprint)
    if (sprintName && issue.current_sprint === sprintName) {
      // Verificar si se completó durante este sprint usando status_by_sprint
      const statusBySprint = issue.status_by_sprint || {};
      const sprintStatus = statusBySprint[sprintName];
      const wasCompletedInSprint = sprintStatus && isDevDone(sprintStatus);
      
      // Si el ticket está en el sprint y se completó durante el sprint
      if (isCompleted && wasCompletedInSprint) {
        epic.completedTicketsInSprint++;
        epic.completedSPInSprint += sp;
      } else if (!isCompleted) {
        // Si está en el sprint pero no se completó
        epic.remainingTicketsInSprint++;
      }
    }
  });
  
  // Para épicas que no tienen datos lifetime, usar los datos del sprint como total
  epicMap.forEach((epic, epicId) => {
    if (epic.totalTickets === 0) {
      // Si no hay datos lifetime, usar los del sprint como total
      epic.totalTickets = epic.completedTicketsInSprint + epic.remainingTicketsInSprint;
      epic.totalSP = epic.completedSPInSprint;
      epic.completedTicketsLifetime = epic.completedTicketsInSprint;
      epic.completedSPLifetime = epic.completedSPInSprint;
    }
  });

  // Convertir a array y calcular porcentajes
  return Array.from(epicMap.values())
    .filter(epic => epic.totalTickets > 0) // Solo épicas con tickets
    .map(epic => {
      const lifetimeCompletion = epic.totalTickets > 0 
        ? (epic.completedTicketsLifetime / epic.totalTickets) * 100 
        : 0;
      
      const sprintCompletion = epic.totalTickets > 0
        ? (epic.completedTicketsInSprint / epic.totalTickets) * 100
        : 0;

      return {
        ...epic,
        lifetimeCompletionPercentage: Math.round(lifetimeCompletion * 10) / 10,
        sprintCompletionPercentage: Math.round(sprintCompletion * 10) / 10
      };
    })
    .sort((a, b) => b.totalTickets - a.totalTickets); // Ordenar por total de tickets
}

/**
 * Obtiene información del squad
 */
export const getSquadById = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
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
    console.error('[PROJECT_METRICS] Error getting squad:', error);
    throw error;
  }
};

/**
 * Obtiene información del sprint
 */
export const getSprintById = async (sprintId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
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
    console.error('[PROJECT_METRICS] Error getting sprint:', error);
    throw error;
  }
};

