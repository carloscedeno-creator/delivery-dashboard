/**
 * Script para probar acceso a Jira con diferentes queries
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

// Asegurar que PROJECTS_CONFIG se carga
if (!process.env.PROJECTS_CONFIG) {
  console.error('❌ PROJECTS_CONFIG no encontrado en variables de entorno');
  console.error('   Asegúrate de que esté configurado en .env o GitHub Secrets');
  process.exit(1);
}

await new Promise(resolve => setTimeout(resolve, 100));

import { projects, validateProjects } from '../src/config/projects.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { logger } from '../src/utils/logger.js';

async function testAccess() {
  try {
    logger.info('🔍 Probando acceso a Jira...\n');
    
    // Validar proyectos
    try {
      validateProjects();
    } catch (error) {
      logger.error('❌ Error validando proyectos:', error.message);
      process.exit(1);
    }
    
    logger.info(`📋 Proyectos disponibles: ${projects.map(p => p.projectKey).join(', ')}\n`);
    
    // Probar con ODSO
    const odsoProject = projects.find(p => p.projectKey.toUpperCase() === 'ODSO');
    if (!odsoProject) {
      logger.error('❌ Proyecto ODSO no encontrado');
      logger.info(`   Proyectos disponibles: ${projects.map(p => `${p.projectKey} (${p.jiraDomain})`).join(', ')}`);
      process.exit(1);
    }
    
    logger.info(`📋 Proyecto: ${odsoProject.projectKey} (${odsoProject.jiraDomain})\n`);
    
    const jiraClients = createJiraClients([odsoProject]);
    const jiraClient = jiraClients.get('ODSO');
    
    if (!jiraClient) {
      logger.error('❌ No se pudo crear cliente Jira');
      process.exit(1);
    }
    
    // Probar diferentes queries
    const testQueries = [
      'project = ODSO',
      'project = "ODSO"',
      'project = ODSO ORDER BY created DESC',
      'project = "ODSO" ORDER BY created DESC',
      'project = ODSO AND issuetype != "Sub-task"',
      'project = "ODSO" AND issuetype != "Sub-task"',
    ];
    
    for (const query of testQueries) {
      logger.info(`\n🔍 Probando query: ${query}`);
      try {
        const issues = await jiraClient.fetchAllIssues(query);
        logger.success(`   ✅ Resultado: ${issues.length} issues encontrados`);
        if (issues.length > 0) {
          logger.info(`   📋 Primeros 3: ${issues.slice(0, 3).map(i => i.key).join(', ')}`);
          break; // Si encontramos issues, no necesitamos probar más queries
        }
      } catch (error) {
        logger.error(`   ❌ Error: ${error.message}`);
        if (error.response) {
          logger.error(`      Status: ${error.response.status}`);
          logger.error(`      Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
      }
    }
    
    // Probar obtener issue específico
    logger.info(`\n🔍 Probando obtener issue específico: ODSO-297`);
    try {
      const issue = await jiraClient.fetchIssueDetails('ODSO-297');
      if (issue) {
        logger.success(`   ✅ ODSO-297 encontrado!`);
        logger.info(`   📋 Status: ${issue.fields?.status?.name || 'N/A'}`);
      } else {
        logger.warn(`   ⚠️ ODSO-297 no encontrado`);
      }
    } catch (error) {
      logger.error(`   ❌ Error: ${error.message}`);
      if (error.response) {
        logger.error(`      Status: ${error.response.status}`);
        logger.error(`      Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
    
    // Probar listar proyectos disponibles
    logger.info(`\n🔍 Probando listar proyectos disponibles...`);
    try {
      const response = await jiraClient.client.get('/rest/api/3/project');
      if (response.data && Array.isArray(response.data)) {
        logger.success(`   ✅ Proyectos encontrados: ${response.data.length}`);
        const odsoProject = response.data.find(p => p.key === 'ODSO');
        if (odsoProject) {
          logger.success(`   ✅ Proyecto ODSO encontrado: ${odsoProject.name}`);
        } else {
          logger.warn(`   ⚠️ Proyecto ODSO no encontrado en la lista`);
          logger.info(`   📋 Proyectos disponibles: ${response.data.slice(0, 10).map(p => p.key).join(', ')}`);
        }
      }
    } catch (error) {
      logger.error(`   ❌ Error listando proyectos: ${error.message}`);
    }
    
  } catch (error) {
    logger.error('❌ Error general:', error.message || error);
    if (error.stack) {
      logger.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testAccess();

