/**
 * AUDITORÍA: Sprint Membership Cleanup
 *
 * Identifica y corrige issues que aparecen en métricas de sprint pero que fueron removidos
 * antes del cierre del sprint.
 */

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { projects } from '../src/config/projects.js';
import { wasTicketInSprintAtClose } from '../src/processors/issue-processor.js';

async function auditSprintMembership() {
  try {
    logger.info('🔍 Iniciando auditoría de membresía de sprint...');

    // 1. Obtener proyecto para análisis
    const project = projects.find(p => p.projectKey === 'OBD');
    if (!project) {
      logger.error('❌ Proyecto OBD no encontrado');
      return;
    }

    // 2. Obtener sprints cerrados con issues asociados
    logger.info('📊 Obteniendo sprints cerrados con issues asociados...');

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
      .limit(50); // Limitar para análisis inicial

    if (error) {
      logger.error('❌ Error obteniendo datos:', error.message);

      if (error.message.includes('Invalid API key') || error.message.includes('anon') || error.message.includes('service_role')) {
        logger.error('\n🔑 CONFIGURACIÓN REQUERIDA:');
        logger.error('   1. Actualizar SUPABASE_SERVICE_ROLE_KEY en .env con la key real');
        logger.error('   2. O ejecutar: npm run sync (usa PROJECTS_CONFIG del repo)');
        logger.error('\n💡 El script necesita credenciales válidas para acceder a Supabase');
      }

      return;
    }

    if (!sprintIssues || sprintIssues.length === 0) {
      logger.info('ℹ️ No se encontraron issues en sprints cerrados');
      return;
    }

    // Ordenar por fecha de cierre del sprint (más recientes primero)
    sprintIssues.sort((a, b) => {
      const dateA = new Date(a.sprints?.complete_date || a.sprints?.end_date || '1970-01-01');
      const dateB = new Date(b.sprints?.complete_date || b.sprints?.end_date || '1970-01-01');
      return dateB.getTime() - dateA.getTime();
    });

    logger.info(`📊 Encontrados ${sprintIssues.length} registros issue_sprints en sprints cerrados`);

    // 3. Crear cliente Jira para obtener changelogs
    const jiraClients = createJiraClients([project]);
    const jiraClient = jiraClients.get(project.projectKey);

    let issuesToReview = [];
    let issuesCorrect = 0;
    let issuesIncorrect = 0;

    // 4. Analizar cada issue en sprint cerrado
    for (const record of sprintIssues.slice(0, 20)) { // Analizar primeros 20 para diagnóstico
      const sprint = record.sprints;
      const issue = record.issues;

      logger.info(`\n🔍 Analizando: ${issue.issue_key} en sprint ${sprint.sprint_name}`);

      try {
        // Obtener changelog completo desde Jira
        const issueDetails = await jiraClient.fetchIssueDetails(issue.issue_key);

        if (!issueDetails) {
          // Issue no existe en Jira (404) - definitivamente debe ser removido
          logger.error(`❌ ISSUE ELIMINADO: ${issue.issue_key} ya no existe en Jira pero está en métricas`);
          issuesIncorrect++;
          issuesToReview.push({
            recordId: record.id,
            issueKey: issue.issue_key,
            sprintName: sprint.sprint_name,
            statusAtClose: record.status_at_sprint_close,
            completeDate: sprint.complete_date,
            reason: 'eliminado_jira'
          });
          continue;
        }

        if (!issueDetails.changelog) {
          logger.warn(`⚠️ No se pudo obtener changelog para ${issue.issue_key} (issue existe pero sin historial)`);
          continue;
        }

        // Verificar si el issue realmente pertenecía al sprint al cierre
        const shouldBeIncluded = wasTicketInSprintAtClose(
          issueDetails.changelog,
          sprint.sprint_name,
          sprint.start_date,
          sprint.complete_date || sprint.end_date,
          [] // No usar currentSprintData para evitar sesgo
        );

        if (shouldBeIncluded) {
          logger.info(`✅ CORRECTO: ${issue.issue_key} debía estar en ${sprint.sprint_name}`);
          issuesCorrect++;
        } else {
          logger.error(`❌ INCORRECTO: ${issue.issue_key} NO debía estar en ${sprint.sprint_name} (removido antes del cierre)`);
          issuesIncorrect++;
          issuesToReview.push({
            recordId: record.id,
            issueKey: issue.issue_key,
            sprintName: sprint.sprint_name,
            statusAtClose: record.status_at_sprint_close,
            completeDate: sprint.complete_date,
            reason: 'removido_antes_cierre'
          });
        }

      } catch (error) {
        // Para otros errores (rate limiting, permisos, etc.), marcar como potencialmente incorrecto
        logger.error(`❌ Error analizando ${issue.issue_key}:`, {
          message: error.message,
          status: error.response?.status || error.status
        });
        // Para errores inesperados, asumir que el issue debe ser revisado
        issuesIncorrect++;
        issuesToReview.push({
          recordId: record.id,
          issueKey: issue.issue_key,
          sprintName: sprint.sprint_name,
          statusAtClose: record.status_at_sprint_close,
          completeDate: sprint.complete_date,
          reason: 'error_acceso'
        });
      }
    }

    // 5. Reporte final
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 REPORTE DE AUDITORÍA');
    logger.info('='.repeat(60));
    logger.info(`Total registros analizados: ${Math.min(20, sprintIssues.length)}`);
    logger.info(`Issues correctos: ${issuesCorrect}`);
    logger.info(`Issues incorrectos: ${issuesIncorrect}`);
    logger.info(`Porcentaje correcto: ${((issuesCorrect / (issuesCorrect + issuesIncorrect)) * 100).toFixed(1)}%`);

    if (issuesToReview.length > 0) {
      logger.info('\n🚨 ISSUES QUE DEBEN SER REMOVIDOS:');
      issuesToReview.forEach(issue => {
        const reasonText = issue.reason === 'eliminado_jira' ? '❌ ELIMINADO de Jira' : '⏰ Removido antes del cierre';
        logger.info(`  - ${issue.issueKey} de sprint ${issue.sprintName} (${reasonText})`);
      });

      logger.info('\n💡 RECOMENDACIÓN: Ejecutar limpieza de datos incorrectos');
      logger.info(`   📊 ${issuesToReview.filter(i => i.reason === 'eliminado_jira').length} issues eliminados de Jira`);
      logger.info(`   📊 ${issuesToReview.filter(i => i.reason === 'removido_antes_cierre').length} issues removidos antes del cierre`);
    }

  } catch (error) {
    logger.error('❌ Error en auditoría:', error);
  }
}

// Ejecutar auditoría
auditSprintMembership();