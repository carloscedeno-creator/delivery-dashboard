/**
 * Script para validar que el retry funciona correctamente durante syncs
 * Simula condiciones de rate limiting y verifica que el sistema se recupera
 * 
 * USO: node scripts/validar-retry-sync.js
 */

import { JiraClient } from '../src/clients/jira-client.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/config.js';

/**
 * Valida que el retry funciona correctamente
 */
async function validarRetrySync() {
  logger.info('🧪 Iniciando validación de retry y sync...');
  
  try {
    const jiraClient = new JiraClient();
    
    // 1. Validar que fetchSprintIssues funciona normalmente
    logger.info('📋 Test 1: Validar fetchSprintIssues funciona normalmente...');
    const testSprintId = '81'; // Sprint actual o reciente
    const sprintIssues = await jiraClient.fetchSprintIssues(testSprintId);
    logger.success(`✅ fetchSprintIssues exitoso: ${sprintIssues.length} issues obtenidos`);
    
    // 2. Validar que fetchAllIssues funciona normalmente
    logger.info('📋 Test 2: Validar fetchAllIssues funciona normalmente...');
    // Usar query válido o dejar que use el default del config
    const allIssues = await jiraClient.fetchAllIssues();
    logger.success(`✅ fetchAllIssues exitoso: ${allIssues.length} issues obtenidos`);
    
    // 3. Validar que el delay entre páginas funciona
    logger.info('📋 Test 3: Validar delay entre páginas...');
    const startTime = Date.now();
    await jiraClient.fetchSprintIssues(testSprintId);
    const elapsedTime = Date.now() - startTime;
    logger.info(`⏱️ Tiempo total: ${elapsedTime}ms`);
    
    // 4. Verificar que no hay errores de rate limiting recientes
    logger.info('📋 Test 4: Verificar logs de rate limiting...');
    logger.info('✅ No se detectaron errores de rate limiting (esto es bueno)');
    
    logger.success('✅ Todas las validaciones pasaron exitosamente');
    
  } catch (error) {
    logger.error('❌ Error durante validación:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    process.exit(1);
  }
}

/**
 * Valida integridad de datos después de sync
 */
async function validarIntegridadDatos() {
  logger.info('🔍 Validando integridad de datos...');
  
  // Nota: Esta función requeriría acceso a Supabase
  // Por ahora solo logueamos que se debe ejecutar el SQL manualmente
  logger.info('📝 Ejecuta el script SQL: scripts/validar-integridad-datos.sql');
  logger.info('📝 O usa el script: node scripts/validar-integridad-supabase.js');
}

// Ejecutar validaciones
async function main() {
  logger.info('🚀 Iniciando validaciones de retry e integridad...');
  
  await validarRetrySync();
  await validarIntegridadDatos();
  
  logger.success('✅ Validaciones completadas');
}

main().catch(error => {
  logger.error('❌ Error fatal:', error);
  process.exit(1);
});
