/**
 * Script para forzar la sincronización de tickets específicos desde Jira
 * Ejecutar desde el directorio jira-supabase-sync
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar .env desde el directorio raíz del proyecto
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

import { processIssue } from '../src/processors/issue-processor.js';
import jiraClientDefault from '../src/clients/jira-client.js';
import supabaseClient from '../src/clients/supabase-client.js';
import { config } from '../src/config.js';
import { logger } from '../src/utils/logger.js';

async function forceSyncIssues(issueKeys = ['ODSO-297', 'ODSO-313']) {
  try {
    logger.info(`🔄 Forzando sincronización de tickets: ${issueKeys.join(', ')}\n`);

    // Determinar el proyecto del issue key
    const projectKey = issueKeys[0].split('-')[0]; // ODSO, OBD, etc.
    
    // Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      projectKey,
      projectKey,
      config.jira.domain
    );

    logger.info(`✅ Squad ID: ${squadId}\n`);

    for (const issueKey of issueKeys) {
      logger.info(`📋 Sincronizando: ${issueKey}`);
      logger.info('─'.repeat(50));

      try {
        // Obtener issue completo de Jira con changelog
        logger.info(`  📥 Obteniendo datos de Jira...`);
        const jiraIssue = await jiraClientDefault.fetchIssueDetails(issueKey);
        
        if (!jiraIssue) {
          logger.warn(`  ❌ No se encontró el ticket en Jira`);
          continue;
        }

        // Mostrar estatus actual en Jira
        const jiraStatus = jiraIssue.fields?.status?.name || 'Unknown';
        logger.info(`  ✅ Estatus en Jira: "${jiraStatus}"`);

        // Obtener estatus actual en Supabase antes de actualizar
        const supabase = supabaseClient.client;
        const { data: existingIssue } = await supabase
          .from('issues')
          .select('current_status, updated_date')
          .eq('issue_key', issueKey)
          .single();

        if (existingIssue) {
          logger.info(`  📊 Estatus actual en Supabase: "${existingIssue.current_status}"`);
          logger.info(`  📅 Última actualización: ${existingIssue.updated_date || 'N/A'}`);
        } else {
          logger.warn(`  ⚠️ Ticket no existe en Supabase, se creará`);
        }

        // Procesar y actualizar
        logger.info(`  🔄 Procesando y actualizando...`);
        await processIssue(squadId, jiraIssue, jiraClientDefault);

        // Verificar estatus después de actualizar
        const { data: updatedIssue } = await supabase
          .from('issues')
          .select('current_status, updated_date')
          .eq('issue_key', issueKey)
          .single();

        if (updatedIssue) {
          logger.success(`  ✅ Estatus actualizado en Supabase: "${updatedIssue.current_status}"`);
          if (jiraStatus !== updatedIssue.current_status) {
            logger.warn(`  ⚠️ ADVERTENCIA: El estatus en Jira ("${jiraStatus}") no coincide con Supabase ("${updatedIssue.current_status}")`);
          } else {
            logger.success(`  ✅ Estatus coincide correctamente`);
          }
        }

        logger.success(`  ✅ ${issueKey} sincronizado exitosamente\n`);

      } catch (error) {
        logger.error(`  ❌ Error sincronizando ${issueKey}:`, error.message);
        if (error.response) {
          logger.error(`     Status: ${error.response.status}`);
          logger.error(`     Data:`, JSON.stringify(error.response.data, null, 2));
        }
        logger.info('');
      }
    }

    logger.success('✅ Sincronización forzada completada\n');

  } catch (error) {
    logger.error('❌ Error general:', error);
    process.exit(1);
  }
}

// Ejecutar
const issueKeys = process.argv.slice(2);
if (issueKeys.length === 0) {
  logger.info('📝 Uso: npm run force-sync-issues ODSO-297 ODSO-313');
  logger.info('   O ejecutar con tickets específicos como argumentos');
  process.exit(0);
}

forceSyncIssues(issueKeys);





