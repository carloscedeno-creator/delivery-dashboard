/**
 * Script para sincronizar TODAS las iniciativas de Notion con Supabase
 * Obtiene iniciativas del CSV de productos y sincroniza automáticamente
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { extractInitiativeData } from '../src/services/notionContentExtractor.js';
import { processExtractedData } from '../src/services/notionDataProcessor.js';
import { syncAllToSupabase } from '../src/services/notionSupabaseSync.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRODUCT_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSA1rr8EtTrBVQK_s1U4JJ-08AEmBiVRcfi6SepeBOPtlj4WPs6b7lUtyhg8lJixp-sg3R50cHkZ5NN/pub?gid=933125518&single=true&output=csv';
const PROXY_URL = process.env.VITE_PROXY_URL || 'https://sheets-proxy.carlos-cedeno.workers.dev';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    console.error('❌ Error fetching initiatives from CSV:', error.message);
    throw error;
  }
}

/**
 * Sincroniza una iniciativa
 */
async function syncInitiative(initiativeName, knownInitiatives = []) {
  try {
    console.log(`\n📊 Processing: ${initiativeName}`);
    console.log('-'.repeat(60));

    // 1. Extraer datos de Notion
    const extractedData = await extractInitiativeData(initiativeName);

    if (!extractedData.found || extractedData.pages.length === 0) {
      console.log(`   ⚠️  No Notion pages found`);
      return {
        initiative: initiativeName,
        success: false,
        reason: 'not_found'
      };
    }

    console.log(`   ✅ Found ${extractedData.pages.length} page(s)`);

    // 2. Procesar y extraer métricas
    const processedData = processExtractedData(extractedData, knownInitiatives);

    if (!processedData.found || !processedData.metrics) {
      console.log(`   ⚠️  Could not process data`);
      return {
        initiative: initiativeName,
        success: false,
        reason: 'processing_failed'
      };
    }

    console.log(`   📈 Metrics:`);
    console.log(`      - Status: ${processedData.metrics.status}`);
    console.log(`      - Completion: ${processedData.metrics.completion}%`);
    console.log(`      - Tasks: ${processedData.metrics.tasksCompleted}/${processedData.metrics.tasksTotal}`);
    console.log(`      - Story Points: ${processedData.metrics.storyPointsDone}/${processedData.metrics.storyPointsTotal}`);

    // 3. Sincronizar con Supabase
    const syncResult = await syncAllToSupabase(supabase, extractedData, processedData);

    if (syncResult.contentSynced && syncResult.metricsSynced) {
      console.log(`   ✅ Synced to Supabase`);
      return {
        initiative: initiativeName,
        success: true,
        syncResult
      };
    } else {
      console.log(`   ⚠️  Partial sync: content=${syncResult.contentSynced}, metrics=${syncResult.metricsSynced}`);
      return {
        initiative: initiativeName,
        success: false,
        syncResult
      };
    }

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
 * Exportada para uso en el servicio de sincronización automática
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
    const knownInitiatives = [...initiatives];

    // 2. Sincronizar cada iniciativa
    for (let i = 0; i < initiatives.length; i++) {
      const initiative = initiatives[i];
      console.log(`[${i + 1}/${initiatives.length}]`);
      
      const result = await syncInitiative(initiative, knownInitiatives);
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

    // 4. Registrar sincronización en Supabase
    try {
      await supabase
        .from('notion_sync_log')
        .insert({
          sync_date: new Date().toISOString().split('T')[0],
          total_initiatives: results.length,
          successful: successful,
          failed: failed,
          duration_seconds: parseFloat(duration),
          created_at: new Date().toISOString()
        });
    } catch (logError) {
      console.warn('⚠️  Could not log sync to database (table may not exist)');
    }

    return results;

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Ejecutar solo si se llama directamente (no cuando se importa)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('sync-notion-all-initiatives')) {
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
