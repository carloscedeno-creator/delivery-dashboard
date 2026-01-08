/**
 * Procesador para obtener y guardar datos del Velocity Report de Jira
 * Calcula commitment (SP al inicio) y completed (SP al final) para cada sprint
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';
import jiraClientDefault from '../clients/jira-client.js';
import { config } from '../config.js';

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
 * Procesa y guarda datos del velocity report para un sprint
 * @param {Object} sprint - Datos del sprint desde Supabase
 * @param {Object} jiraClient - Cliente de Jira (opcional)
 * @returns {Promise<Object>} Datos del velocity procesados
 */
export async function processSprintVelocity(sprint, jiraClient = null) {
  const client = jiraClient || jiraClientDefault;
  
  if (!sprint || !sprint.id) {
    logger.warn(`⚠️ Sprint inválido para procesar velocity:`, sprint);
    return null;
  }

  const sprintId = sprint.id;
  const sprintName = sprint.sprint_name;
  const sprintStart = sprint.start_date ? new Date(sprint.start_date) : null;
  const sprintEnd = sprint.end_date ? new Date(sprint.end_date) : null;
  const sprintCompleteDate = sprint.complete_date ? new Date(sprint.complete_date) : sprintEnd;

  logger.info(`📊 Procesando velocity report para sprint: ${sprintName} (ID: ${sprintId})`);

  try {
    // Obtener todos los tickets que estaban en el sprint
    const { data: issueSprints, error: issueSprintsError } = await supabaseClient.client
      .from('issue_sprints')
      .select(`
        issue_id,
        status_at_sprint_start,
        status_at_sprint_close,
        story_points_at_start,
        story_points_at_close,
        issues!inner(
          id,
          issue_key,
          story_points
        )
      `)
      .eq('sprint_id', sprintId);

    if (issueSprintsError) {
      logger.error(`❌ Error obteniendo issues del sprint:`, issueSprintsError);
      throw issueSprintsError;
    }

    if (!issueSprints || issueSprints.length === 0) {
      logger.warn(`⚠️ No se encontraron issues para sprint ${sprintName}`);
      return null;
    }

    logger.info(`📋 Encontrados ${issueSprints.length} issues en el sprint`);

    // Calcular COMMITMENT: Story points de tickets que estaban en el sprint al inicio
    // Usar story_points_at_start si está disponible, sino usar story_points del issue
    let commitment = 0;
    const commitmentTickets = new Set();

    for (const is of issueSprints) {
      const sp = is.story_points_at_start || is.issues.story_points || 0;
      if (sp > 0) {
        commitment += sp;
        commitmentTickets.add(is.issue_id);
      }
    }

    // Calcular COMPLETED: Story points de tickets que estaban completados al final del sprint
    let completed = 0;
    const completedTickets = new Set();

    for (const is of issueSprints) {
      const finalStatus = is.status_at_sprint_close;
      if (finalStatus && isCompletedStatus(finalStatus)) {
        const sp = is.story_points_at_close || is.story_points_at_start || is.issues.story_points || 0;
        if (sp > 0) {
          completed += sp;
          completedTickets.add(is.issue_id);
        }
      }
    }

    // Si no tenemos status_at_sprint_close, intentar obtener desde issue_history
    if (completed === 0 && sprintCompleteDate) {
      logger.info(`🔍 No hay status_at_sprint_close, buscando en issue_history...`);
      
      const issueIds = issueSprints.map(is => is.issues.id);
      const { data: history, error: historyError } = await supabaseClient.client
        .from('issue_history')
        .select('issue_id, to_value, changed_at')
        .in('issue_id', issueIds)
        .eq('field_name', 'status')
        .lte('changed_at', sprintCompleteDate.toISOString())
        .order('changed_at', { ascending: false });

      if (!historyError && history && history.length > 0) {
        // Agrupar por issue_id y tomar el último estado antes del cierre del sprint
        const lastStatusByIssue = new Map();
        for (const h of history) {
          if (!lastStatusByIssue.has(h.issue_id)) {
            lastStatusByIssue.set(h.issue_id, h.to_value);
          }
        }

        // Recalcular completed usando los estados del historial
        completed = 0;
        completedTickets.clear();
        
        for (const is of issueSprints) {
          const finalStatus = lastStatusByIssue.get(is.issues.id) || is.status_at_sprint_close;
          if (finalStatus && isCompletedStatus(finalStatus)) {
            const sp = is.story_points_at_close || is.story_points_at_start || is.issues.story_points || 0;
            if (sp > 0) {
              completed += sp;
              completedTickets.add(is.issue_id);
            }
          }
        }
      }
    }

    const velocityData = {
      sprint_id: sprintId,
      sprint_name: sprintName,
      start_date: sprintStart?.toISOString() || null,
      end_date: sprintEnd?.toISOString() || null,
      complete_date: sprintCompleteDate?.toISOString() || null,
      commitment: commitment,
      completed: completed,
      commitment_tickets: commitmentTickets.size,
      completed_tickets: completedTickets.size,
      total_tickets: issueSprints.length,
      calculated_at: new Date().toISOString()
    };

    // Guardar datos del velocity en Supabase
    await saveVelocityData(velocityData);

    logger.success(`✅ Velocity report procesado para sprint ${sprintName}: Commitment=${commitment}, Completed=${completed}`);
    return velocityData;

  } catch (error) {
    logger.error(`❌ Error procesando velocity para sprint ${sprintName}:`, error);
    throw error;
  }
}

/**
 * Guarda los datos del velocity en Supabase
 */
async function saveVelocityData(velocityData) {
  try {
    const { error } = await supabaseClient.client
      .from('sprint_velocity')
      .upsert({
        sprint_id: velocityData.sprint_id,
        sprint_name: velocityData.sprint_name,
        start_date: velocityData.start_date,
        end_date: velocityData.end_date,
        complete_date: velocityData.complete_date,
        commitment: velocityData.commitment,
        completed: velocityData.completed,
        commitment_tickets: velocityData.commitment_tickets,
        completed_tickets: velocityData.completed_tickets,
        total_tickets: velocityData.total_tickets,
        calculated_at: velocityData.calculated_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'sprint_id'
      });

    if (error) {
      logger.error(`❌ Error guardando datos del velocity:`, error);
      throw error;
    }

    logger.success(`✅ Datos del velocity guardados para sprint ${velocityData.sprint_name}`);

  } catch (error) {
    logger.error(`❌ Error guardando datos del velocity:`, error);
    throw error;
  }
}
