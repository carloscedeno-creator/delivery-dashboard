/**
 * Script para analizar páginas de Notion para las iniciativas del CSV de productos
 * Primero obtiene las iniciativas del CSV, luego analiza su estructura en Notion
 */

import dotenv from 'dotenv';
dotenv.config();

const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 'https://sheets-proxy.carlos-cedeno.workers.dev/notion';
const PRODUCT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv';
const PROXY_URL = process.env.VITE_PROXY_URL || 'https://sheets-proxy.carlos-cedeno.workers.dev';

/**
 * Obtiene las iniciativas del CSV de productos
 */
async function getInitiativesFromCSV() {
  try {
    console.log('📊 Fetching initiatives from Product CSV...');
    
    const csvUrl = `${PROXY_URL}?url=${encodeURIComponent(PRODUCT_CSV_URL)}`;
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV is empty');
    }
    
    // Encontrar header row (buscar "Initiative" o "initiative")
    let headerIndex = -1;
    let headers = [];
    
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const lowerLine = lines[i].toLowerCase();
      if (lowerLine.includes('initiative')) {
        headerIndex = i;
        headers = lines[i].split(',').map(h => h.trim().replace(/"/g, ''));
        break;
      }
    }
    
    if (headerIndex === -1) {
      throw new Error('Could not find header row with "Initiative"');
    }
    
    // Encontrar índice de la columna "Initiative"
    const initiativeIndex = headers.findIndex(h => 
      h.toLowerCase().includes('initiative')
    );
    
    if (initiativeIndex === -1) {
      throw new Error('Could not find "Initiative" column');
    }
    
    // Extraer iniciativas únicas
    const initiatives = new Set();
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values[initiativeIndex] && values[initiativeIndex].trim()) {
        initiatives.add(values[initiativeIndex].trim());
      }
    }
    
    console.log(`✅ Found ${initiatives.size} unique initiatives\n`);
    return Array.from(initiatives).sort();
    
  } catch (error) {
    console.error('❌ Error fetching initiatives from CSV:', error.message);
    throw error;
  }
}

/**
 * Analiza una página de Notion para una iniciativa
 */
async function analyzeNotionPage(initiativeName) {
  try {
    // Buscar página en Notion
    const searchUrl = `${NOTION_PROXY_URL}?action=searchPages&initiativeName=${encodeURIComponent(initiativeName)}`;
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      return {
        initiative: initiativeName,
        found: false,
        error: error.error || searchResponse.statusText
      };
    }
    
    const searchData = await searchResponse.json();
    const pages = searchData.results || [];
    
    if (pages.length === 0) {
      return {
        initiative: initiativeName,
        found: false,
        reason: 'No pages found in Notion'
      };
    }
    
    // Analizar primera página encontrada
    const page = pages[0];
    const pageId = page.id;
    
    // Obtener bloques
    const blocksUrl = `${NOTION_PROXY_URL}?action=getPageBlocks&pageId=${pageId}`;
    const blocksResponse = await fetch(blocksUrl);
    
    let blocks = [];
    if (blocksResponse.ok) {
      const blocksData = await blocksResponse.json();
      blocks = blocksData.results || [];
    }
    
    // Analizar propiedades
    const properties = page.properties || {};
    const propertyInfo = {};
    
    Object.entries(properties).forEach(([propName, prop]) => {
      let value = null;
      
      switch (prop.type) {
        case 'title':
          value = prop.title?.[0]?.plain_text || null;
          break;
        case 'rich_text':
          value = prop.rich_text?.[0]?.plain_text || null;
          break;
        case 'select':
          value = prop.select?.name || null;
          break;
        case 'multi_select':
          value = prop.multi_select?.map(s => s.name) || [];
          break;
        case 'number':
          value = prop.number ?? null;
          break;
        case 'date':
          value = prop.date?.start || null;
          break;
        case 'checkbox':
          value = prop.checkbox || false;
          break;
        case 'people':
          value = prop.people?.map(p => p.name || p.id) || [];
          break;
        case 'url':
          value = prop.url || null;
          break;
        default:
          value = `(type: ${prop.type})`;
      }
      
      propertyInfo[propName] = {
        type: prop.type,
        value: value
      };
    });
    
    // Analizar tipos de bloques
    const blockTypes = {};
    blocks.forEach(block => {
      blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
    });
    
    return {
      initiative: initiativeName,
      found: true,
      pageId: pageId,
      url: page.url,
      properties: propertyInfo,
      blockTypes: blockTypes,
      totalBlocks: blocks.length,
      lastEdited: page.last_edited_time
    };
    
  } catch (error) {
    return {
      initiative: initiativeName,
      found: false,
      error: error.message
    };
  }
}

/**
 * Función principal
 */
async function analyzeAllInitiatives() {
  try {
    console.log('🔍 Analyzing Notion Pages for Product Initiatives');
    console.log('='.repeat(60));
    console.log('');
    
    // 1. Obtener iniciativas del CSV
    const initiatives = await getInitiativesFromCSV();
    
    console.log('📋 Initiatives to analyze:');
    initiatives.forEach((init, index) => {
      console.log(`   ${index + 1}. ${init}`);
    });
    console.log('');
    
    // 2. Analizar cada iniciativa en Notion
    console.log('🔍 Analyzing Notion pages...');
    console.log('='.repeat(60));
    console.log('');
    
    const results = [];
    
    for (const initiative of initiatives) {
      console.log(`\n📄 ${initiative}`);
      console.log('-'.repeat(60));
      
      const analysis = await analyzeNotionPage(initiative);
      results.push(analysis);
      
      if (analysis.found) {
        console.log(`   ✅ Found in Notion`);
        console.log(`   URL: ${analysis.url}`);
        console.log(`   Blocks: ${analysis.totalBlocks}`);
        console.log(`   Properties: ${Object.keys(analysis.properties).length}`);
        console.log(`   Block Types: ${Object.keys(analysis.blockTypes).join(', ')}`);
        
        // Mostrar propiedades importantes
        const importantProps = ['Status', 'Completion', 'Progress', 'Estado', 'Completación'];
        importantProps.forEach(propName => {
          if (analysis.properties[propName]) {
            const prop = analysis.properties[propName];
            console.log(`   ${propName}: ${prop.value} (${prop.type})`);
          }
        });
      } else {
        console.log(`   ❌ Not found: ${analysis.reason || analysis.error || 'Unknown error'}`);
      }
      
      // Pequeña pausa para no sobrecargar APIs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // 3. Resumen
    console.log('\n\n📊 Analysis Summary');
    console.log('='.repeat(60));
    
    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found).length;
    
    console.log(`\n✅ Found in Notion: ${found}/${results.length}`);
    console.log(`❌ Not found: ${notFound}/${results.length}`);
    
    if (notFound > 0) {
      console.log('\n⚠️  Initiatives not found in Notion:');
      results
        .filter(r => !r.found)
        .forEach(r => {
          console.log(`   - ${r.initiative}: ${r.reason || r.error || 'Unknown'}`);
        });
    }
    
    // 4. Análisis de estructura común
    if (found > 0) {
      console.log('\n\n📋 Common Structure Analysis');
      console.log('='.repeat(60));
      
      const foundResults = results.filter(r => r.found);
      
      // Propiedades comunes
      const allProps = new Set();
      foundResults.forEach(r => {
        Object.keys(r.properties).forEach(prop => allProps.add(prop));
      });
      
      console.log(`\n📌 All Properties Found (${allProps.size}):`);
      Array.from(allProps).sort().forEach(prop => {
        const count = foundResults.filter(r => r.properties[prop]).length;
        const percentage = Math.round((count / foundResults.length) * 100);
        console.log(`   ${prop}: ${count}/${foundResults.length} (${percentage}%)`);
      });
      
      // Tipos de bloques comunes
      const allBlockTypes = new Set();
      foundResults.forEach(r => {
        Object.keys(r.blockTypes).forEach(type => allBlockTypes.add(type));
      });
      
      console.log(`\n📦 All Block Types Found (${allBlockTypes.size}):`);
      Array.from(allBlockTypes).sort().forEach(type => {
        const count = foundResults.filter(r => r.blockTypes[type]).length;
        const avgCount = foundResults
          .filter(r => r.blockTypes[type])
          .reduce((sum, r) => sum + r.blockTypes[type], 0) / count;
        console.log(`   ${type}: ${count} pages, avg ${Math.round(avgCount)} blocks/page`);
      });
    }
    
    // 5. Recomendaciones
    console.log('\n\n💡 Recommendations');
    console.log('='.repeat(60));
    console.log('\nBased on the analysis:');
    console.log('1. Update notionConfig.js with actual property names found');
    console.log('2. Adjust extraction logic for the block types present');
    console.log('3. Handle initiatives not found in Notion (create pages or adjust names)');
    console.log('4. Configure search filters based on actual property structure\n');
    
    return results;
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check CSV URL is accessible');
    console.error('2. Verify Cloudflare Worker is deployed');
    console.error('3. Check Notion API credentials');
    process.exit(1);
  }
}

// Ejecutar
analyzeAllInitiatives()
  .then(() => {
    console.log('\n✅ Analysis completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
