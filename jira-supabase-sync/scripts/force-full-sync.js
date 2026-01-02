/**
 * Script para forzar una sincronización completa de un proyecto específico
 * Útil cuando los estatus no están actualizados y necesitas re-sincronizar todo
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

async function forceFullSync(projectKey = null) {
  try {
    logger.info('🚀 Iniciando sincronización completa forzada...');
    
    // Validar configuración
    validateProjects();
    
    // Filtrar proyectos si se especifica uno
    let projectsToSync = projects;
    if (projectKey) {
      projectsToSync = projects.filter(p => p.projectKey.toUpperCase() === projectKey.toUpperCase());
      if (projectsToSync.length === 0) {
        logger.error(`❌ No se encontró el proyecto: ${projectKey}`);
        logger.info(`📋 Proyectos disponibles: ${projects.map(p => p.projectKey).join(', ')}`);
        process.exit(1);
      }
    }
    
    logger.info(`📋 Proyectos a sincronizar: ${projectsToSync.length}`);
    projectsToSync.forEach(p => {
      logger.info(`   - ${p.projectKey} (${p.jiraDomain})`);
    });
    
    // Crear clientes de Jira
    const jiraClients = createJiraClients(projectsToSync);
    
    // Sincronizar cada proyecto con full sync
    const results = [];
    for (const project of projectsToSync) {
      try {
        logger.info(`\n${'='.repeat(60)}`);
        logger.info(`📦 Forzando sincronización completa: ${project.projectKey} (${project.jiraDomain})`);
        logger.info(`${'='.repeat(60)}`);
        
        const jiraClient = jiraClients.get(project.projectKey);
        if (!jiraClient) {
          logger.error(`❌ No se pudo crear cliente para ${project.projectKey}`);
          results.push({ success: false, projectKey: project.projectKey, error: 'Cliente no disponible' });
          continue;
        }
        
        // Obtener o crear squad
        const squadId = await supabaseClient.getOrCreateSquad(
          project.projectKey.toUpperCase(),
          project.projectName || project.projectKey,
          project.jiraDomain
        );
        
        // BORRAR el lastSync para forzar full sync
        logger.info(`🗑️ Eliminando registro de última sincronización para forzar full sync...`);
        const { error: deleteError } = await supabaseClient.client
          .from('data_sync_log')
          .delete()
          .eq('squad_id', squadId)
          .eq('sync_type', 'incremental');
        
        if (deleteError) {
          logger.warn(`⚠️ No se pudo eliminar lastSync (puede que no exista):`, deleteError.message);
        } else {
          logger.success(`✅ Registro de última sincronización eliminado`);
        }
        
        // PRIMERO: Probar obtener un issue específico para verificar permisos
        logger.info(`🔍 Verificando acceso a issues específicos...`);
        try {
          const testIssue = await jiraClient.fetchIssueDetails('ODSO-297');
          if (testIssue) {
            logger.success(`✅ ODSO-297 encontrado! Status: ${testIssue.fields?.status?.name || 'N/A'}`);
          } else {
            logger.warn(`⚠️ ODSO-297 no encontrado o sin acceso`);
          }
        } catch (error) {
          logger.error(`❌ Error obteniendo ODSO-297:`, error.message);
          logger.error(`   Status: ${error.response?.status || 'N/A'}`);
          logger.error(`   Response: ${JSON.stringify(error.response?.data || {}, null, 2)}`);
        }
        
        // Importar función de full sync
        const { fullSyncForProject } = await import('../src/sync/sync-multi.js');
        
        // Ejecutar full sync
        const result = await fullSyncForProject(project, squadId, jiraClient);
        results.push({ success: true, projectKey: project.projectKey, ...result });
        
        logger.success(`✅ Sincronización completa completada para ${project.projectKey}`);
      } catch (error) {
        logger.error(`❌ Error sincronizando ${project.projectKey}:`, error);
        results.push({ success: false, projectKey: project.projectKey, error: error.message });
      }
    }
    
    // Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 RESUMEN DE SINCRONIZACIÓN COMPLETA');
    logger.info('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    logger.success(`✅ Exitosos: ${successful.length}/${results.length}`);
    if (successful.length > 0) {
      successful.forEach(s => {
        logger.success(`   - ${s.projectKey}: ${s.issuesProcessed || 0} issues procesados`);
      });
    }
    
    if (failed.length > 0) {
      logger.error(`❌ Fallidos: ${failed.length}/${results.length}`);
      failed.forEach(f => {
        logger.error(`   - ${f.projectKey}: ${f.error}`);
      });
    }
    
    if (failed.length === 0) {
      logger.success('✅ Todas las sincronizaciones completadas exitosamente');
      process.exit(0);
    } else {
      logger.warn('⚠️ Algunas sincronizaciones fallaron');
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Error en sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar
const projectKey = process.argv[2] || null;
if (projectKey) {
  logger.info(`🎯 Forzando full sync solo para: ${projectKey}`);
} else {
  logger.info(`🎯 Forzando full sync para todos los proyectos`);
}

forceFullSync(projectKey);





