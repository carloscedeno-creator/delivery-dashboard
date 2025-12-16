/**
 * Script para sincronizar iniciativas de Notion con Supabase
 * Obtiene iniciativas del CSV y sincroniza automáticamente
 * Usa Cloudflare Worker como proxy y anon key como service_role (son iguales)
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// IMPORTANTE: Usar service_role key para poder insertar/actualizar (bypass RLS)
// La anon key solo tiene permisos de lectura según las políticas RLS
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
// Usar Supabase Edge Function para Notion proxy
const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 
  (SUPABASE_URL 
    ? `${SUPABASE_URL}/functions/v1/notion-proxy`
    : 'https://sheets-proxy.carlos-cedeno.workers.dev/notion');
const PRODUCT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv';
const PROXY_URL = process.env.VITE_PROXY_URL || 'https://sheets-proxy.carlos-cedeno.workers.dev';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('   Required: VITE_SUPABASE_URL');
  console.error('   Required: SUPABASE_SERVICE_ROLE_KEY (para insertar/actualizar)');
  console.error('   Note: VITE_SUPABASE_ANON_KEY solo tiene permisos de lectura');
  process.exit(1);
}

// Advertir si está usando anon key (solo lectura)
if (process.env.VITE_SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️  WARNING: Using anon key. This may cause RLS policy errors.');
  console.warn('   For write operations, use SUPABASE_SERVICE_ROLE_KEY instead.');
  console.warn('   Get it from: Supabase Dashboard → Settings → API → service_role key\n');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Obtiene las iniciativas del CSV de productos
 */
async function getInitiativesFromCSV() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
  
  try {
    console.log('📊 Fetching initiatives from Product CSV...');
    
    const csvUrl = `${PROXY_URL}?url=${encodeURIComponent(PRODUCT_CSV_URL)}`;
    const response = await fetch(csvUrl, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV is empty');
    }
    
    // Encontrar header row
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
    
    const initiativeIndex = headers.findIndex(h => 
      h.toLowerCase().includes('initiative')
    );
    
    if (initiativeIndex === -1) {
      throw new Error('Could not find "Initiative" column');
    }
    
    // Extraer iniciativas únicas
    const initiativesSet = new Set();
    
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const initiativeName = values[initiativeIndex]?.trim();
      
      if (initiativeName) {
        initiativesSet.add(initiativeName);
      }
    }
    
    const initiatives = Array.from(initiativesSet).sort();
    console.log(`✅ Found ${initiatives.length} unique initiatives\n`);
    
    return initiatives;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('Timeout fetching CSV (30s timeout exceeded)');
    }
    
    console.error('❌ Error fetching initiatives from CSV:', error.message);
    throw error;
  }
}

/**
 * Busca páginas de Notion para una iniciativa
 */
async function searchNotionPages(initiativeName) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
  
  try {
    // Supabase Edge Function: POST con body JSON (formato recomendado)
    const response = await fetch(NOTION_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        action: 'searchPages',
        initiativeName: initiativeName
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Notion API error: ${response.statusText} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error(`[NOTION] Timeout searching for "${initiativeName}" (30s timeout exceeded)`);
      return [];
    }
    
    console.error(`[NOTION] Error searching for "${initiativeName}":`, error.message);
    return [];
  }
}

/**
 * Extrae el valor de una propiedad de Notion
 */
function extractPropertyValue(prop) {
  if (!prop) return null;
  
  // Diferentes tipos de propiedades de Notion
  if (prop.type === 'title' && prop.title) {
    return prop.title[0]?.plain_text || null;
  }
  if (prop.type === 'rich_text' && prop.rich_text) {
    return prop.rich_text[0]?.plain_text || null;
  }
  if (prop.type === 'number') {
    return prop.number;
  }
  if (prop.type === 'select' && prop.select) {
    return prop.select.name || prop.select.value || null;
  }
  if (prop.type === 'status' && prop.status) {
    return prop.status.name || prop.status.value || null;
  }
  if (prop.type === 'checkbox') {
    return prop.checkbox;
  }
  if (prop.type === 'date' && prop.date) {
    return prop.date.start || null;
  }
  if (prop.type === 'formula' && prop.formula) {
    if (prop.formula.type === 'number') return prop.formula.number;
    if (prop.formula.type === 'string') return prop.formula.string;
    if (prop.formula.type === 'boolean') return prop.formula.boolean;
  }
  
  // Si es un objeto simple, intentar extraer name o value
  if (typeof prop === 'object') {
    return prop.name || prop.value || prop;
  }
  
  return prop;
}

/**
 * Extrae métricas de una página de Notion
 * Maneja diferentes variaciones de nombres de propiedades
 */
function extractMetrics(page) {
  const properties = page.properties || {};
  
  // Extraer todas las propiedades disponibles para debugging
  const allProperties = {};
  Object.entries(properties).forEach(([propName, prop]) => {
    allProperties[propName] = extractPropertyValue(prop);
  });
  
  // Extraer Status - verificar múltiples nombres posibles
  let status = 'planned';
  const statusProp = properties.Status || 
                      properties.status || 
                      properties.Estado || 
                      properties.estado ||
                      properties['Task name']?.status;
  
  if (statusProp) {
    const statusValue = extractPropertyValue(statusProp);
    const statusMap = {
      'Not Started': 'planned',
      'In Progress': 'in_progress',
      'Done': 'done',
      'Completed': 'done',
      'Blocked': 'blocked',
      'On Hold': 'blocked',
      'Paused': 'blocked'
    };
    
    if (statusValue) {
      status = statusMap[statusValue] || 
               statusValue?.toLowerCase().replace(/\s+/g, '_') || 
               'planned';
    }
  }
  
  // Extraer Story Points - verificar múltiples nombres posibles
  let storyPointsTotal = 0;
  let storyPointsDone = 0;
  
  const storyPointsProp = properties['Story Points'] || 
                          properties['Story point estimate'] || 
                          properties.storyPoints ||
                          properties['Story Points Total'] ||
                          properties['Points'];
  
  if (storyPointsProp !== null && storyPointsProp !== undefined) {
    const pointsValue = extractPropertyValue(storyPointsProp);
    storyPointsTotal = typeof pointsValue === 'number' 
      ? pointsValue 
      : parseInt(pointsValue) || 0;
    
    // Calcular completados basado en status o propiedad específica
    const storyPointsDoneProp = properties['Story Points Done'] || 
                                properties['Points Done'] ||
                                properties.storyPointsDone;
    
    if (storyPointsDoneProp !== null && storyPointsDoneProp !== undefined) {
      const doneValue = extractPropertyValue(storyPointsDoneProp);
      storyPointsDone = typeof doneValue === 'number' 
        ? doneValue 
        : parseInt(doneValue) || 0;
    } else {
      // Calcular basado en status si no hay propiedad específica
      if (status === 'done') {
        storyPointsDone = storyPointsTotal;
      } else if (status === 'in_progress') {
        storyPointsDone = Math.round(storyPointsTotal * 0.5);
      }
    }
  }
  
  // Extraer Completion - verificar múltiples nombres posibles
  let completion = null;
  const completionProp = properties.Completion || 
                         properties['Completion %'] || 
                         properties.completion ||
                         properties.Progress ||
                         properties['Progress %'];
  
  if (completionProp !== null && completionProp !== undefined) {
    const completionValue = extractPropertyValue(completionProp);
    completion = typeof completionValue === 'number' 
      ? completionValue 
      : parseInt(completionValue) || 0;
  } else {
    // Calcular basado en status si no hay propiedad específica
    if (status === 'done') {
      completion = 100;
    } else if (status === 'in_progress') {
      completion = 50;
    } else {
      completion = 0;
    }
  }
  
  return {
    status,
    completion,
    storyPointsTotal,
    storyPointsDone,
    properties: allProperties // Incluir todas las propiedades para debugging
  };
}

/**
 * Sincroniza una iniciativa con Supabase
 */
async function syncInitiative(initiativeName) {
  try {
    console.log(`\n📊 Processing: ${initiativeName}`);
    console.log('-'.repeat(60));

    // 1. Buscar en Notion
    const pages = await searchNotionPages(initiativeName);

    if (pages.length === 0) {
      console.log(`   ⚠️  No Notion pages found`);
      return {
        initiative: initiativeName,
        success: false,
        reason: 'not_found'
      };
    }

    console.log(`   ✅ Found ${pages.length} page(s)`);

    // 2. Procesar cada página
    const results = [];
    for (const page of pages) {
      const metrics = extractMetrics(page);
      
      console.log(`   📈 Metrics from "${page.properties?.Name?.title?.[0]?.plain_text || 'Unknown'}":`);
      console.log(`      - Status: ${metrics.status}`);
      console.log(`      - Completion: ${metrics.completion}%`);
      console.log(`      - Story Points: ${metrics.storyPointsDone}/${metrics.storyPointsTotal}`);

      // 3. Sincronizar con Supabase
      const today = new Date().toISOString().split('T')[0];
      
      // Insertar/actualizar métricas
      const { error: metricsError } = await supabase
        .from('notion_extracted_metrics')
        .upsert({
          initiative_name: initiativeName,
          extraction_date: today,
          status: metrics.status,
          completion_percentage: metrics.completion,
          story_points_done: metrics.storyPointsDone,
          story_points_total: metrics.storyPointsTotal,
          raw_metrics: metrics.properties,
          source: 'notion_sync',
          created_at: new Date().toISOString()
        }, {
          onConflict: 'initiative_name,extraction_date'
        });

      if (metricsError) {
        console.error(`   ❌ Error syncing metrics:`, metricsError.message);
        results.push({ pageId: page.id, success: false, error: metricsError.message });
      } else {
        console.log(`   ✅ Synced to Supabase`);
        results.push({ pageId: page.id, success: true });
      }
    }

    const allSuccess = results.every(r => r.success);
    return {
      initiative: initiativeName,
      success: allSuccess,
      results
    };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return {
      initiative: initiativeName,
      success: false,
      error: error.message
    };
  }
}

/**
 * Sincroniza todas las iniciativas
 */
export async function syncAllInitiatives() {
  const startTime = Date.now();
  
  console.log('🚀 Starting Notion data synchronization');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Obtener iniciativas del CSV
    const initiatives = await getInitiativesFromCSV();
    
    console.log(`📋 Syncing ${initiatives.length} initiatives...\n`);

    const results = [];

    // 2. Sincronizar cada iniciativa
    for (let i = 0; i < initiatives.length; i++) {
      const initiative = initiatives[i];
      console.log(`[${i + 1}/${initiatives.length}]`);
      
      const result = await syncInitiative(initiative);
      results.push(result);
      
      // Pausa para no sobrecargar APIs
      if (i < initiatives.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Resumen
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Synchronization Summary');
    console.log('='.repeat(60));

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`✅ Successful: ${successful}/${results.length}`);
    console.log(`❌ Failed: ${failed}/${results.length}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📈 Success rate: ${Math.round((successful / results.length) * 100)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed initiatives:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`   - ${r.initiative}: ${r.reason || r.error || 'unknown error'}`);
        });
    }

    return results;

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('sync-notion-initiatives')) {
  syncAllInitiatives()
    .then(() => {
      console.log('\n✅ Synchronization completed\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
}
