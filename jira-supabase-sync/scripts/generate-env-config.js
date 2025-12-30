/**
 * Script para generar el PROJECTS_CONFIG comprimido para .env
 * Lee PROJECTS_CONFIG_LOCAL.json y genera el JSON en una línea
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, '..', 'PROJECTS_CONFIG_LOCAL.json');

try {
  const configContent = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);
  
  // Validar que no haya TOKEN_GOAVANTO sin reemplazar
  const hasPlaceholder = config.some(p => 
    p.jiraApiToken === 'TOKEN_GOAVANTO' || 
    p.jiraApiToken === 'REEMPLAZA_CON_TOKEN_DE_GOAVANTO'
  );
  
  if (hasPlaceholder) {
    console.log('⚠️ ADVERTENCIA: Hay tokens placeholder que necesitan ser reemplazados:');
    config.forEach((p, i) => {
      if (p.jiraApiToken === 'TOKEN_GOAVANTO' || p.jiraApiToken === 'REEMPLAZA_CON_TOKEN_DE_GOAVANTO') {
        console.log(`   - Proyecto ${i + 1} (${p.projectKey}): ${p.jiraApiToken}`);
      }
    });
    console.log('\n💡 Reemplaza TOKEN_GOAVANTO con tu token real de goavanto.atlassian.net');
    console.log('   Luego ejecuta este script de nuevo.\n');
  }
  
  // Generar JSON comprimido (una línea)
  const compressed = JSON.stringify(config);
  
  console.log('\n📋 Agrega esta línea a tu archivo .env:\n');
  console.log('='.repeat(80));
  console.log(`PROJECTS_CONFIG=${compressed}`);
  console.log('='.repeat(80));
  console.log('\n✅ Copia la línea de arriba y agrega al final de tu .env\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('\n💡 Asegúrate de que PROJECTS_CONFIG_LOCAL.json existe y es válido');
  process.exit(1);
}




