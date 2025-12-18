/**
 * Script para verificar que los tokens se están cargando correctamente
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '..', '.env') });

await new Promise(resolve => setTimeout(resolve, 200));

const projectsEnv = process.env.PROJECTS_CONFIG;

if (!projectsEnv) {
  console.error('❌ PROJECTS_CONFIG no encontrado');
  process.exit(1);
}

try {
  const cleanedJson = projectsEnv.trim()
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  
  const parsed = JSON.parse(cleanedJson);
  
  console.log(`✅ JSON parseado correctamente: ${parsed.length} proyectos\n`);
  
  parsed.forEach((project, index) => {
    console.log(`Proyecto ${index + 1} (${project.projectKey}):`);
    console.log(`  - Domain: ${project.jiraDomain}`);
    console.log(`  - Email: ${project.jiraEmail}`);
    console.log(`  - Token length: ${project.jiraApiToken?.length || 0}`);
    console.log(`  - Token starts with: ${project.jiraApiToken?.substring(0, 15) || 'N/A'}...`);
    console.log(`  - Token ends with: ...${project.jiraApiToken?.substring(Math.max(0, (project.jiraApiToken?.length || 0) - 15)) || 'N/A'}`);
    console.log('');
  });
  
} catch (error) {
  console.error('❌ Error parseando:', error.message);
  process.exit(1);
}

