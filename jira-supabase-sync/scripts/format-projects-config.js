/**
 * Script para formatear y validar PROJECTS_CONFIG
 * Convierte el JSON que proporcionaste al formato correcto
 */

// NOTA: Este script usa placeholders. Reemplaza con tus tokens reales antes de usar en GitHub Secrets
const inputJson = `{"projectKey":"OBD","projectName":"Orderbahn","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_GOAVANTO"},{"projectKey":"ODSO","projectName":"Core-Infrastructure","jiraDomain":"goavanto.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_GOAVANTO"},{"projectKey":"IN","projectName":"Integration","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_AGILEDREAMTEAM"},{"projectKey":"APM","projectName":"Product Board","jiraDomain":"agiledreamteam.atlassian.net","jiraEmail":"carlos.cedeno@agenticdream.com","jiraApiToken":"TOKEN_AGILEDREAMTEAM"}`;

try {
  // Agregar corchetes para hacerlo un array válido
  const arrayJson = `[${inputJson}]`;
  
  // Parsear para validar
  const parsed = JSON.parse(arrayJson);
  
  console.log('\n✅ JSON válido! Formateado correctamente:\n');
  console.log('='.repeat(60));
  console.log('📋 FORMATO PRETTY (para referencia):');
  console.log('='.repeat(60));
  console.log(JSON.stringify(parsed, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 FORMATO MINIFICADO (para GitHub Secrets):');
  console.log('='.repeat(60));
  const minified = JSON.stringify(parsed);
  console.log(minified);
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 INSTRUCCIONES:');
  console.log('='.repeat(60));
  console.log('1. Copia el JSON minificado de arriba');
  console.log('2. Ve a GitHub → Settings → Secrets and variables → Actions');
  console.log('3. Crea o edita el secret: PROJECTS_CONFIG');
  console.log('4. Pega el JSON minificado');
  console.log('5. IMPORTANTE: Reemplaza los tokens placeholder con los tokens reales');
  console.log('   - TOKEN_GOAVANTO → Token real para goavanto.atlassian.net');
  console.log('   - TOKEN_AGILEDREAMTEAM → Token real para agiledreamteam.atlassian.net');
  console.log('\n6. Verifica con: npm run verify-config');
  
  // Validar estructura
  console.log('\n' + '='.repeat(60));
  console.log('✅ VALIDACIÓN:');
  console.log('='.repeat(60));
  parsed.forEach((project, idx) => {
    const errors = [];
    if (!project.projectKey) errors.push('falta projectKey');
    if (!project.jiraDomain) errors.push('falta jiraDomain');
    if (!project.jiraEmail) errors.push('falta jiraEmail');
    if (!project.jiraApiToken) errors.push('falta jiraApiToken');
    
    if (errors.length === 0) {
      console.log(`✅ Proyecto ${idx + 1} (${project.projectKey}): OK`);
    } else {
      console.log(`❌ Proyecto ${idx + 1} (${project.projectKey}): ${errors.join(', ')}`);
    }
  });
  
} catch (error) {
  console.error('❌ Error parseando JSON:', error.message);
  process.exit(1);
}




