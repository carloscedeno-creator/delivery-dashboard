/**
 * API para obtener datos del Sprint Burndown Chart
 * Primero intenta obtener datos desde las tablas sprint_burndown_data/summary
 * Si no están disponibles, reconstruye desde changelog
 */

import { supabase } from './supabaseApi';

/**
 * Determina si un estado indica que el ticket está completado
 */
function isCompletedStatus(status) {
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
}

/**
 * Obtiene datos del Sprint Burndown Chart para un sprint específico
 * @param {string} sprintId - ID del sprint
 * @returns {Promise<Object>} Datos del burndown chart con puntos por día
 */
export const getSprintBurndownData = async (sprintId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  try {
    console.log(`[SPRINT_BURNDOWN] Getting burndown data for sprint: ${sprintId}`);

    // Estrategia 1: Intentar obtener datos desde las tablas sprint_burndown_data/summary
    // (datos pre-procesados y guardados por el sync)
    const { data: summary, error: summaryError } = await supabase
      .from('sprint_burndown_summary')
      .select('*')
      .eq('sprint_id', sprintId)
      .single();

    if (!summaryError && summary) {
      // Si tenemos el resumen, obtener los datos día a día
      const { data: daysData, error: daysError } = await supabase
        .from('sprint_burndown_data')
        .select('*')
        .eq('sprint_id', sprintId)
        .order('date', { ascending: true });

      if (!daysError && daysData && daysData.length > 0) {
        console.log(`[SPRINT_BURNDOWN] ✅ Datos obtenidos desde tablas pre-procesadas (${summary.data_source})`);
        
        // Obtener información del sprint
        const { data: sprint } = await supabase
          .from('sprints')
          .select('id, sprint_name, start_date, end_date, complete_date, state')
          .eq('id', sprintId)
          .single();

        return {
          sprint: sprint || { id: sprintId, sprint_name: summary.sprint_name },
          days: daysData.map(day => ({
            date: day.date,
            planned: Number(day.planned),
            completed: Number(day.completed),
            remaining: Number(day.remaining),
            completedTickets: day.completed_tickets || 0,
            totalTickets: day.total_tickets || 0
          })),
          totalPlanned: Number(summary.total_planned),
          totalCompleted: Number(summary.total_completed),
          totalTickets: summary.total_tickets,
          dataSource: summary.data_source
        };
      }
    }

    // Estrategia 2: Si no hay datos pre-procesados, reconstruir desde changelog
    console.log(`[SPRINT_BURNDOWN] No hay datos pre-procesados, reconstruyendo desde changelog...`);

    // 1. Obtener información del sprint
    const { data: sprint, error: sprintError } = await supabase
      .from('sprints')
      .select('id, sprint_name, start_date, end_date, complete_date, state')
      .eq('id', sprintId)
      .single();

    if (sprintError || !sprint) {
      throw new Error(`Sprint not found: ${sprintId}`);
    }

    if (!sprint.start_date || !sprint.end_date) {
      throw new Error(`Sprint ${sprint.sprint_name} does not have valid dates`);
    }

    const sprintStart = new Date(sprint.start_date);
    const sprintEnd = new Date(sprint.end_date || sprint.complete_date);
    const sprintName = sprint.sprint_name;

    // 2. Obtener todos los tickets que estaban en el sprint al cierre
    const { data: issueSprints, error: issueSprintsError } = await supabase
      .from('issue_sprints')
      .select(`
        issue_id,
        status_at_sprint_close,
        story_points_at_start,
        story_points_at_close,
        issues!inner(
          id,
          issue_key,
          status_by_sprint,
          story_points_by_sprint,
          current_story_points
        )
      `)
      .eq('sprint_id', sprintId)
      .not('status_at_sprint_close', 'is', null); // Solo tickets que estaban en el sprint al cierre

    if (issueSprintsError) {
      throw issueSprintsError;
    }

    if (!issueSprints || issueSprints.length === 0) {
      console.warn(`[SPRINT_BURNDOWN] No issues found for sprint ${sprintName}`);
      return {
        sprint: sprint,
        days: [],
        totalPlanned: 0,
        totalCompleted: 0
      };
    }

    // 3. Calcular story points totales al final del sprint
    // Para Planning Accuracy: usar SOLO story_points_at_close (SP al final del sprint)
    // NO usar story_points_at_start como fallback porque puede incluir tickets agregados después del inicio
    const totalPlannedSP = issueSprints.reduce((sum, is) => {
      // Usar SOLO story_points_at_close (puede ser 0 si el ticket fue agregado después del inicio)
      return sum + (Number(is.story_points_at_close) || 0);
    }, 0);

    // 4. Obtener historial de cambios de estado para todos los tickets del sprint
    // Optimización: obtener todo el historial en una sola query
    const issueIds = issueSprints.map(is => is.issues.id);
    
    const { data: allHistory, error: historyError } = await supabase
      .from('issue_history')
      .select('*')
      .in('issue_id', issueIds)
      .eq('field_name', 'status')
      .gte('changed_at', sprintStart.toISOString())
      .lte('changed_at', sprintEnd.toISOString())
      .order('changed_at', { ascending: true });

    // Agrupar historial por issue_id
    const issueStatusHistory = new Map();
    
    if (!historyError && allHistory && allHistory.length > 0) {
      for (const h of allHistory) {
        if (!issueStatusHistory.has(h.issue_id)) {
          issueStatusHistory.set(h.issue_id, []);
        }
        issueStatusHistory.get(h.issue_id).push({
          issue_id: h.issue_id,
          date: h.changed_at,
          from_status: h.from_value,
          to_status: h.to_value
        });
      }
    }

    // Para issues sin historial, usar status_by_sprint como aproximación
    for (const is of issueSprints) {
      const issue = is.issues;
      const issueId = issue.id;
      
      if (!issueStatusHistory.has(issueId)) {
        const statusBySprint = issue.status_by_sprint || {};
        const sprintStatus = statusBySprint[sprintName];
        if (sprintStatus) {
          // Crear un registro histórico simple con el estado al cierre
          issueStatusHistory.set(issueId, [{
            issue_id: issueId,
            date: sprintEnd.toISOString(),
            from_status: null,
            to_status: sprintStatus
          }]);
        }
      }
    }

    // 5. Generar datos día a día
    const days = [];
    const currentDate = new Date(sprintStart);
    
    // Crear un mapa de tickets completados por fecha
    const completedByDate = new Map(); // fecha -> Set de issue_ids completados
    
    // Para cada día, determinar qué tickets estaban completados
    while (currentDate <= sprintEnd) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dateTime = currentDate.getTime();
      
      let completedSP = 0;
      const completedTickets = new Set();
      
      // Revisar cada ticket para ver si estaba completado en esta fecha
      for (const is of issueSprints) {
        const issueId = is.issues.id;
        const history = issueStatusHistory.get(issueId);
        
        if (history && history.length > 0) {
          // Encontrar el último cambio de estado antes o en esta fecha
          let statusAtDate = null;
          for (const record of history) {
            const recordDate = new Date(record.date).getTime();
            if (recordDate <= dateTime) {
              statusAtDate = record.to_status;
            } else {
              break;
            }
          }
          
          // Si no hay historial antes de esta fecha, usar el estado inicial del primer cambio
          // Si el primer cambio es después del inicio del sprint, el ticket estaba en el estado inicial
          if (!statusAtDate && history.length > 0) {
            const firstChangeDate = new Date(history[0].date).getTime();
            if (firstChangeDate > dateTime) {
              // El ticket estaba en el estado inicial (from_status del primer cambio)
              statusAtDate = history[0].from_status;
            } else {
              // Usar el último estado conocido
              statusAtDate = history[history.length - 1].to_status;
            }
          }
          
          // Si el ticket estaba completado en esta fecha
          if (statusAtDate && isCompletedStatus(statusAtDate)) {
            completedTickets.add(issueId);
            // Para Planning Accuracy: usar SOLO story_points_at_close (SP al final del sprint)
            const sp = Number(is.story_points_at_close) || 0;
            completedSP += sp;
          }
        } else {
          // Si no hay historial, usar status_at_sprint_close como aproximación
          // Solo contar como completado si el estado al cierre era completado
          if (isCompletedStatus(is.status_at_sprint_close)) {
            // Solo contar al final del sprint si no hay historial
            if (dateTime >= sprintEnd.getTime()) {
              completedTickets.add(issueId);
              // Para Planning Accuracy: usar SOLO story_points_at_close (SP al final del sprint)
              const sp = Number(is.story_points_at_close) || 0;
              completedSP += sp;
            }
          }
        }
      }
      
      const remainingSP = totalPlannedSP - completedSP;
      
      days.push({
        date: dateStr,
        planned: totalPlannedSP,
        completed: completedSP,
        remaining: remainingSP,
        completedTickets: completedTickets.size,
        totalTickets: issueSprints.length
      });
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`[SPRINT_BURNDOWN] Generated ${days.length} days of burndown data for sprint ${sprintName}`);

    return {
      sprint: sprint,
      days: days,
      totalPlanned: totalPlannedSP,
      totalCompleted: days[days.length - 1]?.completed || 0,
      totalTickets: issueSprints.length,
      dataSource: 'reconstructed'
    };
  } catch (error) {
    console.error('[SPRINT_BURNDOWN] Error getting burndown data:', error);
    throw error;
  }
};

/**
 * Obtiene datos simplificados del burndown (solo puntos clave)
 * Útil para visualizaciones rápidas
 */
export const getSprintBurndownSummary = async (sprintId) => {
  const fullData = await getSprintBurndownData(sprintId);
  
  return {
    sprint: fullData.sprint,
    start: {
      date: fullData.days[0]?.date,
      planned: fullData.totalPlanned,
      completed: 0,
      remaining: fullData.totalPlanned
    },
    end: {
      date: fullData.days[fullData.days.length - 1]?.date,
      planned: fullData.totalPlanned,
      completed: fullData.totalCompleted,
      remaining: fullData.totalPlanned - fullData.totalCompleted
    },
    totalPlanned: fullData.totalPlanned,
    totalCompleted: fullData.totalCompleted
  };
};

