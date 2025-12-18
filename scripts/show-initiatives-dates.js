/**
 * Script para mostrar iniciativas y sus fechas desde Supabase
 * Muestra la data que se está usando para el roadmap
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function showInitiativesWithDates() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 INICIATIVAS Y SUS FECHAS DESDE SUPABASE');
  console.log('='.repeat(80));
  console.log(`🔗 URL: ${supabaseUrl}\n`);

  // Query principal: Obtener todas las iniciativas con sus fechas y datos relacionados
  const { data: initiatives, error } = await supabase
    .from('initiatives')
    .select(`
      id,
      initiative_key,
      initiative_name,
      start_date,
      end_date,
      created_at,
      updated_at,
      squad_id,
      squads (
        squad_key,
        squad_name
      )
    `)
    .order('initiative_name', { ascending: true });

  if (error) {
    console.error('❌ Error obteniendo iniciativas:', error);
    process.exit(1);
  }

  if (!initiatives || initiatives.length === 0) {
    console.log('⚠️  No se encontraron iniciativas');
    return;
  }

  console.log(`📦 Total de iniciativas: ${initiatives.length}\n`);

  // Categorizar iniciativas
  const withBothDates = [];
  const withStartOnly = [];
  const withEndOnly = [];
  const withoutDates = [];

  initiatives.forEach(init => {
    const hasStart = !!init.start_date;
    const hasEnd = !!init.end_date;

    if (hasStart && hasEnd) {
      withBothDates.push(init);
    } else if (hasStart && !hasEnd) {
      withStartOnly.push(init);
    } else if (!hasStart && hasEnd) {
      withEndOnly.push(init);
    } else {
      withoutDates.push(init);
    }
  });

  console.log('📊 RESUMEN:');
  console.log(`  ✅ Con ambas fechas (start_date + end_date): ${withBothDates.length}`);
  console.log(`  ⚠️  Solo con start_date: ${withStartOnly.length}`);
  console.log(`  ⚠️  Solo con end_date: ${withEndOnly.length}`);
  console.log(`  ❌ Sin fechas: ${withoutDates.length}\n`);

  // Mostrar iniciativas con ambas fechas
  if (withBothDates.length > 0) {
    console.log('='.repeat(80));
    console.log('✅ INICIATIVAS CON AMBAS FECHAS (start_date + end_date)');
    console.log('='.repeat(80));
    console.log('\n');
    
    withBothDates.forEach((init, index) => {
      const squad = init.squads;
      const startDate = new Date(init.start_date);
      const endDate = new Date(init.end_date);
      const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
      
      console.log(`${index + 1}. ${init.initiative_name || init.initiative_key}`);
      console.log(`   Squad: ${squad?.squad_name || squad?.squad_key || 'N/A'}`);
      console.log(`   Start Date: ${init.start_date} (${startDate.toLocaleDateString('es-ES')})`);
      console.log(`   End Date:   ${init.end_date} (${endDate.toLocaleDateString('es-ES')})`);
      console.log(`   Duración:   ${days} días`);
      console.log(`   Key:        ${init.initiative_key}`);
      console.log(`   Created:    ${init.created_at?.split('T')[0] || 'N/A'}`);
      console.log('');
    });
  }

  // Mostrar iniciativas solo con start_date
  if (withStartOnly.length > 0) {
    console.log('='.repeat(80));
    console.log('⚠️  INICIATIVAS SOLO CON START_DATE');
    console.log('='.repeat(80));
    console.log('\n');
    
    withStartOnly.slice(0, 10).forEach((init, index) => {
      const squad = init.squads;
      const startDate = new Date(init.start_date);
      
      console.log(`${index + 1}. ${init.initiative_name || init.initiative_key}`);
      console.log(`   Squad: ${squad?.squad_name || squad?.squad_key || 'N/A'}`);
      console.log(`   Start Date: ${init.start_date} (${startDate.toLocaleDateString('es-ES')})`);
      console.log(`   End Date:   NULL (se calculará como start_date + 3 meses)`);
      console.log(`   Key:        ${init.initiative_key}`);
      console.log('');
    });
    
    if (withStartOnly.length > 10) {
      console.log(`   ... y ${withStartOnly.length - 10} más\n`);
    }
  }

  // Mostrar iniciativas solo con end_date
  if (withEndOnly.length > 0) {
    console.log('='.repeat(80));
    console.log('⚠️  INICIATIVAS SOLO CON END_DATE');
    console.log('='.repeat(80));
    console.log('\n');
    
    withEndOnly.forEach((init, index) => {
      const squad = init.squads;
      const endDate = new Date(init.end_date);
      
      console.log(`${index + 1}. ${init.initiative_name || init.initiative_key}`);
      console.log(`   Squad: ${squad?.squad_name || squad?.squad_key || 'N/A'}`);
      console.log(`   Start Date: NULL (se calculará como end_date - 3 meses)`);
      console.log(`   End Date:   ${init.end_date} (${endDate.toLocaleDateString('es-ES')})`);
      console.log(`   Key:        ${init.initiative_key}`);
      console.log('');
    });
  }

  // Mostrar iniciativas sin fechas
  if (withoutDates.length > 0) {
    console.log('='.repeat(80));
    console.log('❌ INICIATIVAS SIN FECHAS (usarán fallbacks)');
    console.log('='.repeat(80));
    console.log('\n');
    
    withoutDates.forEach((init, index) => {
      const squad = init.squads;
      
      console.log(`${index + 1}. ${init.initiative_name || init.initiative_key}`);
      console.log(`   Squad: ${squad?.squad_name || squad?.squad_key || 'N/A'}`);
      console.log(`   Start Date: NULL`);
      console.log(`   End Date:   NULL`);
      console.log(`   Key:        ${init.initiative_key}`);
      console.log(`   Created:    ${init.created_at?.split('T')[0] || 'N/A'}`);
      console.log(`   Fallback:   Se usará sprint dates o issues dates o created_at`);
      console.log('');
    });
  }

  // Query SQL equivalente
  console.log('='.repeat(80));
  console.log('📝 QUERY SQL EQUIVALENTE:');
  console.log('='.repeat(80));
  console.log(`
SELECT 
  i.id,
  i.initiative_key,
  i.initiative_name,
  i.start_date,
  i.end_date,
  i.created_at,
  i.updated_at,
  i.squad_id,
  s.squad_key,
  s.squad_name
FROM initiatives i
LEFT JOIN squads s ON i.squad_id = s.id
ORDER BY i.initiative_name ASC;
  `);

  // Estadísticas adicionales
  console.log('='.repeat(80));
  console.log('📈 ESTADÍSTICAS ADICIONALES:');
  console.log('='.repeat(80));
  
  if (withBothDates.length > 0) {
    const durations = withBothDates.map(init => {
      const start = new Date(init.start_date);
      const end = new Date(init.end_date);
      return Math.round((end - start) / (1000 * 60 * 60 * 24));
    });
    
    const avgDuration = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    console.log(`\nDuración promedio (épicas con ambas fechas): ${avgDuration} días`);
    console.log(`Duración mínima: ${minDuration} días`);
    console.log(`Duración máxima: ${maxDuration} días`);
  }

  // Fechas más tempranas y más tardías
  const allDates = initiatives
    .map(init => [init.start_date, init.end_date])
    .flat()
    .filter(Boolean)
    .map(d => new Date(d))
    .sort((a, b) => a - b);

  if (allDates.length > 0) {
    console.log(`\nFecha más temprana: ${allDates[0].toISOString().split('T')[0]}`);
    console.log(`Fecha más tardía: ${allDates[allDates.length - 1].toISOString().split('T')[0]}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ FIN DEL REPORTE');
  console.log('='.repeat(80) + '\n');
}

// Ejecutar
showInitiativesWithDates().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});

