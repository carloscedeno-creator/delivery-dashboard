/**
 * Script para ejecutar sincronización completa diaria
 * Se ejecuta una vez al día a las 12 AM EST (5 AM UTC)
 * Sincroniza TODOS los proyectos con full sync
 */

import supabaseClient from './clients/supabase-client.js';
import { projects, validateProjects } from './config/projects.js';
import { createJiraClients } from './clients/jira-client-factory.js';
import { logger } from './utils/logger.js';
import { fullSyncForProject } from './sync/sync-multi.js';

async function syncProjectFull(project, jiraClient) {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`📦 Sincronización COMPLETA para: ${project.projectKey} (${project.jiraDomain})`);
    logger.info(`${'='.repeat(60)}`);
    
    // Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      project.projectKey.toUpperCase(),
      project.projectName || project.projectKey,
      project.jiraDomain
    );
    
    // SIEMPRE ejecutar full sync (no verificar última sync)
    logger.info(`🔄 Ejecutando sincronización completa para ${project.projectKey}...`);
    await fullSyncForProject(project, squadId, jiraClient);
    
    logger.success(`✅ Sincronización completa finalizada para ${project.projectKey}`);
    return { success: true, projectKey: project.projectKey };
  } catch (error) {
    logger.error(`❌ Error sincronizando ${project.projectKey}:`, error);
    return { success: false, projectKey: project.projectKey, error: error.message };
  }
}

async function runFullSyncDaily() {
  try {
    const startTime = Date.now();
    logger.info('\n' + '='.repeat(60));
    logger.info('🌙 SINCRONIZACIÓN COMPLETA DIARIA');
    logger.info('='.repeat(60));
    logger.info(`📅 Fecha: ${new Date().toISOString()}`);
    logger.info(`🕐 Hora: 12:00 AM EST (5:00 AM UTC)`);
    logger.info('='.repeat(60) + '\n');
    
    // Validar configuración
    validateProjects();
    
    logger.info(`📋 Proyectos a sincronizar (FULL SYNC): ${projects.length}`);
    projects.forEach(p => {
      logger.info(`   - ${p.projectKey} (${p.jiraDomain})`);
    });
    
    // Crear clientes de Jira para cada proyecto
    const jiraClients = createJiraClients(projects);
    
    // Sincronizar cada proyecto con FULL SYNC
    const results = [];
    for (const project of projects) {
      const jiraClient = jiraClients.get(project.projectKey);
      if (!jiraClient) {
        logger.error(`❌ No se pudo crear cliente para ${project.projectKey}`);
        results.push({ success: false, projectKey: project.projectKey, error: 'Cliente no disponible' });
        continue;
      }
      
      const result = await syncProjectFull(project, jiraClient);
      results.push(result);
    }
    
    // Resumen
    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2); // En minutos
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 RESUMEN DE SINCRONIZACIÓN COMPLETA DIARIA');
    logger.info('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    logger.success(`✅ Exitosos: ${successful.length}/${results.length}`);
    if (failed.length > 0) {
      logger.error(`❌ Fallidos: ${failed.length}/${results.length}`);
      failed.forEach(f => {
        logger.error(`   - ${f.projectKey}: ${f.error}`);
      });
    }
    
    logger.info(`⏱️  Duración total: ${duration} minutos`);
    logger.info('='.repeat(60) + '\n');
    
    if (failed.length === 0) {
      logger.success('✅ Todas las sincronizaciones completadas exitosamente');
      process.exit(0);
    } else {
      logger.warn('⚠️ Algunas sincronizaciones fallaron');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Error en sincronización completa diaria:', error);
    process.exit(1);
  }
}

// Ejecutar solo si se llama directamente
// En ES modules, verificamos si el archivo es el punto de entrada
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && process.argv[1].endsWith('run-full-sync-daily.js');

if (isMainModule) {
  runFullSyncDaily();
}

export default runFullSyncDaily;

