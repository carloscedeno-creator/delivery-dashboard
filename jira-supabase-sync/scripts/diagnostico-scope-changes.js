/**
 * Script de diagnóstico para verificar por qué no se detectan cambios de scope
 * Tarea 4: Tracking Básico de Scope Changes
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';
import jiraClientDefault from '../src/clients/jira-client.js';

async function diagnosticarScopeChanges() {
  try {
    logger.info('🔍 Diagnóstico de Scope Changes...\n');

    // 1. Verificar que la tabla existe
    const { data: tableCheck, error: tableError } = await supabaseClient.client
      .from('sprint_scope_changes')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === 'PGRST205') {
      logger.error('❌ La tabla sprint_scope_changes no existe. Aplica la migración primero.');
      return;
    }

    logger.success('✅ Tabla sprint_scope_changes existe');

    // 2. Obtener un sprint activo con issues
    const { data: sprint, error: sprintError } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_name, start_date, end_date, state, squad_id')
      .eq('state', 'active')
      .not('end_date', 'is', null)
      .limit(1)
      .single();

    if (sprintError || !sprint) {
      logger.warn('⚠️ No se encontró un sprint activo con end_date');
      return;
    }

    logger.info(`📊 Analizando sprint: ${sprint.sprint_name}`);
    logger.info(`   Start: ${sprint.start_date}, End: ${sprint.end_date}`);

    // 3. Obtener issues de este sprint que fueron creados después del inicio
    const sprintStart = new Date(sprint.start_date);
    const { data: issues, error: issuesError } = await supabaseClient.client
      .from('issue_sprints')
      .select(`
        issue_id,
        issues!inner(
          id,
          issue_key,
          created_date,
          current_story_points,
          changelog
        )
      `)
      .eq('sprint_id', sprint.id)
      .gte('issues.created_date', sprint.start_date);

    if (issuesError) {
      logger.error('❌ Error obteniendo issues:', issuesError);
      return;
    }

    logger.info(`📋 Encontrados ${issues?.length || 0} issues creados después del inicio del sprint`);

    if (!issues || issues.length === 0) {
      logger.info('ℹ️ No hay issues que deberían tener cambios detectados');
      return;
    }

    // 4. Verificar si tienen changelog
    let conChangelog = 0;
    let sinChangelog = 0;
    let conHistories = 0;

    for (const item of issues.slice(0, 5)) {
      const issue = item.issues;
      const changelog = issue.changelog;

      if (!changelog) {
        sinChangelog++;
        logger.debug(`   ⚠️ ${issue.issue_key}: Sin changelog`);
        continue;
      }

      conChangelog++;

      if (!changelog.histories || changelog.histories.length === 0) {
        logger.debug(`   ⚠️ ${issue.issue_key}: Changelog sin histories`);
        continue;
      }

      conHistories++;

      // Verificar si hay cambios en el campo Sprint
      const sprintChanges = changelog.histories
        .flatMap(h => h.items || [])
        .filter(item => {
          const field = (item.field || '').toLowerCase();
          return field === 'sprint' || field === 'customfield_10020';
        });

      if (sprintChanges.length > 0) {
        logger.info(`   ✅ ${issue.issue_key}: Tiene ${sprintChanges.length} cambios en Sprint`);
        
        // Verificar si alguno es después del inicio
        const cambiosDespuesInicio = sprintChanges.filter(change => {
          const history = changelog.histories.find(h => 
            h.items && h.items.some(i => i === change)
          );
          if (!history) return false;
          const changeDate = new Date(history.created);
          return changeDate > sprintStart;
        });

        if (cambiosDespuesInicio.length > 0) {
          logger.info(`      📝 ${cambiosDespuesInicio.length} cambios después del inicio del sprint`);
        }
      } else {
        logger.debug(`   ℹ️ ${issue.issue_key}: Sin cambios en campo Sprint`);
      }
    }

    logger.info(`\n📊 Resumen:`);
    logger.info(`   Issues analizados: ${Math.min(issues.length, 5)}`);
    logger.info(`   Con changelog: ${conChangelog}`);
    logger.info(`   Con histories: ${conHistories}`);
    logger.info(`   Sin changelog: ${sinChangelog}`);

    // 5. Verificar si el código de detección se está ejecutando
    logger.info(`\n🔍 Verificando integración en issue-processor...`);
    
    // Simular la detección para un issue de prueba
    if (issues.length > 0 && issues[0].issues.changelog) {
      const testIssue = issues[0].issues;
      const { detectIssueAddedToSprint } = await import('../src/processors/scope-change-detector.js');
      
      const resultado = detectIssueAddedToSprint(
        testIssue.changelog,
        sprint.sprint_name,
        sprint.start_date
      );

      if (resultado) {
        logger.success(`   ✅ Detección funcionando: Issue ${testIssue.issue_key} fue agregado el ${resultado.date}`);
      } else {
        logger.info(`   ℹ️ Detección no encontró cambios para ${testIssue.issue_key}`);
        logger.info(`      (Esto puede ser normal si el issue estaba en el sprint desde el inicio)`);
      }
    }

    logger.info(`\n✅ Diagnóstico completado`);

  } catch (error) {
    logger.error('❌ Error en diagnóstico:', error);
  }
}

diagnosticarScopeChanges();
