/**
 * Script de prueba para verificar queries de Jira
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

await new Promise(resolve => setTimeout(resolve, 100));

import { projects } from '../src/config/projects.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { logger } from '../src/utils/logger.js';

async function testQueries() {
  try {
    logger.info(`📋 Proyectos disponibles: ${projects.map(p => p.projectKey).join(', ')}`);
    
    const odsoProject = projects.find(p => p.projectKey.toUpperCase() === 'ODSO');
    if (!odsoProject) {
      logger.error('❌ Proyecto ODSO no encontrado');
      logger.info(`   Proyectos disponibles: ${projects.map(p => `${p.projectKey} (${p.jiraDomain})`).join(', ')}`);
      process.exit(1);
    }
    
    logger.info(`✅ Proyecto encontrado: ${odsoProject.projectKey} (${odsoProject.jiraDomain})`);

    const jiraClients = createJiraClients([odsoProject]);
    const jiraClient = jiraClients.get('ODSO');

    if (!jiraClient) {
      logger.error('❌ No se pudo crear cliente Jira');
      process.exit(1);
    }

    logger.info('🔍 Probando obtener issue específico ODSO-297...');
    try {
      const issue = await jiraClient.fetchIssueDetails('ODSO-297');
      if (issue) {
        logger.success(`✅ ODSO-297 encontrado!`);
        logger.info(`   - Key: ${issue.key}`);
        logger.info(`   - Status: ${issue.fields?.status?.name || 'N/A'}`);
        logger.info(`   - Summary: ${issue.fields?.summary?.substring(0, 50) || 'N/A'}...`);
      } else {
        logger.warn('⚠️ ODSO-297 no encontrado');
      }
    } catch (error) {
      logger.error(`❌ Error obteniendo ODSO-297:`, error.message);
    }

    logger.info('\n🔍 Probando query JQL simple...');
    try {
      const simpleQuery = 'project = ODSO';
      logger.info(`   Query: ${simpleQuery}`);
      const issues = await jiraClient.fetchAllIssues(simpleQuery);
      logger.info(`   Resultado: ${issues.length} issues encontrados`);
      if (issues.length > 0) {
        logger.info(`   Primeros 3: ${issues.slice(0, 3).map(i => i.key).join(', ')}`);
      }
    } catch (error) {
      logger.error(`❌ Error con query simple:`, error.message);
    }

    logger.info('\n🔍 Probando query JQL con comillas...');
    try {
      const quotedQuery = 'project = "ODSO"';
      logger.info(`   Query: ${quotedQuery}`);
      const issues = await jiraClient.fetchAllIssues(quotedQuery);
      logger.info(`   Resultado: ${issues.length} issues encontrados`);
      if (issues.length > 0) {
        logger.info(`   Primeros 3: ${issues.slice(0, 3).map(i => i.key).join(', ')}`);
      }
    } catch (error) {
      logger.error(`❌ Error con query con comillas:`, error.message);
    }

    logger.info('\n🔍 Probando query JQL completo...');
    try {
      const fullQuery = 'project = "ODSO" AND issuetype != "Sub-task" ORDER BY created DESC';
      logger.info(`   Query: ${fullQuery}`);
      const issues = await jiraClient.fetchAllIssues(fullQuery);
      logger.info(`   Resultado: ${issues.length} issues encontrados`);
      if (issues.length > 0) {
        logger.info(`   Primeros 3: ${issues.slice(0, 3).map(i => i.key).join(', ')}`);
      }
    } catch (error) {
      logger.error(`❌ Error con query completo:`, error.message);
    }

  } catch (error) {
    logger.error('❌ Error general:', error);
    process.exit(1);
  }
}

testQueries();

