/**
 * Script para inspeccionar la estructura de datos en Notion
 * Analiza la base de datos, propiedades, y contenido de páginas
 */

import dotenv from 'dotenv';
dotenv.config();

// Usar Supabase Edge Function
const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 
  (process.env.VITE_SUPABASE_URL 
    ? `${process.env.VITE_SUPABASE_URL}/functions/v1/notion-proxy`
    : 'https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy');

/**
 * Obtiene información de la base de datos de Notion
 */
async function inspectDatabase() {
  try {
    console.log('📊 Inspecting Notion Database Structure');
    console.log('='.repeat(60));

    // Obtener todas las páginas (sin filtro)
    const url = `${NOTION_PROXY_URL}?action=getDatabasePages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    const pages = data.results || [];

    console.log(`\n✅ Found ${pages.length} pages in database\n`);

    if (pages.length === 0) {
      console.log('⚠️  No pages found. Check:');
      console.log('   - Database ID is correct');
      console.log('   - Integration has access to database');
      console.log('   - Database is not empty');
      return;
    }

    // Analizar primera página para ver estructura
    const firstPage = pages[0];
    console.log('📄 Sample Page Structure:');
    console.log('-'.repeat(60));
    console.log(`Page ID: ${firstPage.id}`);
    console.log(`URL: ${firstPage.url}`);
    console.log(`Created: ${firstPage.created_time}`);
    console.log(`Last Edited: ${firstPage.last_edited_time}`);

    // Analizar propiedades
    console.log('\n📋 Properties in Database:');
    console.log('-'.repeat(60));
    const properties = firstPage.properties || {};
    const propertyNames = Object.keys(properties);
    
    console.log(`\nTotal properties: ${propertyNames.length}\n`);

    propertyNames.forEach((propName, index) => {
      const prop = properties[propName];
      console.log(`${index + 1}. ${propName}`);
      console.log(`   Type: ${prop.type}`);
      
      // Mostrar ejemplo de valor según tipo
      switch (prop.type) {
        case 'title':
          const titleValue = prop.title?.[0]?.plain_text || '(empty)';
          console.log(`   Value: "${titleValue}"`);
          break;
        case 'rich_text':
          const richTextValue = prop.rich_text?.[0]?.plain_text || '(empty)';
          console.log(`   Value: "${richTextValue.substring(0, 50)}${richTextValue.length > 50 ? '...' : ''}"`);
          break;
        case 'select':
          console.log(`   Value: ${prop.select?.name || '(empty)'}`);
          break;
        case 'multi_select':
          const multiSelectValues = prop.multi_select?.map(s => s.name).join(', ') || '(empty)';
          console.log(`   Values: [${multiSelectValues}]`);
          break;
        case 'number':
          console.log(`   Value: ${prop.number ?? '(empty)'}`);
          break;
        case 'date':
          console.log(`   Value: ${prop.date?.start || '(empty)'}`);
          break;
        case 'checkbox':
          console.log(`   Value: ${prop.checkbox ? '✓' : '✗'}`);
          break;
        case 'people':
          const peopleNames = prop.people?.map(p => p.name || p.id).join(', ') || '(empty)';
          console.log(`   Values: [${peopleNames}]`);
          break;
        case 'url':
          console.log(`   Value: ${prop.url || '(empty)'}`);
          break;
        case 'relation':
          console.log(`   Relations: ${prop.relation?.length || 0} items`);
          break;
        default:
          console.log(`   Value: (unknown type: ${prop.type})`);
      }
      console.log('');
    });

    // Analizar valores únicos de propiedades importantes
    console.log('\n📊 Property Value Analysis:');
    console.log('-'.repeat(60));

    // Buscar propiedad que podría ser "Initiative"
    const possibleInitiativeProps = propertyNames.filter(name => 
      name.toLowerCase().includes('initiative') || 
      name.toLowerCase().includes('nombre') ||
      name.toLowerCase().includes('title')
    );

    if (possibleInitiativeProps.length > 0) {
      console.log('\n🔍 Possible "Initiative" properties:');
      possibleInitiativeProps.forEach(propName => {
        const values = new Set();
        pages.slice(0, 10).forEach(page => {
          const prop = page.properties[propName];
          if (prop?.type === 'title' && prop.title?.[0]?.plain_text) {
            values.add(prop.title[0].plain_text);
          } else if (prop?.type === 'rich_text' && prop.rich_text?.[0]?.plain_text) {
            values.add(prop.rich_text[0].plain_text);
          }
        });
        console.log(`\n   ${propName}:`);
        console.log(`   Sample values (first 10):`);
        Array.from(values).slice(0, 10).forEach(val => {
          console.log(`     - "${val}"`);
        });
      });
    }

    // Buscar propiedad de estado
    const possibleStatusProps = propertyNames.filter(name => 
      name.toLowerCase().includes('status') || 
      name.toLowerCase().includes('estado')
    );

    if (possibleStatusProps.length > 0) {
      console.log('\n🔍 Possible "Status" properties:');
      possibleStatusProps.forEach(propName => {
        const values = new Set();
        pages.forEach(page => {
          const prop = page.properties[propName];
          if (prop?.type === 'select' && prop.select?.name) {
            values.add(prop.select.name);
          } else if (prop?.type === 'multi_select') {
            prop.multi_select?.forEach(s => values.add(s.name));
          }
        });
        console.log(`\n   ${propName}:`);
        console.log(`   Unique values: ${Array.from(values).join(', ')}`);
      });
    }

    // Buscar propiedad de completación
    const possibleCompletionProps = propertyNames.filter(name => 
      name.toLowerCase().includes('complet') || 
      name.toLowerCase().includes('progress') ||
      name.toLowerCase().includes('porcentaje')
    );

    if (possibleCompletionProps.length > 0) {
      console.log('\n🔍 Possible "Completion" properties:');
      possibleCompletionProps.forEach(propName => {
        const prop = pages[0].properties[propName];
        console.log(`\n   ${propName}:`);
        console.log(`   Type: ${prop?.type}`);
        if (prop?.type === 'number') {
          const values = pages.slice(0, 5).map(p => p.properties[propName]?.number).filter(v => v !== undefined);
          console.log(`   Sample values: ${values.join(', ')}`);
        }
      });
    }

    // Analizar contenido de una página de ejemplo
    if (pages.length > 0) {
      console.log('\n\n📝 Analyzing Page Content:');
      console.log('='.repeat(60));
      
      const samplePage = pages[0];
      const pageId = samplePage.id;
      
      console.log(`\nAnalyzing page: ${pageId}`);
      console.log(`URL: ${samplePage.url}\n`);

      // Obtener bloques de la página
      const blocksUrl = `${NOTION_PROXY_URL}?action=getPageBlocks&pageId=${pageId}`;
      const blocksResponse = await fetch(blocksUrl);

      if (blocksResponse.ok) {
        const blocksData = await blocksResponse.json();
        const blocks = blocksData.results || [];

        console.log(`✅ Found ${blocks.length} blocks\n`);

        // Analizar tipos de bloques
        const blockTypes = {};
        blocks.forEach(block => {
          const type = block.type;
          blockTypes[type] = (blockTypes[type] || 0) + 1;
        });

        console.log('📦 Block Types Found:');
        Object.entries(blockTypes).forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });

        // Mostrar primeros bloques como ejemplo
        console.log('\n📄 Sample Blocks (first 5):');
        blocks.slice(0, 5).forEach((block, index) => {
          console.log(`\n${index + 1}. Type: ${block.type}`);
          if (block.type === 'paragraph' && block.paragraph?.rich_text) {
            const text = block.paragraph.rich_text.map(rt => rt.plain_text).join('');
            console.log(`   Text: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
          } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
            const text = block.heading_1.rich_text.map(rt => rt.plain_text).join('');
            console.log(`   Text: "${text}"`);
          } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
            const text = block.heading_2.rich_text.map(rt => rt.plain_text).join('');
            console.log(`   Text: "${text}"`);
          } else if (block.type === 'heading_3' && block.heading_3?.rich_text) {
            const text = block.heading_3.rich_text.map(rt => rt.plain_text).join('');
            console.log(`   Text: "${text}"`);
          } else if (block.type === 'to_do' && block.to_do) {
            const text = block.to_do.rich_text?.map(rt => rt.plain_text).join('') || '';
            const checked = block.to_do.checked ? '[x]' : '[ ]';
            console.log(`   ${checked} ${text}`);
          } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
            const text = block.bulleted_list_item.rich_text.map(rt => rt.plain_text).join('');
            console.log(`   • ${text}`);
          } else if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
            const text = block.numbered_list_item.rich_text.map(rt => rt.plain_text).join('');
            console.log(`   1. ${text}`);
          } else {
            console.log(`   (No text content or unsupported type)`);
          }
          if (block.has_children) {
            console.log(`   Has children: Yes`);
          }
        });
      } else {
        const error = await blocksResponse.json();
        console.log(`⚠️  Could not fetch blocks: ${error.error || blocksResponse.statusText}`);
        console.log('   Make sure getPageBlocks is implemented in Cloudflare Worker');
      }
    }

    // Resumen y recomendaciones
    console.log('\n\n💡 Recommendations:');
    console.log('='.repeat(60));
    console.log('\nBased on the analysis:');
    console.log('1. Update notionConfig.js with correct property names');
    console.log('2. Adjust extraction logic based on actual block types');
    console.log('3. Configure search filters based on actual property structure');
    console.log('4. Test extraction with a specific initiative name\n');

  } catch (error) {
    console.error('\n❌ Error inspecting Notion structure:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check VITE_NOTION_PROXY_URL is correct');
    console.error('2. Verify Cloudflare Worker is deployed');
    console.error('3. Check Notion API credentials in Worker');
    console.error('4. Verify database ID is correct');
    process.exit(1);
  }
}

// Ejecutar
inspectDatabase()
  .then(() => {
    console.log('\n✅ Inspection completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
