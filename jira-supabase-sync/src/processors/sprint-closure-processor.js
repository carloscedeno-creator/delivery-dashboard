/**
 * Procesador de Cierre de Sprint
 * Valida y procesa el cierre de sprints correctamente
 * 
 * Funcionalidades:
 * - Valida que el sprint está realmente cerrado en Jira
 * - Actualiza complete_date cuando sprint cierra
 * - Valida que todas las issues tienen status_at_sprint_close
 * - Procesa métricas automáticamente si faltan
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';
import { retryWithBackoff } from '../utils/retry-helper.js';

/**
 * Valida que un sprint está correctamente cerrado
 * @param {Object} sprint - Sprint desde Supabase
 * @param {Object} jiraClient - Cliente de Jira
 * @returns {Promise<Object>} Resultado de validación
 */
export async function validateSprintClosure(sprint, jiraClient) {
  const validationResult = {
    isValid: false,
    issues: [],
    warnings: [],
    errors: [],
  };

  try {
    logger.info(`🔍 Validando cierre de sprint: ${sprint.sprint_name} (${sprint.id})`);

    // 1. Verificar que el sprint tiene estado 'closed'
    if (sprint.state !== 'closed') {
      validationResult.warnings.push(`Sprint ${sprint.sprint_name} no está marcado como cerrado (state: ${sprint.state})`);
      return validationResult;
    }

    // 2. Verificar que tiene end_date
    if (!sprint.end_date) {
      validationResult.errors.push(`Sprint ${sprint.sprint_name} está cerrado pero no tiene end_date`);
      return validationResult;
    }

    // 3. Verificar estado en Jira (si tenemos sprint_key)
    if (sprint.sprint_key) {
      try {
        // Intentar obtener sprint desde Jira para verificar estado real
        const sprintUrl = `/rest/agile/1.0/sprint/${sprint.sprint_key}`;
        const response = await jiraClient.client.get(sprintUrl);
        const jiraSprint = response.data;

        if (jiraSprint.state !== 'closed') {
          validationResult.warnings.push(
            `Sprint ${sprint.sprint_name} está marcado como cerrado en Supabase pero está ${jiraSprint.state} en Jira`
          );
        }

        // Verificar completeDate en Jira
        if (jiraSprint.completeDate && !sprint.complete_date) {
          validationResult.issues.push({
            type: 'missing_complete_date',
            message: `Sprint tiene completeDate en Jira (${jiraSprint.completeDate}) pero no en Supabase`,
            jiraCompleteDate: jiraSprint.completeDate,
          });
        }
      } catch (error) {
        if (error.response?.status === 404) {
          validationResult.warnings.push(`Sprint ${sprint.sprint_name} no encontrado en Jira (puede haber sido eliminado)`);
        } else {
          logger.warn(`⚠️ Error verificando sprint en Jira: ${error.message}`);
        }
      }
    }

    // 4. Verificar que todas las issues del sprint tienen status_at_sprint_close
    const { data: issueSprints, error: issueSprintsError } = await supabaseClient.client
      .from('issue_sprints')
      .select('issue_id, status_at_sprint_close, issues!inner(issue_key)')
      .eq('sprint_id', sprint.id);

    if (issueSprintsError) {
      validationResult.errors.push(`Error obteniendo issues del sprint: ${issueSprintsError.message}`);
      return validationResult;
    }

    if (!issueSprints || issueSprints.length === 0) {
      validationResult.warnings.push(`Sprint ${sprint.sprint_name} no tiene issues asociadas`);
      validationResult.isValid = true; // Sprint válido pero sin issues
      return validationResult;
    }

    // Contar issues sin status_at_sprint_close
    const issuesWithoutStatus = issueSprints.filter(is => !is.status_at_sprint_close);
    if (issuesWithoutStatus.length > 0) {
      validationResult.issues.push({
        type: 'missing_status_at_close',
        message: `${issuesWithoutStatus.length} de ${issueSprints.length} issues no tienen status_at_sprint_close`,
        count: issuesWithoutStatus.length,
        total: issueSprints.length,
        issueKeys: issuesWithoutStatus.map(is => is.issues?.issue_key).filter(Boolean),
      });
    }

    // 5. Verificar que tiene complete_date
    if (!sprint.complete_date) {
      validationResult.issues.push({
        type: 'missing_complete_date',
        message: `Sprint ${sprint.sprint_name} está cerrado pero no tiene complete_date`,
      });
    }

    // Si no hay errores críticos, el sprint es válido
    validationResult.isValid = validationResult.errors.length === 0;

    logger.info(`✅ Validación completada para ${sprint.sprint_name}: ${validationResult.isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
    if (validationResult.issues.length > 0) {
      logger.info(`   ⚠️ Issues encontradas: ${validationResult.issues.length}`);
    }
    if (validationResult.warnings.length > 0) {
      logger.info(`   ⚠️ Advertencias: ${validationResult.warnings.length}`);
    }

    return validationResult;
  } catch (error) {
    logger.error(`❌ Error validando cierre de sprint ${sprint.sprint_name}:`, error);
    validationResult.errors.push(`Error inesperado: ${error.message}`);
    return validationResult;
  }
}

/**
 * Procesa el cierre de un sprint
 * Actualiza complete_date y valida que todo esté correcto
 * @param {Object} sprint - Sprint desde Supabase
 * @param {Object} jiraClient - Cliente de Jira
 * @returns {Promise<Object>} Resultado del procesamiento
 */
export async function processSprintClosure(sprint, jiraClient) {
  const result = {
    success: false,
    updated: false,
    validation: null,
  };

  try {
    logger.info(`🔄 Procesando cierre de sprint: ${sprint.sprint_name}`);

    // 1. Validar el sprint
    const validation = await validateSprintClosure(sprint, jiraClient);
    result.validation = validation;

    if (!validation.isValid) {
      logger.warn(`⚠️ Sprint ${sprint.sprint_name} no es válido, no se procesará`);
      return result;
    }

    // 2. Actualizar complete_date si falta pero el sprint está cerrado
    let needsUpdate = false;
    const updates = {};

    if (!sprint.complete_date && sprint.end_date) {
      // Si no hay complete_date pero hay end_date, usar end_date como complete_date
      updates.complete_date = sprint.end_date;
      needsUpdate = true;
      logger.info(`   📅 Actualizando complete_date a ${sprint.end_date} (usando end_date)`);
    }

    // 3. Verificar completeDate desde Jira si está disponible
    if (sprint.sprint_key && !sprint.complete_date) {
      try {
        const sprintUrl = `/rest/agile/1.0/sprint/${sprint.sprint_key}`;
        const response = await retryWithBackoff(
          async () => {
            return await jiraClient.client.get(sprintUrl);
          },
          {
            context: `processSprintClosure:${sprint.sprint_name}`,
            maxRetries: 3,
            initialDelay: 1000,
          }
        );
        const jiraSprint = response.data;

        if (jiraSprint.completeDate) {
          updates.complete_date = new Date(jiraSprint.completeDate);
          needsUpdate = true;
          logger.info(`   📅 Actualizando complete_date desde Jira: ${jiraSprint.completeDate}`);
        }
      } catch (error) {
        logger.debug(`   ⚠️ No se pudo obtener completeDate desde Jira: ${error.message}`);
      }
    }

    // 4. Actualizar sprint si es necesario
    if (needsUpdate) {
      const { error: updateError } = await supabaseClient.client
        .from('sprints')
        .update(updates)
        .eq('id', sprint.id);

      if (updateError) {
        logger.error(`❌ Error actualizando sprint ${sprint.sprint_name}:`, updateError);
        result.validation.errors.push(`Error actualizando sprint: ${updateError.message}`);
        return result;
      }

      result.updated = true;
      logger.success(`✅ Sprint ${sprint.sprint_name} actualizado correctamente`);
    }

    result.success = true;
    return result;
  } catch (error) {
    logger.error(`❌ Error procesando cierre de sprint ${sprint.sprint_name}:`, error);
    result.validation = {
      isValid: false,
      errors: [`Error inesperado: ${error.message}`],
    };
    return result;
  }
}

/**
 * Procesa todos los sprints cerrados que necesitan validación
 * @param {string} squadId - ID del squad
 * @param {Object} jiraClient - Cliente de Jira
 * @returns {Promise<Object>} Resultado del procesamiento
 */
export async function processAllClosedSprints(squadId, jiraClient) {
  const result = {
    processed: 0,
    updated: 0,
    errors: 0,
    details: [],
  };

  try {
    logger.info(`🔄 Procesando todos los sprints cerrados para squad ${squadId}...`);

    // Obtener todos los sprints cerrados
    const { data: closedSprints, error: fetchError } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date, complete_date, state')
      .eq('squad_id', squadId)
      .eq('state', 'closed')
      .order('end_date', { ascending: false, nullsLast: true });

    if (fetchError) {
      logger.error(`❌ Error obteniendo sprints cerrados:`, fetchError);
      return result;
    }

    if (!closedSprints || closedSprints.length === 0) {
      logger.info(`ℹ️ No hay sprints cerrados para procesar`);
      return result;
    }

    logger.info(`📋 Encontrados ${closedSprints.length} sprints cerrados para procesar`);

    // Procesar cada sprint
    for (const sprint of closedSprints) {
      try {
        const processResult = await processSprintClosure(sprint, jiraClient);
        result.processed++;

        if (processResult.updated) {
          result.updated++;
        }

        if (!processResult.success) {
          result.errors++;
        }

        result.details.push({
          sprintName: sprint.sprint_name,
          success: processResult.success,
          updated: processResult.updated,
          issues: processResult.validation?.issues?.length || 0,
          warnings: processResult.validation?.warnings?.length || 0,
          errors: processResult.validation?.errors?.length || 0,
        });
      } catch (error) {
        logger.error(`❌ Error procesando sprint ${sprint.sprint_name}:`, error);
        result.errors++;
        result.processed++;
      }
    }

    logger.success(`✅ Procesamiento completado: ${result.processed} procesados, ${result.updated} actualizados, ${result.errors} errores`);
    return result;
  } catch (error) {
    logger.error(`❌ Error procesando sprints cerrados:`, error);
    return result;
  }
}
