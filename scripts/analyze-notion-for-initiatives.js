/**
 * Script para analizar páginas de Notion para las iniciativas del CSV de productos
 * Primero obtiene las iniciativas del CSV, luego analiza su estructura en Notion
 */

import dotenv from 'dotenv';
dotenv.config();

// Usar Supabase Edge Function
const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 
  (process.env.VITE_SUPABASE_URL 
    ? `${process.env.VITE_SUPABASE_URL}/functions/v1/notion-proxy`
    : 'https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy');
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
    
    // Encontrar índices de columnas relevantes
    const initiativeIndex = headers.findIndex(h => 
      h.toLowerCase().includes('initiative')
    );
    
    // Buscar columna con URL de Notion (puede llamarse "Notion", "Link", "URL", "Doc Link", etc.)
    const notionUrlIndex = headers.findIndex(h => {
      const lower = h.toLowerCase();
      return lower.includes('notion') || 
             (lower.includes('link') && !lower.includes('attachment')) ||
             lower.includes('url') ||
             lower.includes('doc link') ||
             lower.includes('documentation');
    });
    
    if (initiativeIndex === -1) {
      throw new Error('Could not find "Initiative" column');
    }
    
    // Extraer iniciativas con sus URLs de Notion si existen
    const initiativesMap = new Map();
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const initiativeName = values[initiativeIndex]?.trim();
      const notionUrl = notionUrlIndex >= 0 ? values[notionUrlIndex]?.trim() : null;
      
      if (initiativeName) {
        initiativesMap.set(initiativeName, {
          name: initiativeName,
          notionUrl: notionUrl || null
        });
      }
    }
    
    console.log(`✅ Found ${initiativesMap.size} unique initiatives`);
    if (notionUrlIndex >= 0) {
      const withUrls = Array.from(initiativesMap.values()).filter(i => i.notionUrl).length;
      console.log(`   ${withUrls} have Notion URLs in CSV\n`);
    } else {
      console.log(`   (No Notion URL column found in CSV)\n`);
    }
    
    return Array.from(initiativesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    
  } catch (error) {
    console.error('❌ Error fetching initiatives from CSV:', error.message);
    throw error;
  }
}

/**
 * Analiza una página de Notion para una iniciativa
 */
async function analyzeNotionPage(initiativeInfo) {
  const initiativeName = initiativeInfo.name;
  const csvNotionUrl = initiativeInfo.notionUrl;
  
  try {
    let page = null;
    let pages = [];
    
    // Si tenemos URL de Notion del CSV, intentar extraer el page ID
    if (csvNotionUrl) {
      console.log(`   📎 Found Notion URL in CSV: ${csvNotionUrl}`);
      
      // Intentar extraer page ID de la URL de Notion
      // Formato: https://www.notion.so/[workspace]/[page-title]-[page-id]
      const pageIdMatch = csvNotionUrl.match(/([a-f0-9]{32})/i);
      if (pageIdMatch) {
        const pageIdFromUrl = pageIdMatch[1];
        // Formatear como UUID (agregar guiones)
        const formattedId = `${pageIdFromUrl.slice(0, 8)}-${pageIdFromUrl.slice(8, 12)}-${pageIdFromUrl.slice(12, 16)}-${pageIdFromUrl.slice(16, 20)}-${pageIdFromUrl.slice(20)}`;
        
        console.log(`   🔍 Trying to fetch page by ID: ${formattedId}`);
        
        // Intentar obtener la página directamente por ID
        // Nota: Necesitaríamos un endpoint para obtener página por ID, por ahora usamos búsqueda
      }
    }
    
    // Buscar página en Notion por nombre (en todas las bases de datos)
    // No especificamos databaseId para buscar en todas
    const searchUrl = `${NOTION_PROXY_URL}?action=searchPages&initiativeName=${encodeURIComponent(initiativeName)}`;
    console.log(`   🔍 Searching in all accessible databases...`);
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      let errorMessage = searchResponse.statusText;
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      return {
        initiative: initiativeName,
        csvNotionUrl: csvNotionUrl,
        found: false,
        error: errorMessage
      };
    }
    
    let searchData;
    try {
      const responseText = await searchResponse.text();
      searchData = JSON.parse(responseText);
    } catch (e) {
      return {
        initiative: initiativeName,
        csvNotionUrl: csvNotionUrl,
        found: false,
        error: `Invalid JSON response: ${e.message}`
      };
    }
    pages = searchData.results || [];
    
    if (pages.length === 0) {
      return {
        initiative: initiativeName,
        csvNotionUrl: csvNotionUrl,
        found: false,
        reason: 'No pages found in Notion'
      };
    }
    
    // Si tenemos URL del CSV, verificar si coincide con alguna página encontrada
    if (csvNotionUrl && pages.length > 0) {
      const matchingPage = pages.find(p => csvNotionUrl.includes(p.id.replace(/-/g, '')));
      if (matchingPage) {
        console.log(`   ✅ CSV URL matches found page!`);
        page = matchingPage;
      } else {
        console.log(`   ⚠️  CSV URL doesn't match found pages, using first result`);
        page = pages[0];
      }
    } else {
      // Analizar primera página encontrada
      page = pages[0];
    }
    
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
    
    // Buscar propiedades de tipo URL que puedan contener links
    const urlProperties = {};
    Object.entries(properties).forEach(([propName, prop]) => {
      if (prop.type === 'url' && prop.url) {
        urlProperties[propName] = prop.url;
      }
    });
    
    return {
      initiative: initiativeName,
      csvNotionUrl: csvNotionUrl,
      found: true,
      pageId: pageId,
      url: page.url,
      properties: propertyInfo,
      urlProperties: urlProperties, // Propiedades de tipo URL encontradas
      blockTypes: blockTypes,
      totalBlocks: blocks.length,
      lastEdited: page.last_edited_time,
      matchesCsvUrl: csvNotionUrl ? page.url.includes(pageId.replace(/-/g, '')) : null
    };
    
  } catch (error) {
    return {
      initiative: initiativeName,
      csvNotionUrl: csvNotionUrl,
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
      if (init.notionUrl) {
        console.log(`   ${index + 1}. ${init.name} [📎 Has Notion URL]`);
      } else {
        console.log(`   ${index + 1}. ${init.name}`);
      }
    });
    console.log('');
    
    // 2. Analizar cada iniciativa en Notion
    console.log('🔍 Analyzing Notion pages...');
    console.log('='.repeat(60));
    console.log('');
    
    const results = [];
    
    for (const initiative of initiatives) {
      console.log(`\n📄 ${initiative.name}`);
      console.log('-'.repeat(60));
      
      const analysis = await analyzeNotionPage(initiative);
      results.push(analysis);
      
      if (analysis.found) {
        console.log(`   ✅ Found in Notion`);
        console.log(`   URL: ${analysis.url}`);
        if (analysis.csvNotionUrl) {
          console.log(`   CSV URL: ${analysis.csvNotionUrl}`);
          if (analysis.matchesCsvUrl) {
            console.log(`   ✅ URLs match!`);
          } else {
            console.log(`   ⚠️  URLs don't match`);
          }
        }
        console.log(`   Blocks: ${analysis.totalBlocks}`);
        console.log(`   Properties: ${Object.keys(analysis.properties).length}`);
        console.log(`   Block Types: ${Object.keys(analysis.blockTypes).join(', ')}`);
        
        // Mostrar propiedades de tipo URL
        if (Object.keys(analysis.urlProperties || {}).length > 0) {
          console.log(`   URL Properties:`);
          Object.entries(analysis.urlProperties).forEach(([propName, url]) => {
            console.log(`     ${propName}: ${url}`);
          });
        }
        
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
        if (analysis.csvNotionUrl) {
          console.log(`   📎 CSV has URL but page not found: ${analysis.csvNotionUrl}`);
        }
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
