/**
 * API para obtener métricas de proyectos por squad y sprint desde Supabase
 * Agrupa issues por Board State (current_status) sin filtrar por developer
 */

import { supabase } from './supabaseApi';
import { isDevDoneStatusSync } from './statusHelper.js';
import { filterRecentSprints } from './sprintFilterHelper.js';

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

    // Obtener el nombre del sprint y fechas si está seleccionado para filtrar por current_sprint
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
      sprintName = sprint?.sprint_name;
      sprintCloseDate = sprint?.complete_date || sprint?.end_date || null;
      isSprintClosed = sprint?.state === 'closed' || (sprintCloseDate && new Date(sprintCloseDate) < new Date());
      
      // IMPORTANT: Only consider sprints with "Sprint" in the name (exclude "Backlog" and other non-sprint values)
      if (!sprintName || !sprintName.includes('Sprint')) {
        // Si no se encuentra el sprint o no tiene "Sprint" en el nombre, retornar datos vacíos
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

    // Filtrar por sprint usando issue_sprints (sprint snapshot) o status_by_sprint como fallback
    let issues = [];
    if (sprintId && sprintName) {
      // Estrategia 1: Usar issue_sprints para obtener tickets que pertenecían al sprint
      // Esto es la fuente de verdad para sprints cerrados (la "foto" al cierre)
      let issueSprintsQuery = supabase
        .from('issue_sprints')
        .select(`
          issue_id,
          status_at_sprint_close,
          story_points_at_start,
          story_points_at_close,
          issues!inner(
            id,
            issue_key,
            summary,
            current_status,
            current_story_points,
            current_sprint,
            status_by_sprint,
            story_points_by_sprint,
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
          )
        `)
        .eq('sprint_id', sprintId);
      
      // IMPORTANTE: Para sprints cerrados, solo contar tickets que estaban en el sprint al momento del cierre
      // Si status_at_sprint_close es NULL, el ticket fue removido antes del cierre y NO debe contarse
      if (isSprintClosed && sprintCloseDate) {
        issueSprintsQuery = issueSprintsQuery.not('status_at_sprint_close', 'is', null);
      }
      
      const { data: issueSprints, error: issueSprintsError } = await issueSprintsQuery;

      if (!issueSprintsError && issueSprints && issueSprints.length > 0) {
        // Extraer issues y mapear status_at_sprint_close y story_points_at_start
        const issueIds = [];
        const statusMap = new Map();
        const spAtCloseMap = new Map();
        
        issueSprints.forEach(is => {
          if (is.issues && is.issues.id) {
            issueIds.push(is.issues.id);
            if (is.status_at_sprint_close) {
              statusMap.set(is.issues.id, is.status_at_sprint_close);
            } else {
              console.warn(`[PROJECT_METRICS] ⚠️ Issue ${is.issues.issue_key || is.issues.id} has null status_at_sprint_close in issue_sprints`);
            }
            // Para sprints cerrados, usar story_points_at_close (SP al final del sprint)
            if (is.story_points_at_close !== null && is.story_points_at_close !== undefined) {
              spAtCloseMap.set(is.issues.id, is.story_points_at_close);
            }
          }
        });
        
        console.log(`[PROJECT_METRICS] 📊 Mapped ${statusMap.size} issues with status_at_sprint_close from issue_sprints`);

        // Filtrar por initiatives del squad si aplica
        let filteredIssues = issueSprints.map(is => is.issues).filter(Boolean);
        
        if (initiativeIds && initiativeIds.length > 0) {
          filteredIssues = filteredIssues.filter(issue => 
            issue.initiative_id && initiativeIds.includes(issue.initiative_id)
          );
        }

        // Agregar status_at_sprint_close y story_points_at_close a cada issue para uso posterior
        // IMPORTANT: Para sprints cerrados, excluir tickets removidos antes del cierre (status_at_sprint_close es null)
        filteredIssues.forEach(issue => {
          if (statusMap.has(issue.id)) {
            issue.status_at_sprint_close = statusMap.get(issue.id);
          } else {
            console.warn(`[PROJECT_METRICS] ⚠️ Issue ${issue.issue_key || issue.id} has no status_at_sprint_close in statusMap`);
          }
          // Para sprints cerrados, usar story_points_at_close (SP al final del sprint) en lugar de current_story_points
          if (spAtCloseMap.has(issue.id)) {
            issue.story_points_at_close = spAtCloseMap.get(issue.id);
          }
        });
        
        // Log para debug: verificar cuántos issues tienen status_at_sprint_close
        const issuesWithStatus = filteredIssues.filter(issue => issue.status_at_sprint_close).length;
        console.log(`[PROJECT_METRICS] 📊 Issues with status_at_sprint_close: ${issuesWithStatus}/${filteredIssues.length}`);

        // Para sprints cerrados, excluir tickets que fueron removidos antes del cierre
        if (isSprintClosed && sprintCloseDate) {
          filteredIssues = filteredIssues.filter(issue => {
            // Si tiene status_at_sprint_close, estaba en el sprint al cierre
            // Si no tiene pero el sprint está cerrado, fue removido antes del cierre
            return issue.status_at_sprint_close !== null && issue.status_at_sprint_close !== undefined;
          });
          console.log(`[PROJECT_METRICS] Filtered out tickets removed before sprint close. Remaining: ${filteredIssues.length}`);
        }

        issues = filteredIssues;
        console.log(`[PROJECT_METRICS] Issues encontrados via issue_sprints: ${issues.length}${isSprintClosed ? ' (sprint cerrado, usando status_at_sprint_close)' : ''}`);
      }

      // Estrategia 2: Si no hay resultados en issue_sprints, usar status_by_sprint como fallback
      // IMPORTANTE: Para sprints cerrados, NO usar fallback si no hay datos en issue_sprints
      // porque no podemos verificar si los tickets fueron removidos antes del cierre
      if (issues.length === 0) {
        if (isSprintClosed && sprintCloseDate) {
          // Para sprints cerrados, SIEMPRE necesitamos issue_sprints para tener la "foto del cierre"
          // Si no hay datos en issue_sprints, no podemos determinar qué tickets estaban al cierre
          console.warn(`[PROJECT_METRICS] ⚠️ Sprint cerrado sin datos en issue_sprints. No se puede usar fallback porque no podemos verificar tickets removidos.`);
          issues = []; // No usar fallback para sprints cerrados
        } else {
          // Para sprints activos, podemos usar fallback
          console.log(`[PROJECT_METRICS] No issues found via issue_sprints, trying status_by_sprint fallback`);
          
          // Filtrar por current_sprint O por status_by_sprint que contenga el sprint
          query = query.or(`current_sprint.eq.${sprintName},status_by_sprint->>${sprintName}.not.is.null`);
          
          const { data: fallbackIssues, error: fallbackError } = await query;
          
          if (!fallbackError && fallbackIssues) {
            // Filtrar solo los que realmente tienen el sprint en status_by_sprint o current_sprint
            issues = fallbackIssues.filter(issue => {
              const hasInCurrentSprint = issue.current_sprint === sprintName;
              const hasInStatusBySprint = issue.status_by_sprint && 
                                         typeof issue.status_by_sprint === 'object' &&
                                         Object.prototype.hasOwnProperty.call(issue.status_by_sprint, sprintName);
              return hasInCurrentSprint || hasInStatusBySprint;
            });
            console.log(`[PROJECT_METRICS] Issues encontrados via status_by_sprint fallback: ${issues.length}`);
          }
        }
      }
    } else {
      // Sin filtro de sprint, usar query normal
      const { data: allIssues, error: allError } = await query;
      if (allError) throw allError;
      issues = allIssues || [];
      console.log(`[PROJECT_METRICS] Issues encontrados: ${issues.length}`);
    }

    // Usar helper centralizado para consistencia en todos los módulos
    // Reemplazado función isDevDone local con statusHelper.js

    // Construir mapa de status_at_sprint_close desde los issues que ya lo tienen
    const issueStatusMap = new Map();
    if (sprintId && issues.length > 0) {
      issues.forEach(issue => {
        if (issue.status_at_sprint_close) {
          issueStatusMap.set(issue.id, issue.status_at_sprint_close);
        }
      });
    }

    // Agrupar por Board State usando estado del sprint si está disponible
    const statusBreakdown = {};
    let totalSP = 0;
    let completedSP = 0; // SP de tickets completados

    (issues || []).forEach(issue => {
      // Para sprints cerrados: usar SOLO status_at_sprint_close o status_by_sprint (histórico)
      // Para sprints activos: usar current_status
      let rawStatus = null;
      
      if (sprintId && sprintName) {
        if (isSprintClosed) {
          // Sprint cerrado: SIEMPRE usar status_at_sprint_close (la foto al cierre)
          // NUNCA usar current_status para sprints cerrados - eso sería incorrecto
          const statusAtClose = issueStatusMap.get(issue.id) || issue.status_at_sprint_close;
          if (statusAtClose) {
            rawStatus = statusAtClose;
          } else if (issue.status_by_sprint && typeof issue.status_by_sprint === 'object') {
            // Fallback: status_by_sprint[sprintName] si no hay status_at_sprint_close
            const sprintStatus = issue.status_by_sprint[sprintName];
            if (sprintStatus) {
              rawStatus = sprintStatus;
            }
          }
          
          // Si no hay status_at_sprint_close ni status_by_sprint, saltar este ticket
          // (no debería pasar porque ya filtramos antes, pero por seguridad)
          if (!rawStatus) {
            console.warn(`[PROJECT_METRICS] ⚠️ Skipping issue ${issue.issue_key || issue.id} - no historical status for closed sprint`);
            return; // Skip this issue
          }
        } else {
          // Sprint activo: usar current_status (estado actual)
          rawStatus = issue.current_status || 'Unknown';
        }
      } else {
        // Sin filtro de sprint: usar current_status
        rawStatus = issue.current_status || 'Unknown';
      }
      
      const status = normalizeStatus(rawStatus);
      
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = {
          name: status,
          count: 0,
          sp: 0
        };
      }
      statusBreakdown[status].count++;
      // Para sprints cerrados, usar story_points_at_close (SP al final del sprint)
      // Para sprints activos, usar current_story_points
      let sp = issue.current_story_points || 0;
      if (isSprintClosed && issue.story_points_at_close !== null && issue.story_points_at_close !== undefined) {
        sp = issue.story_points_at_close;
      }
      statusBreakdown[status].sp += sp;
      totalSP += sp;
      
      // Calcular SP completados usando helper centralizado
      if (isDevDoneStatusSync(status)) {
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

  // Usar helper centralizado para consistencia en todos los módulos
  // Reemplazado función isDevDone local con statusHelper.js

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
    const isCompleted = isDevDoneStatusSync(currentStatus);
    
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
    const isCompleted = isDevDoneStatusSync(currentStatus);

    // Sprint metrics (only if sprint is selected and ticket is in sprint)
    if (sprintName && issue.current_sprint === sprintName) {
      // Verificar si se completó durante este sprint usando status_by_sprint
      const statusBySprint = issue.status_by_sprint || {};
      const sprintStatus = statusBySprint[sprintName];
      const wasCompletedInSprint = sprintStatus && isDevDoneStatusSync(sprintStatus);
      
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

/**
 * Obtiene cambios de scope para un sprint
 * Tarea 4: Tracking Básico de Scope Changes
 */
export const getSprintScopeChanges = async (sprintId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    // Obtener resumen de cambios de scope usando la vista
    const { data: summary, error: summaryError } = await supabase
      .from('sprint_scope_changes_summary')
      .select('*')
      .eq('sprint_id', sprintId)
      .maybeSingle();

    if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw summaryError;
    }

    // Obtener detalles de cambios
    const { data: changes, error: changesError } = await supabase
      .from('sprint_scope_changes')
      .select(`
        id,
        change_type,
        change_date,
        story_points_before,
        story_points_after,
        issues!inner(
          issue_key,
          summary
        )
      `)
      .eq('sprint_id', sprintId)
      .order('change_date', { ascending: false });

    if (changesError) throw changesError;

    return {
      summary: summary || {
        issues_added: 0,
        issues_removed: 0,
        issues_sp_changed: 0,
        sp_added: 0,
        sp_removed: 0,
        sp_net_change: 0,
      },
      changes: changes || [],
    };
  } catch (error) {
    console.error('[PROJECT_METRICS] Error getting scope changes:', error);
    throw error;
  }
};

