/**
 * LIMPIEZA: Sprint Membership Data Cleanup
 *
 * Remueve issues que fueron incorrectamente incluidos en métricas de sprint
 * porque fueron removidos antes del cierre del sprint.
 */

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { projects } from '../src/config/projects.js';
import { wasTicketInSprintAtClose } from '../src/processors/issue-processor.js';

async function cleanupIncorrectSprintData() {
  try {
    logger.info('🧹 Iniciando limpieza de datos incorrectos de sprint...');

    // 1. Obtener proyecto
    const project = projects.find(p => p.projectKey === 'OBD');
    if (!project) {
      logger.error('❌ Proyecto OBD no encontrado');
      return;
    }

    // 2. Obtener sprints cerrados con issues asociados
    logger.info('📊 Obteniendo datos para limpieza...');

    const { data: sprintIssues, error } = await supabaseClient.client
      .from('issue_sprints')
      .select(`
        id,
        sprint_id,
        issue_id,
        status_at_sprint_close,
        sprints!inner(
          id,
          sprint_name,
          state,
          start_date,
          end_date,
          complete_date
        ),
        issues!inner(
          id,
          issue_key,
          squad_id
        )
      `)
      .eq('sprints.state', 'closed')
      .limit(100); // Limitar para limpieza inicial

    if (error) {
      logger.error('❌ Error obteniendo datos:', error);
      return;
    }

    if (!sprintIssues || sprintIssues.length === 0) {
      logger.info('ℹ️ No hay datos para limpiar');
      return;
    }

    logger.info(`📊 Analizando ${sprintIssues.length} registros...`);

    // 3. Crear cliente Jira
    const jiraClients = createJiraClients([project]);
    const jiraClient = jiraClients.get(project.projectKey);

    let recordsToDelete = [];
    let recordsCorrect = 0;
    let errors = 0;

    // 4. Procesar en batches para no sobrecargar
    const BATCH_SIZE = 10;

    for (let i = 0; i < sprintIssues.length; i += BATCH_SIZE) {
      const batch = sprintIssues.slice(i, i + BATCH_SIZE);
      logger.info(`🔄 Procesando batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sprintIssues.length / BATCH_SIZE)}`);

      const batchPromises = batch.map(async (record) => {
        try {
          const sprint = record.sprints;
          const issue = record.issues;

          // Obtener changelog desde Jira
          const issueDetails = await jiraClient.fetchIssueDetails(issue.issue_key);

          if (!issueDetails || !issueDetails.changelog) {
            logger.warn(`⚠️ Sin changelog para ${issue.issue_key} - manteniendo por seguridad`);
            return { correct: true, record };
          }

          // Verificar si debe estar incluido
          const shouldBeIncluded = wasTicketInSprintAtClose(
            issueDetails.changelog,
            sprint.sprint_name,
            sprint.start_date,
            sprint.complete_date || sprint.end_date,
            []
          );

          return {
            correct: shouldBeIncluded,
            record,
            issueDetails
          };

        } catch (error) {
          logger.error(`❌ Error procesando ${record.issues.issue_key}:`, error.message);
          errors++;
          return { correct: true, record, error: error.message }; // Mantener por seguridad
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Clasificar resultados
      for (const result of batchResults) {
        if (result.correct) {
          recordsCorrect++;
        } else {
          recordsToDelete.push(result.record);
        }
      }
    }

    // 5. Reporte de lo que se va a eliminar
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 REPORTE DE LIMPIEZA');
    logger.info('='.repeat(60));
    logger.info(`Total registros analizados: ${sprintIssues.length}`);
    logger.info(`Registros correctos: ${recordsCorrect}`);
    logger.info(`Registros a eliminar: ${recordsToDelete.length}`);
    logger.info(`Errores: ${errors}`);

    if (recordsToDelete.length === 0) {
      logger.info('✅ No hay registros incorrectos para eliminar');
      return;
    }

    // 6. Mostrar preview de eliminación
    logger.info('\n🚨 REGISTROS QUE SERÁN ELIMINADOS:');
    recordsToDelete.slice(0, 10).forEach(record => {
      logger.info(`  - ${record.issues.issue_key} de sprint ${record.sprints.sprint_name}`);
      logger.info(`    Status: ${record.status_at_sprint_close}`);
    });

    if (recordsToDelete.length > 10) {
      logger.info(`  ... y ${recordsToDelete.length - 10} registros más`);
    }

    // 7. Ejecutar eliminación automática
    logger.warn(`\n⚠️ ATENCIÓN: Eliminando ${recordsToDelete.length} registros incorrectos de la base de datos`);
    logger.info('Esta operación no se puede deshacer');
    logger.info(`Primeros 3 registros a eliminar: ${recordsToDelete.slice(0, 3).map(r => r.id).join(', ')}`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const record of recordsToDelete) {
      try {
        logger.info(`🔄 Intentando eliminar registro ID: ${record.id} (${record.issues.issue_key})`);

        // Primero verificar que el registro existe
        const { data: existingRecord } = await supabaseClient.client
          .from('issue_sprints')
          .select('id, issue_id, sprint_id')
          .eq('id', record.id)
          .single();

        if (!existingRecord) {
          logger.warn(`⚠️ Registro ${record.id} no encontrado en la base de datos`);
          errorCount++;
          continue;
        }

        logger.info(`📋 Registro encontrado:`, existingRecord);

        // Intentar eliminar
        const { error, data } = await supabaseClient.client
          .from('issue_sprints')
          .delete()
          .eq('id', record.id);

        if (error) {
          logger.error(`❌ Error eliminando registro ${record.id}:`, error);
          logger.error(`   Detalles del error:`, JSON.stringify(error, null, 2));
          errorCount++;
        } else {
          logger.info(`✅ Eliminado registro ${record.id} - Respuesta:`, data);

          // Verificar que realmente se eliminó
          const { data: checkDeleted } = await supabaseClient.client
            .from('issue_sprints')
            .select('id')
            .eq('id', record.id);

          if (checkDeleted && checkDeleted.length > 0) {
            logger.error(`❌ REGISTRO ${record.id} AÚN EXISTE DESPUÉS DE ELIMINACIÓN!`);
            errorCount++;
          } else {
            logger.success(`✅ Confirmado: registro ${record.id} eliminado exitosamente`);
            deletedCount++;
          }
        }
      } catch (deleteError) {
        logger.error(`💥 Error crítico eliminando ${record.id}:`, deleteError);
        logger.error(`   Stack trace:`, deleteError.stack);
        errorCount++;
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('🧹 RESULTADO DE LA LIMPIEZA');
    logger.info('='.repeat(60));
    logger.info(`Registros eliminados exitosamente: ${deletedCount}`);
    logger.info(`Errores durante eliminación: ${errorCount}`);
    logger.info(`Total procesados: ${deletedCount + errorCount}`);

    if (deletedCount > 0) {
      logger.success(`\n🎉 ¡LIMPIEZA COMPLETADA! Se eliminaron ${deletedCount} registros incorrectos`);
      logger.info('\n💡 RECOMENDACIONES POST-LIMPIEZA:');
      logger.info('   1. Recargar el dashboard para ver métricas actualizadas');
      logger.info('   2. Verificar que los burndown charts ahora coincidan con Jira');
      logger.info('   3. Las futuras sincronizaciones serán más precisas');
    }

    // 8. Estadísticas finales
    logger.info('\n💡 Después de la limpieza, será necesario:');
    logger.info('   1. Recalcular métricas de sprint');
    logger.info('   2. Actualizar dashboards');
    logger.info('   3. Verificar integridad de datos');

  } catch (error) {
    logger.error('❌ Error en limpieza:', error);
  }
}

// Ejecutar limpieza
cleanupIncorrectSprintData();