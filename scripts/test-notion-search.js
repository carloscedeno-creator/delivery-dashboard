/**
 * Script para probar búsqueda de páginas en Notion por nombre de iniciativa
 * Útil para verificar cómo funciona la búsqueda antes de extraer datos
 */

import dotenv from 'dotenv';
dotenv.config();

const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 'https://sheets-proxy.carlos-cedeno.workers.dev/notion';

/**
 * Busca páginas en Notion por nombre de iniciativa
 */
async function searchInitiative(initiativeName) {
  try {
    console.log(`🔍 Searching for: "${initiativeName}"`);
    console.log('='.repeat(60));

    const url = `${NOTION_PROXY_URL}?action=searchPages&initiativeName=${encodeURIComponent(initiativeName)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    const pages = data.results || [];

    console.log(`\n✅ Found ${pages.length} page(s)\n`);

    if (pages.length === 0) {
      console.log('⚠️  No pages found. Possible reasons:');
      console.log('   - Initiative name does not match exactly');
      console.log('   - Property name in search filter is incorrect');
      console.log('   - Database does not contain this initiative');
      console.log('\n💡 Try:');
      console.log('   1. Check the exact property name in notionConfig.js');
      console.log('   2. Run inspect-notion-structure.js to see available properties');
      console.log('   3. Verify the initiative name matches exactly in Notion');
      return;
    }

    // Mostrar detalles de cada página encontrada
    pages.forEach((page, index) => {
      console.log(`\n📄 Page ${index + 1}:`);
      console.log('-'.repeat(60));
      console.log(`ID: ${page.id}`);
      console.log(`URL: ${page.url}`);
      console.log(`Created: ${page.created_time}`);
      console.log(`Last Edited: ${page.last_edited_time}`);

      // Mostrar todas las propiedades
      const properties = page.properties || {};
      console.log('\nProperties:');
      Object.entries(properties).forEach(([propName, prop]) => {
        let value = '(empty)';
        
        switch (prop.type) {
          case 'title':
            value = prop.title?.[0]?.plain_text || '(empty)';
            break;
          case 'rich_text':
            value = prop.rich_text?.[0]?.plain_text || '(empty)';
            break;
          case 'select':
            value = prop.select?.name || '(empty)';
            break;
          case 'multi_select':
            value = prop.multi_select?.map(s => s.name).join(', ') || '(empty)';
            break;
          case 'number':
            value = prop.number ?? '(empty)';
            break;
          case 'date':
            value = prop.date?.start || '(empty)';
            break;
          case 'checkbox':
            value = prop.checkbox ? '✓' : '✗';
            break;
          case 'people':
            value = prop.people?.map(p => p.name || p.id).join(', ') || '(empty)';
            break;
          case 'url':
            value = prop.url || '(empty)';
            break;
        }
        
        console.log(`  ${propName} (${prop.type}): ${value}`);
      });
    });

    // Si hay páginas, ofrecer analizar contenido
    if (pages.length > 0) {
      console.log('\n\n💡 Next steps:');
      console.log('   - Run inspect-notion-structure.js to see full database structure');
      console.log('   - Test extraction with: extractInitiativeData()');
      console.log('   - Check page content with getPageBlocks()');
    }

  } catch (error) {
    console.error('\n❌ Error searching:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check VITE_NOTION_PROXY_URL is correct');
    console.error('2. Verify Cloudflare Worker is deployed');
    console.error('3. Check searchPages action is implemented correctly');
    process.exit(1);
  }
}

// Obtener nombre de iniciativa de argumentos o usar ejemplo
const initiativeName = process.argv[2] || 'Strata Public API';

// Ejecutar
searchInitiative(initiativeName)
  .then(() => {
    console.log('\n✅ Search completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
