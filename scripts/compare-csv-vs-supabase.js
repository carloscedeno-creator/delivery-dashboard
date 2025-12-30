/**
 * Script para comparar el formato de datos CSV vs Supabase
 * Esto nos ayudará a entender por qué el CSV funciona y Supabase no
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env
const envPaths = [
  join(__dirname, '..', '.env'),
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
  } catch (e) {
    // Ignorar si no existe
  }
}

// Crear cliente de Supabase manualmente para evitar import.meta.env
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Función simplificada para obtener datos de Supabase (sin usar supabaseApi.js)
async function getSupabaseRoadmapData() {
  const { data: squads } = await supabase
    .from('squads')
    .select('id, squad_key, squad_name')
    .order('squad_name', { ascending: true });

  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('id, squad_id, initiative_key, initiative_name, created_at, start_date, end_date')
    .order('initiative_name', { ascending: true });

  const { data: issues } = await supabase
    .from('issues')
    .select('id, initiative_id, current_status, current_story_points, assignee_id');

  const squadMap = new Map((squads || []).map(s => [s.id, s]));
  const roadmapData = [];

  for (const initiative of initiatives || []) {
    const squad = squadMap.get(initiative.squad_id);
    if (!squad) continue;

    const initiativeIssues = (issues || []).filter(
      issue => issue.initiative_id === initiative.id
    );

    const totalSP = initiativeIssues.reduce((sum, issue) => 
      sum + (issue.current_story_points || 0), 0
    );
    const completedSP = initiativeIssues
      .filter(issue => {
        const status = issue.current_status?.toLowerCase() || '';
        return status.includes('done') || status.includes('closed') || status.includes('resolved');
      })
      .reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);

    const completionPercentage = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

    // Obtener fechas
    let startDate = null;
    let endDate = null;

    if (initiative.start_date) {
      startDate = new Date(initiative.start_date).toISOString().split('T')[0];
    } else {
      startDate = new Date(initiative.created_at).toISOString().split('T')[0];
    }

    if (initiative.end_date) {
      endDate = new Date(initiative.end_date).toISOString().split('T')[0];
    } else {
      const estimatedEnd = new Date(startDate);
      estimatedEnd.setMonth(estimatedEnd.getMonth() + 3);
      endDate = estimatedEnd.toISOString().split('T')[0];
    }

    roadmapData.push({
      squad: squad.squad_name || squad.squad_key,
      initiative: initiative.initiative_name || initiative.initiative_key,
      start: startDate,
      delivery: endDate,
      status: completionPercentage,
      spi: totalSP > 0 ? parseFloat((completedSP / totalSP).toFixed(2)) : 0
    });
  }

  return roadmapData;
}

async function compareFormats() {
  console.log('🔍 Comparando formatos CSV vs Supabase...\n');

  try {
    // 1. Obtener datos del CSV
    console.log('📥 Cargando datos del CSV...');
    const { parseCSV } = await import('../src/utils/csvParser.js');
    const { DELIVERY_ROADMAP, buildProxiedUrl } = await import('../src/config/dataSources.js');
    
    const csvUrl = buildProxiedUrl(DELIVERY_ROADMAP.sheets.projects.url);
    const csvResponse = await fetch(csvUrl);
    const csvText = await csvResponse.text();
    const csvData = parseCSV(csvText, 'project');
    
    console.log(`✅ CSV: ${csvData.length} items cargados`);
    if (csvData.length > 0) {
      console.log('\n📋 Ejemplo CSV (primer item):');
      const csvItem = csvData[0];
      console.log(JSON.stringify({
        squad: csvItem.squad,
        initiative: csvItem.initiative,
        start: csvItem.start,
        delivery: csvItem.delivery,
        startType: typeof csvItem.start,
        deliveryType: typeof csvItem.delivery,
        startLength: csvItem.start?.length,
        deliveryLength: csvItem.delivery?.length
      }, null, 2));
    }

    // 2. Obtener datos de Supabase
    console.log('\n📥 Cargando datos de Supabase...');
    const supabaseData = await getSupabaseRoadmapData();
    
    console.log(`✅ Supabase: ${supabaseData.length} items cargados`);
    if (supabaseData.length > 0) {
      console.log('\n📋 Ejemplo Supabase (primer item):');
      const supabaseItem = supabaseData[0];
      console.log(JSON.stringify({
        squad: supabaseItem.squad,
        initiative: supabaseItem.initiative,
        start: supabaseItem.start,
        delivery: supabaseItem.delivery,
        startType: typeof supabaseItem.start,
        deliveryType: typeof supabaseItem.delivery,
        startLength: supabaseItem.start?.length,
        deliveryLength: supabaseItem.delivery?.length
      }, null, 2));
    }

    // 3. Comparar
    console.log('\n🔍 Comparación detallada:');
    if (csvData.length > 0 && supabaseData.length > 0) {
      const csvItem = csvData[0];
      const supabaseItem = supabaseData[0];
      
      console.log(`\nStart date:`);
      console.log(`  CSV: "${csvItem.start}" (${typeof csvItem.start}, length: ${csvItem.start?.length})`);
      console.log(`  Supabase: "${supabaseItem.start}" (${typeof supabaseItem.start}, length: ${supabaseItem.start?.length})`);
      
      console.log(`\nDelivery date:`);
      console.log(`  CSV: "${csvItem.delivery}" (${typeof csvItem.delivery}, length: ${csvItem.delivery?.length})`);
      console.log(`  Supabase: "${supabaseItem.delivery}" (${typeof supabaseItem.delivery}, length: ${supabaseItem.delivery?.length})`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.error(error.stack);
  }
}

compareFormats();




