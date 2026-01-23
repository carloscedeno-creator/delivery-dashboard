/**
 * DIAGNÓSTICO: Sprint Membership Issue
 *
 * Problema identificado: Issues removidos de sprints siguen apareciendo en métricas
 *
 * Este script diagnostica:
 * 1. Cómo Jira almacena la información de sprints en los issues
 * 2. Por qué issues removidos siguen apareciendo
 * 3. Cómo el sincronizador determina la membresía de sprint
 */

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { projects } from '../src/config/projects.js';

async function diagnoseSprintMembership() {
  try {
    logger.info('🔍 Iniciando diagnóstico de membresía de sprint...');

    // 1. Obtener datos de un proyecto específico
    const project = projects.find(p => p.projectKey === 'OBD');
    if (!project) {
      logger.error('❌ Proyecto OBD no encontrado en configuración');
      return;
    }

    logger.info(`📋 Diagnosticando proyecto: ${project.projectKey}`);
    logger.info(`   Configuración Jira: ${project.jiraDomain}`);
    logger.info(`   Email: ${project.jiraEmail}`);

    // Crear cliente Jira
    let jiraClient;
    try {
      const jiraClients = createJiraClients([project]);
      jiraClient = jiraClients.get(project.projectKey);
      logger.info('✅ Cliente Jira creado exitosamente');
    } catch (error) {
      logger.error('❌ Error creando cliente Jira:', error.message);
      logger.info('💡 Continuando análisis con datos de Supabase únicamente...');
      jiraClient = null;
    }

    // 2. Obtener algunos issues de Jira para analizar
    let issues = [];
    if (jiraClient) {
      try {
        const jqlQuery = `project = "${project.projectKey}" AND issuetype != "Sub-task" ORDER BY updated DESC`;
        logger.info(`🔍 JQL Query: ${jqlQuery}`);

        issues = await jiraClient.fetchAllIssues(jqlQuery);
        logger.info(`📊 Encontrados ${issues.length} issues desde Jira`);
      } catch (error) {
        logger.error('❌ Error obteniendo issues desde Jira:', error.message);
        logger.info('💡 Continuando con análisis de datos en Supabase...');
      }
    } else {
      logger.info('💡 Saltando obtención de datos desde Jira, analizando solo Supabase...');
    }

    // 3. Si no tenemos issues de Jira, obtener algunos de Supabase para análisis
    if (issues.length === 0) {
      logger.info('🔍 Obteniendo issues de ejemplo desde Supabase...');
      const { data: supabaseIssues } = await supabaseClient.client
        .from('issues')
        .select('issue_key, current_sprint')
        .eq('squad_id', project.squadId || 1) // Asumir squad 1
        .limit(10);

      if (supabaseIssues) {
        logger.info(`📊 Encontrados ${supabaseIssues.length} issues en Supabase`);
        // Crear estructura mock para análisis
        issues = supabaseIssues.map(issue => ({
          key: issue.issue_key,
          fields: {
            summary: 'N/A (desde Supabase)',
            customfield_10020: [] // No tenemos datos de sprint
          },
          changelog: null
        }));
      }
    }

    if (issues.length === 0) {
      logger.error('❌ No se pudieron obtener issues para análisis');
      return;
    }

    // 3. Analizar los primeros 10 issues
    const sampleIssues = issues.slice(0, 10);

    for (const issue of sampleIssues) {
      logger.info(`\n🔍 Analizando issue: ${issue.key} - ${issue.fields.summary}`);

      // Verificar campo sprint
      const sprintField = issue.fields.customfield_10020 || [];
      logger.info(`   📋 Campo sprint (customfield_10020): ${JSON.stringify(sprintField, null, 2)}`);

      if (sprintField.length > 0) {
        logger.info(`   📊 Número de sprints asociados: ${sprintField.length}`);

        for (const sprint of sprintField) {
          logger.info(`      🏃 Sprint: ${sprint.name} (ID: ${sprint.id})`);
          logger.info(`         Estado: ${sprint.state}`);
          logger.info(`         Inicio: ${sprint.startDate}`);
          logger.info(`         Fin: ${sprint.endDate}`);
          logger.info(`         Completado: ${sprint.completeDate || 'No completado'}`);
        }
      } else {
        logger.info(`   ⚠️ No tiene sprints asociados`);
      }

      // Verificar changelog si existe
      if (issue.changelog && issue.changelog.histories) {
        logger.info(`   📝 Tiene changelog con ${issue.changelog.histories.length} entradas`);

        // Buscar cambios relacionados con sprint
        const sprintChanges = issue.changelog.histories
          .flatMap(history => (history.items || []).map(item => ({
            ...item,
            created: history.created,
            author: history.author?.displayName
          })))
          .filter(item => {
            const fieldLower = (item.field || '').toLowerCase();
            return fieldLower === 'sprint' || fieldLower === 'customfield_10020';
          });

        if (sprintChanges.length > 0) {
          logger.info(`   🔄 Cambios de sprint encontrados: ${sprintChanges.length}`);
          sprintChanges.forEach((change, index) => {
            logger.info(`      ${index + 1}. ${change.created} - ${change.author}:`);
            logger.info(`         De: ${change.fromString || 'N/A'}`);
            logger.info(`         A: ${change.toString || 'N/A'}`);
          });
        } else {
          logger.info(`   ✅ No hay cambios de sprint en el changelog`);
        }
      } else {
        logger.info(`   ⚠️ No tiene changelog disponible`);
      }

      // Verificar en Supabase
      const { data: supabaseIssue } = await supabaseClient.client
        .from('issues')
        .select('id, current_sprint')
        .eq('issue_key', issue.key)
        .single();

      if (supabaseIssue) {
        logger.info(`   💾 En Supabase - current_sprint: ${supabaseIssue.current_sprint}`);

        // Verificar relaciones con sprints
        const { data: sprintRelations } = await supabaseClient.client
          .from('issue_sprints')
          .select(`
            sprint_id,
            status_at_sprint_close,
            story_points_at_sprint_close,
            sprints!inner(
              sprint_name,
              state,
              complete_date
            )
          `)
          .eq('issue_id', supabaseIssue.id);

        if (sprintRelations && sprintRelations.length > 0) {
          logger.info(`   🔗 Relaciones con sprints en Supabase: ${sprintRelations.length}`);
          sprintRelations.forEach(rel => {
            logger.info(`      - ${rel.sprints.sprint_name} (${rel.sprints.state})`);
            logger.info(`        Status al cierre: ${rel.status_at_sprint_close}`);
            logger.info(`        SP al cierre: ${rel.story_points_at_sprint_close}`);
            logger.info(`        Complete date: ${rel.sprints.complete_date}`);
          });
        } else {
          logger.info(`   ⚠️ No tiene relaciones con sprints en Supabase`);
        }
      } else {
        logger.info(`   ❌ Issue no encontrado en Supabase`);
      }

      logger.info(`   ${'─'.repeat(50)}`);
    }

    // 4. Análisis específico de sprints cerrados
    logger.info(`\n🏁 Análisis de sprints cerrados...`);

    const { data: closedSprints } = await supabaseClient.client
      .from('sprints')
      .select(`
        id,
        sprint_name,
        state,
        complete_date,
        issue_sprints(count)
      `)
      .eq('state', 'closed')
      .eq('squad_id', project.squadId || 1) // Asumir squad 1 por ahora
      .order('complete_date', { ascending: false })
      .limit(5);

    if (closedSprints) {
      for (const sprint of closedSprints) {
        logger.info(`📊 Sprint cerrado: ${sprint.sprint_name}`);
        logger.info(`   Complete date: ${sprint.complete_date}`);
        logger.info(`   Issues asociados: ${sprint.issue_sprints?.[0]?.count || 0}`);

        // Verificar si algunos issues podrían haber sido removidos
        const { data: sprintIssues } = await supabaseClient.client
          .from('issue_sprints')
          .select(`
            issues!inner(issue_key),
            status_at_sprint_close
          `)
          .eq('sprint_id', sprint.id);

        if (sprintIssues) {
          logger.info(`   Muestra de issues asociados:`);
          sprintIssues.slice(0, 3).forEach(issue => {
            logger.info(`     - ${issue.issues.issue_key}: ${issue.status_at_sprint_close}`);
          });
        }
      }
    }

  } catch (error) {
    logger.error('❌ Error en diagnóstico:', error);
  }
}

// Ejecutar diagnóstico
diagnoseSprintMembership();