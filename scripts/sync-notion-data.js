/**
 * Script para sincronizar datos de Notion con Supabase
 * Extrae contenido y métricas de iniciativas desde Notion
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { extractInitiativeData } from '../src/services/notionContentExtractor.js';
import { processExtractedData } from '../src/services/notionDataProcessor.js';
import { syncAllToSupabase } from '../src/services/notionSupabaseSync.js';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Lista de iniciativas a procesar (puedes obtenerla de Google Sheets o pasar como argumento)
const INITIATIVES = process.argv.slice(2);

async function syncInitiative(initiativeName, knownInitiatives = []) {
  try {
    console.log(`\n📊 Processing: ${initiativeName}`);
    console.log('='.repeat(60));

    // 1. Extraer datos de Notion
    console.log('1️⃣ Extracting data from Notion...');
    const extractedData = await extractInitiativeData(initiativeName);

    if (!extractedData.found) {
      console.log(`   ⚠️  No Notion pages found for "${initiativeName}"`);
      return {
        initiative: initiativeName,
        success: false,
        reason: 'not_found'
      };
    }

    console.log(`   ✅ Found ${extractedData.pages.length} page(s)`);

    // 2. Procesar y extraer métricas
    console.log('2️⃣ Processing and extracting metrics...');
    const processedData = processExtractedData(extractedData, knownInitiatives);

    if (!processedData.found) {
      console.log(`   ⚠️  Could not process data`);
      return {
        initiative: initiativeName,
        success: false,
        reason: 'processing_failed'
      };
    }

    console.log(`   ✅ Metrics extracted:`);
    console.log(`      - Status: ${processedData.metrics.status}`);
    console.log(`      - Completion: ${processedData.metrics.completion}%`);
    console.log(`      - Tasks: ${processedData.metrics.tasksCompleted}/${processedData.metrics.tasksTotal}`);
    console.log(`      - Story Points: ${processedData.metrics.storyPointsDone}/${processedData.metrics.storyPointsTotal}`);
    console.log(`      - Blockers: ${processedData.metrics.blockers.length}`);
    console.log(`      - Dependencies: ${processedData.metrics.dependencies.length}`);

    // 3. Sincronizar con Supabase
    console.log('3️⃣ Syncing to Supabase...');
    const syncResult = await syncAllToSupabase(supabase, extractedData, processedData);

    if (syncResult.contentSynced && syncResult.metricsSynced) {
      console.log(`   ✅ Successfully synced to Supabase`);
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
    console.error(`   ❌ Error processing ${initiativeName}:`, error.message);
    return {
      initiative: initiativeName,
      success: false,
      error: error.message
    };
  }
}

async function syncAllInitiatives(initiatives) {
  console.log('🚀 Starting Notion data synchronization');
  console.log('='.repeat(60));
  console.log(`📋 Initiatives to process: ${initiatives.length}\n`);

  const results = [];
  const knownInitiatives = [...initiatives]; // Para detectar dependencias

  for (const initiative of initiatives) {
    const result = await syncInitiative(initiative, knownInitiatives);
    results.push(result);
    
    // Pequeña pausa para no sobrecargar APIs
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 Synchronization Summary');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
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
}

// Ejecutar
if (INITIATIVES.length > 0) {
  // Procesar iniciativas pasadas como argumentos
  syncAllInitiatives(INITIATIVES)
    .then(() => {
      console.log('\n✅ Synchronization completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Fatal error:', error);
      process.exit(1);
    });
} else {
  console.log('📝 Usage: node scripts/sync-notion-data.js "Initiative 1" "Initiative 2" ...');
  console.log('\n💡 Example:');
  console.log('   node scripts/sync-notion-data.js "Strata Public API" "DataLake" "Kibana Observability"');
  process.exit(0);
}
