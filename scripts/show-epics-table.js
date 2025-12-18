/**
 * Script para mostrar épicas en formato tabla similar a Jira Timeline
 * Muestra todas las épicas con sus fechas actuales en formato tabla
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

function formatDate(dateStr) {
  if (!dateStr) return 'NULL';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}

function calculateDuration(startDate, endDate) {
  if (!startDate || !endDate) return 'N/A';
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
    return `${days} días`;
  } catch {
    return 'N/A';
  }
}

function getStatusIcon(startDate, endDate) {
  if (!startDate && !endDate) return '❌';
  if (startDate && endDate) return '✅';
  if (startDate) return '⚠️';
  if (endDate) return '⚠️';
  return '❓';
}

async function showEpicsTable() {
  console.log('\n' + '='.repeat(120));
  console.log('📊 TABLA DE ÉPICAS / INICIATIVAS - VISTA TIMELINE (Similar a Jira)');
  console.log('='.repeat(120));
  console.log(`🔗 URL: ${supabaseUrl}\n`);

  // Query: Obtener todas las iniciativas con sus fechas y datos relacionados
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
    .order('start_date', { ascending: true, nullsLast: true });

  if (error) {
    console.error('❌ Error obteniendo iniciativas:', error);
    process.exit(1);
  }

  if (!initiatives || initiatives.length === 0) {
    console.log('⚠️  No se encontraron iniciativas');
    return;
  }

  // Preparar datos para la tabla
  const tableData = initiatives.map(init => {
    const squad = init.squads;
    const statusIcon = getStatusIcon(init.start_date, init.end_date);
    const startFormatted = formatDate(init.start_date);
    const endFormatted = formatDate(init.end_date);
    const duration = calculateDuration(init.start_date, init.end_date);
    
    return {
      icon: statusIcon,
      key: init.initiative_key || 'N/A',
      name: init.initiative_name || init.initiative_key || 'Sin nombre',
      squad: squad?.squad_name || squad?.squad_key || 'N/A',
      startDate: init.start_date || null,
      startFormatted: startFormatted,
      endDate: init.end_date || null,
      endFormatted: endFormatted,
      duration: duration,
      created: init.created_at?.split('T')[0] || 'N/A'
    };
  });

  // Imprimir tabla
  console.log('┌─────────────┬──────────────────────────────────────────────────────────┬──────────────────┬──────────────────────┬──────────────────────┬─────────────┐');
  console.log('│ Estado      │ Épica / Iniciativa                                      │ Squad            │ Start Date           │ End Date             │ Duración    │');
  console.log('├─────────────┼──────────────────────────────────────────────────────────┼──────────────────┼──────────────────────┼──────────────────────┼─────────────┤');

  tableData.forEach((row, index) => {
    const key = (row.key || '').padEnd(11);
    const name = (row.name || '').substring(0, 58).padEnd(58);
    const squad = (row.squad || '').substring(0, 16).padEnd(16);
    const start = row.startFormatted.padEnd(20);
    const end = row.endFormatted.padEnd(20);
    const duration = (row.duration || '').padEnd(11);
    
    console.log(`│ ${row.icon} ${key} │ ${name} │ ${squad} │ ${start} │ ${end} │ ${duration} │`);
    
    // Separador cada 10 filas para legibilidad
    if ((index + 1) % 10 === 0 && index < tableData.length - 1) {
      console.log('├─────────────┼──────────────────────────────────────────────────────────┼──────────────────┼──────────────────────┼──────────────────────┼─────────────┤');
    }
  });

  console.log('└─────────────┴──────────────────────────────────────────────────────────┴──────────────────┴──────────────────────┴──────────────────────┴─────────────┘');

  // Estadísticas
  console.log('\n' + '='.repeat(120));
  console.log('📈 ESTADÍSTICAS:');
  console.log('='.repeat(120));
  
  const withBoth = tableData.filter(r => r.startDate && r.endDate).length;
  const withStartOnly = tableData.filter(r => r.startDate && !r.endDate).length;
  const withEndOnly = tableData.filter(r => !r.startDate && r.endDate).length;
  const withoutDates = tableData.filter(r => !r.startDate && !r.endDate).length;

  console.log(`\nTotal de épicas: ${tableData.length}`);
  console.log(`  ✅ Con ambas fechas: ${withBoth}`);
  console.log(`  ⚠️  Solo start_date: ${withStartOnly}`);
  console.log(`  ⚠️  Solo end_date: ${withEndOnly}`);
  console.log(`  ❌ Sin fechas: ${withoutDates}`);

  // Duración promedio
  const withDuration = tableData.filter(r => r.startDate && r.endDate);
  if (withDuration.length > 0) {
    const durations = withDuration.map(r => {
      const start = new Date(r.startDate);
      const end = new Date(r.endDate);
      return Math.round((end - start) / (1000 * 60 * 60 * 24));
    });
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    console.log(`\nDuración (épicas con ambas fechas):`);
    console.log(`  Promedio: ${avg} días`);
    console.log(`  Mínima: ${min} días`);
    console.log(`  Máxima: ${max} días`);
  }

  // Rango de fechas
  const allStartDates = tableData
    .map(r => r.startDate)
    .filter(Boolean)
    .map(d => new Date(d))
    .sort((a, b) => a - b);
  
  const allEndDates = tableData
    .map(r => r.endDate)
    .filter(Boolean)
    .map(d => new Date(d))
    .sort((a, b) => a - b);

  if (allStartDates.length > 0) {
    console.log(`\nRango de fechas:`);
    console.log(`  Start más temprano: ${formatDate(allStartDates[0].toISOString())}`);
    console.log(`  End más tardío: ${allEndDates.length > 0 ? formatDate(allEndDates[allEndDates.length - 1].toISOString()) : 'N/A'}`);
  }

  // Exportar a CSV para análisis
  console.log('\n' + '='.repeat(120));
  console.log('📄 DATOS EN FORMATO CSV (para copiar y pegar en Excel/Sheets):');
  console.log('='.repeat(120));
  console.log('\nKey,Name,Squad,Start Date,End Date,Duration (days),Created,Status');
  
  tableData.forEach(row => {
    const startDateStr = row.startDate ? row.startDate : '';
    const endDateStr = row.endDate ? row.endDate : '';
    const durationDays = row.startDate && row.endDate 
      ? Math.round((new Date(row.endDate) - new Date(row.startDate)) / (1000 * 60 * 60 * 24))
      : '';
    const status = row.startDate && row.endDate ? 'Complete' 
      : row.startDate ? 'Start Only' 
      : row.endDate ? 'End Only' 
      : 'No Dates';
    
    console.log(`"${row.key}","${row.name}","${row.squad}","${startDateStr}","${endDateStr}","${durationDays}","${row.created}","${status}"`);
  });

  console.log('\n' + '='.repeat(120));
  console.log('✅ FIN DE LA TABLA');
  console.log('='.repeat(120) + '\n');
}

// Ejecutar
showEpicsTable().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});

