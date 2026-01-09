/**
 * Script para Validar Cierre de Sprint
 * Valida que los sprints cerrados están correctamente procesados
 * 
 * USO:
 *   node scripts/validar-cierre-sprint.js
 *   node scripts/validar-cierre-sprint.js --squad=OBD
 *   node scripts/validar-cierre-sprint.js --sprint-id=SPRINT-ID-AQUI
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

import supabaseClient from '../src/clients/supabase-client.js';
import { projects, validateProjects } from '../src/config/projects.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { validateSprintClosure, processSprintClosure } from '../src/processors/sprint-closure-processor.js';
import { logger } from '../src/utils/logger.js';

/**
 * Valida un sprint específico
 */
async function validarSprint(sprintId, jiraClient) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🔍 Validando sprint: ${sprintId}`);
    logger.info(`${'='.repeat(60)}`);

    // Obtener sprint desde Supabase
    const { data: sprint, error: sprintError } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date, complete_date, state, squad_id')
      .eq('id', sprintId)
      .single();

    if (sprintError || !sprint) {
      logger.error(`❌ Sprint no encontrado: ${sprintError?.message || 'No existe'}`);
      return null;
    }

    logger.info(`📋 Sprint: ${sprint.sprint_name}`);
    logger.info(`   Estado: ${sprint.state}`);
    logger.info(`   Start Date: ${sprint.start_date}`);
    logger.info(`   End Date: ${sprint.end_date}`);
    logger.info(`   Complete Date: ${sprint.complete_date || 'NO DEFINIDA'}`);

    // Validar cierre
    const validation = await validateSprintClosure(sprint, jiraClient);

    // Mostrar resultados
    logger.info(`\n📊 RESULTADOS DE VALIDACIÓN:`);
    logger.info(`   Válido: ${validation.isValid ? '✅ SÍ' : '❌ NO'}`);

    if (validation.issues.length > 0) {
      logger.info(`\n   ⚠️ Issues encontradas (${validation.issues.length}):`);
      validation.issues.forEach((issue, index) => {
        logger.info(`      ${index + 1}. ${issue.type}: ${issue.message}`);
        if (issue.issueKeys && issue.issueKeys.length > 0) {
          logger.info(`         Issues afectadas: ${issue.issueKeys.slice(0, 5).join(', ')}${issue.issueKeys.length > 5 ? '...' : ''}`);
        }
      });
    }

    if (validation.warnings.length > 0) {
      logger.info(`\n   ⚠️ Advertencias (${validation.warnings.length}):`);
      validation.warnings.forEach((warning, index) => {
        logger.info(`      ${index + 1}. ${warning}`);
      });
    }

    if (validation.errors.length > 0) {
      logger.error(`\n   ❌ Errores (${validation.errors.length}):`);
      validation.errors.forEach((error, index) => {
        logger.error(`      ${index + 1}. ${error}`);
      });
    }

    // Procesar si es necesario
    if (!validation.isValid || validation.issues.some(i => i.type === 'missing_complete_date')) {
      logger.info(`\n🔄 Procesando sprint para corregir issues...`);
      const processResult = await processSprintClosure(sprint, jiraClient);

      if (processResult.success) {
        logger.success(`✅ Sprint procesado correctamente`);
        if (processResult.updated) {
          logger.success(`   📅 complete_date actualizado`);
        }
      } else {
        logger.error(`❌ Error procesando sprint`);
      }
    }

    return validation;
  } catch (error) {
    logger.error(`❌ Error validando sprint:`, error);
    return null;
  }
}

/**
 * Valida todos los sprints cerrados de un squad
 */
async function validarSprintsCerrados(squadId, jiraClient) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`🔍 Validando todos los sprints cerrados`);
    logger.info(`${'='.repeat(60)}`);

    // Obtener sprints cerrados
    const { data: closedSprints, error: fetchError } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date, complete_date, state')
      .eq('squad_id', squadId)
      .eq('state', 'closed')
      .order('end_date', { ascending: false, nullsLast: true });

    if (fetchError) {
      logger.error(`❌ Error obteniendo sprints cerrados:`, fetchError);
      return;
    }

    if (!closedSprints || closedSprints.length === 0) {
      logger.info(`ℹ️ No hay sprints cerrados para validar`);
      return;
    }

    logger.info(`📋 Encontrados ${closedSprints.length} sprints cerrados`);

    const resultados = {
      validos: 0,
      invalidos: 0,
      sinCompleteDate: 0,
      issuesSinStatus: 0,
    };

    // Validar cada sprint
    for (const sprint of closedSprints) {
      const validation = await validateSprintClosure(sprint, jiraClient);

      if (validation.isValid) {
        resultados.validos++;
      } else {
        resultados.invalidos++;
      }

      if (!sprint.complete_date) {
        resultados.sinCompleteDate++;
      }

      const missingStatusIssue = validation.issues.find(i => i.type === 'missing_status_at_close');
      if (missingStatusIssue) {
        resultados.issuesSinStatus += missingStatusIssue.count || 0;
      }
    }

    // Resumen
    logger.info(`\n📊 RESUMEN DE VALIDACIÓN:`);
    logger.info(`   ✅ Sprints válidos: ${resultados.validos}/${closedSprints.length}`);
    logger.info(`   ❌ Sprints inválidos: ${resultados.invalidos}/${closedSprints.length}`);
    logger.info(`   📅 Sin complete_date: ${resultados.sinCompleteDate}`);
    logger.info(`   📋 Issues sin status_at_sprint_close: ${resultados.issuesSinStatus}`);

    return resultados;
  } catch (error) {
    logger.error(`❌ Error validando sprints cerrados:`, error);
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    logger.info('🚀 Iniciando validación de cierre de sprint...');

    // Validar configuración
    validateProjects();

    // Obtener argumentos
    const args = process.argv.slice(2);
    const sprintIdArg = args.find(arg => arg.startsWith('--sprint-id='));
    const squadArg = args.find(arg => arg.startsWith('--squad='));

    // Crear clientes de Jira
    const jiraClients = createJiraClients(projects);

    if (sprintIdArg) {
      // Validar sprint específico
      const sprintId = sprintIdArg.split('=')[1];
      
      // Necesitamos encontrar el proyecto del sprint
      const { data: sprint } = await supabaseClient.client
        .from('sprints')
        .select('squad_id, squads!inner(project_key)')
        .eq('id', sprintId)
        .single();

      if (!sprint) {
        logger.error(`❌ Sprint no encontrado: ${sprintId}`);
        process.exit(1);
      }

      const projectKey = sprint.squads?.project_key;
      const jiraClient = jiraClients.get(projectKey);

      if (!jiraClient) {
        logger.error(`❌ No se pudo crear cliente para proyecto ${projectKey}`);
        process.exit(1);
      }

      await validarSprint(sprintId, jiraClient);
    } else if (squadArg) {
      // Validar todos los sprints cerrados de un squad
      const squadName = squadArg.split('=')[1].toUpperCase();
      
      const project = projects.find(p => p.projectKey.toUpperCase() === squadName);
      if (!project) {
        logger.error(`❌ Proyecto no encontrado: ${squadName}`);
        process.exit(1);
      }

      const jiraClient = jiraClients.get(project.projectKey);
      if (!jiraClient) {
        logger.error(`❌ No se pudo crear cliente para ${project.projectKey}`);
        process.exit(1);
      }

      const squadId = await supabaseClient.getOrCreateSquad(
        project.projectKey.toUpperCase(),
        project.projectName || project.projectKey,
        project.jiraDomain
      );

      await validarSprintsCerrados(squadId, jiraClient);
    } else {
      // Validar todos los sprints cerrados de todos los proyectos
      logger.info(`📋 Validando sprints cerrados para todos los proyectos...`);

      for (const project of projects) {
        const jiraClient = jiraClients.get(project.projectKey);
        if (!jiraClient) {
          logger.error(`❌ No se pudo crear cliente para ${project.projectKey}`);
          continue;
        }

        const squadId = await supabaseClient.getOrCreateSquad(
          project.projectKey.toUpperCase(),
          project.projectName || project.projectKey,
          project.jiraDomain
        );

        await validarSprintsCerrados(squadId, jiraClient);
      }
    }

    logger.success('✅ Validación completada');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en validación:', error);
    process.exit(1);
  }
}

main();
