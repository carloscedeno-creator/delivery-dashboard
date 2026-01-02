/**
 * Script temporal para sincronizar solo el proyecto Integration (IN)
 * Útil para pruebas locales rápidas
 */

import supabaseClient from './clients/supabase-client.js';
import { projects } from './config/projects.js';
import { createJiraClients } from './clients/jira-client-factory.js';
import { logger } from './utils/logger.js';
import { fullSyncForProject, incrementalSyncForProject } from './sync/sync-multi.js';

async function syncProject(project, jiraClient) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`📦 Sincronizando proyecto: ${project.projectKey} (${project.jiraDomain})`);
    logger.info(`${'='.repeat(60)}`);
    
    // Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      project.projectKey.toUpperCase(),
      project.projectName || project.projectKey,
      project.jiraDomain
    );
    
    // Verificar última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    
    if (!lastSync) {
      logger.info(`🆕 Primera sincronización para ${project.projectKey}: ejecutando sync completa`);
      await fullSyncForProject(project, squadId, jiraClient);
    } else {
      logger.info(`🔄 Sincronización incremental para ${project.projectKey}`);
      await incrementalSyncForProject(project, squadId, jiraClient);
    }
    
    logger.success(`✅ Sincronización completada para ${project.projectKey}`);
    return { success: true, projectKey: project.projectKey };
  } catch (error) {
    logger.error(`❌ Error sincronizando ${project.projectKey}:`, error);
    return { success: false, projectKey: project.projectKey, error: error.message };
  }
}

async function runSyncIntegrationOnly() {
  try {
    logger.info('🚀 Iniciando sincronización SOLO para Integration (IN)...');
    
    // Filtrar solo el proyecto IN
    const integrationProject = projects.find(p => p.projectKey === 'IN');
    
    if (!integrationProject) {
      logger.error('❌ No se encontró el proyecto Integration (IN) en la configuración');
      logger.info('📋 Proyectos disponibles:');
      projects.forEach(p => {
        logger.info(`   - ${p.projectKey} (${p.jiraDomain})`);
      });
      process.exit(1);
    }
    
    logger.info(`📋 Proyecto a sincronizar: ${integrationProject.projectKey} (${integrationProject.jiraDomain})`);
    
    // Crear cliente de Jira para Integration
    const jiraClients = createJiraClients([integrationProject]);
    const jiraClient = jiraClients.get('IN');
    
    if (!jiraClient) {
      logger.error('❌ No se pudo crear cliente de Jira para Integration');
      process.exit(1);
    }
    
    // Sincronizar solo Integration
    const result = await syncProject(integrationProject, jiraClient);
    
    // Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 RESUMEN DE SINCRONIZACIÓN');
    logger.info('='.repeat(60));
    
    if (result.success) {
      logger.success(`✅ Sincronización completada exitosamente para ${result.projectKey}`);
      process.exit(0);
    } else {
      logger.error(`❌ Sincronización falló para ${result.projectKey}: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

runSyncIntegrationOnly();

