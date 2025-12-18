/**
 * Script para forzar la sincronización de todos los issues de un sprint específico
 * Útil cuando los estados están desactualizados y necesitas actualizar solo los issues del sprint
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde el directorio raíz del proyecto ANTES de cualquier import
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Pequeño delay para asegurar que dotenv se procese
await new Promise(resolve => setTimeout(resolve, 100));

// Ahora importar después de cargar .env
const supabaseClientModule = await import('../src/clients/supabase-client.js');
const supabaseClient = supabaseClientModule.default;
const { projects, validateProjects } = await import('../src/config/projects.js');
const { createJiraClients } = await import('../src/clients/jira-client-factory.js');
const { logger } = await import('../src/utils/logger.js');
const { processIssuesWithClient } = await import('../src/processors/issue-processor.js');

async function forceSyncSprintIssues(projectKey, sprintName) {
  try {
    logger.info(`🚀 Forzando sincronización de issues del sprint: ${sprintName} en proyecto ${projectKey}`);
    
    // Validar configuración
    validateProjects();
    
    // Encontrar el proyecto
    const project = projects.find(p => p.projectKey.toUpperCase() === projectKey.toUpperCase());
    if (!project) {
      logger.error(`❌ No se encontró el proyecto: ${projectKey}`);
      logger.info(`📋 Proyectos disponibles: ${projects.map(p => p.projectKey).join(', ')}`);
      process.exit(1);
    }
    
    // Crear cliente de Jira
    const jiraClients = createJiraClients([project]);
    const jiraClient = jiraClients.get(project.projectKey);
    
    if (!jiraClient) {
      logger.error(`❌ No se pudo crear cliente para ${project.projectKey}`);
      process.exit(1);
    }
    
    // Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      project.projectKey.toUpperCase(),
      project.projectName || project.projectKey,
      project.jiraDomain
    );
    
    // Obtener el sprint desde Supabase
    const { data: sprints, error: sprintError } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_key, sprint_name')
      .eq('squad_id', squadId)
      .ilike('sprint_name', `%${sprintName}%`)
      .order('start_date', { ascending: false })
      .limit(1);
    
    if (sprintError || !sprints || sprints.length === 0) {
      logger.error(`❌ No se encontró el sprint: ${sprintName}`);
      process.exit(1);
    }
    
    const sprint = sprints[0];
    logger.info(`✅ Sprint encontrado: ${sprint.sprint_name} (${sprint.sprint_key})`);
    
    // Obtener issues del sprint desde Supabase
    const { data: sprintIssues, error: sprintIssuesError } = await supabaseClient.client
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', sprint.id);
    
    if (sprintIssuesError) {
      logger.error(`❌ Error obteniendo issues del sprint: ${sprintIssuesError.message}`);
      process.exit(1);
    }
    
    const sprintIssueIds = (sprintIssues || []).map(si => si.issue_id);
    logger.info(`📋 Issues en el sprint: ${sprintIssueIds.length}`);
    
    if (sprintIssueIds.length === 0) {
      logger.warn(`⚠️ No hay issues en el sprint`);
      process.exit(0);
    }
    
    // Obtener issue_keys desde Supabase
    const { data: issues, error: issuesError } = await supabaseClient.client
      .from('issues')
      .select('issue_key')
      .in('id', sprintIssueIds);
    
    if (issuesError) {
      logger.error(`❌ Error obteniendo issue keys: ${issuesError.message}`);
      process.exit(1);
    }
    
    const issueKeys = (issues || []).map(i => i.issue_key);
    logger.info(`📋 Issue keys a sincronizar: ${issueKeys.length}`);
    
    if (issueKeys.length === 0) {
      logger.warn(`⚠️ No se encontraron issue keys`);
      process.exit(0);
    }
    
    // Obtener detalles de cada issue desde Jira
    logger.info(`📥 Obteniendo detalles de issues desde Jira...`);
    const jiraIssues = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const issueKey of issueKeys) {
      try {
        const issueDetails = await jiraClient.fetchIssueDetails(issueKey);
        if (issueDetails) {
          jiraIssues.push(issueDetails);
          successCount++;
          
          // Log del estado actual en Jira
          const jiraStatus = issueDetails.fields?.status?.name || 'Unknown';
          logger.debug(`   ✅ ${issueKey}: Estado en Jira = "${jiraStatus}"`);
        }
      } catch (error) {
        errorCount++;
        logger.warn(`   ⚠️ Error obteniendo ${issueKey}: ${error.message}`);
      }
    }
    
    logger.info(`✅ Issues obtenidos desde Jira: ${successCount} exitosos, ${errorCount} errores`);
    
    if (jiraIssues.length === 0) {
      logger.warn(`⚠️ No se pudieron obtener issues desde Jira`);
      process.exit(1);
    }
    
    // Procesar issues (esto actualizará los estados)
    logger.info(`🔄 Procesando ${jiraIssues.length} issues...`);
    const { successCount: processedSuccess, errorCount: processedErrors } = 
      await processIssuesWithClient(squadId, jiraIssues, jiraClient);
    
    logger.success(`✅ Sincronización completada:`);
    logger.success(`   📊 Issues procesados: ${processedSuccess} exitosos, ${processedErrors} errores`);
    
    // Verificar estados actualizados
    logger.info(`\n🔍 Verificando estados actualizados...`);
    const { data: updatedIssues, error: verifyError } = await supabaseClient.client
      .from('issues')
      .select('issue_key, current_status')
      .in('id', sprintIssueIds);
    
    if (!verifyError && updatedIssues) {
      logger.info(`\n📊 Estados finales en Supabase:`);
      const statusGroups = {};
      updatedIssues.forEach(issue => {
        const status = issue.current_status || 'Unknown';
        if (!statusGroups[status]) {
          statusGroups[status] = [];
        }
        statusGroups[status].push(issue.issue_key);
      });
      
      Object.keys(statusGroups).sort().forEach(status => {
        logger.info(`   ${status}: ${statusGroups[status].length} issues`);
        statusGroups[status].slice(0, 5).forEach(key => {
          logger.info(`      - ${key}`);
        });
        if (statusGroups[status].length > 5) {
          logger.info(`      ... y ${statusGroups[status].length - 5} más`);
        }
      });
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar
const projectKey = process.argv[2] || 'ODSO';
const sprintName = process.argv[3] || 'Sprint 11';

if (!projectKey || !sprintName) {
  logger.error('❌ Uso: node force-sync-sprint-issues.js <projectKey> <sprintName>');
  logger.info('   Ejemplo: node force-sync-sprint-issues.js ODSO "Sprint 11"');
  process.exit(1);
}

logger.info(`🎯 Sincronizando sprint: ${sprintName} del proyecto: ${projectKey}`);
forceSyncSprintIssues(projectKey, sprintName);
