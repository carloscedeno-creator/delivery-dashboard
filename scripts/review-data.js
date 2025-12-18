/**
 * Script para revisar los datos disponibles en Supabase
 * Muestra un resumen completo de todas las tablas y datos relevantes
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Necesitas configurar:');
  console.error('  - VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Obtener conteo de registros en una tabla
 */
async function getTableCount(table) {
  try {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error(`  ❌ Error en ${table}:`, error.message);
      return 0;
    }
    return count || 0;
  } catch (error) {
    console.error(`  ❌ Error en ${table}:`, error.message);
    return 0;
  }
}

/**
 * Obtener muestra de datos de una tabla
 */
async function getTableSample(table, limit = 3) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(limit);
    
    if (error) {
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
}

/**
 * Revisar datos principales
 */
async function reviewData() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 REVISIÓN DE DATOS EN SUPABASE');
  console.log('='.repeat(70));
  console.log(`🔗 URL: ${supabaseUrl}`);
  console.log('─'.repeat(70));

  // Tablas principales a revisar
  const tables = [
    'squads',
    'initiatives',
    'issues',
    'sprints',
    'developers',
    'projects',
    'issue_sprints',
    'v_sprint_metrics_complete',
    'v_developer_sprint_metrics_complete'
  ];

  console.log('\n📋 TABLAS PRINCIPALES:\n');
  
  for (const table of tables) {
    const count = await getTableCount(table);
    console.log(`  ${table.padEnd(40)} ${count.toString().padStart(6)} registros`);
    
    // Mostrar muestra si hay datos
    if (count > 0 && count <= 100) {
      const sample = await getTableSample(table, 2);
      if (sample && sample.length > 0) {
        const keys = Object.keys(sample[0]).slice(0, 5);
        console.log(`    └─ Campos: ${keys.join(', ')}${Object.keys(sample[0]).length > 5 ? '...' : ''}`);
      }
    }
  }

  // Revisar datos específicos
  console.log('\n' + '─'.repeat(70));
  console.log('🔍 DETALLES ESPECÍFICOS:\n');

  // Squads
  const { data: squads } = await supabase
    .from('squads')
    .select('id, squad_key, squad_name')
    .order('squad_name');
  
  console.log(`📁 SQUADS (${squads?.length || 0}):`);
  if (squads && squads.length > 0) {
    squads.forEach(s => {
      console.log(`  - ${s.squad_name || s.squad_key} (${s.squad_key})`);
    });
  } else {
    console.log('  ⚠️  No hay squads registrados');
  }

  // Initiatives con fechas
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('id, initiative_key, initiative_name, start_date, end_date, squad_id')
    .order('initiative_name')
    .limit(10);
  
  console.log(`\n📦 INITIATIVES (mostrando primeros 10 de ${await getTableCount('initiatives')}):`);
  if (initiatives && initiatives.length > 0) {
    const withDates = initiatives.filter(i => i.start_date || i.end_date);
    const withoutDates = initiatives.filter(i => !i.start_date && !i.end_date);
    
    console.log(`  ✅ Con fechas: ${withDates.length}`);
    console.log(`  ⚠️  Sin fechas: ${withoutDates.length}`);
    
    if (withDates.length > 0) {
      console.log('\n  Ejemplos con fechas:');
      withDates.slice(0, 3).forEach(i => {
        console.log(`    - ${i.initiative_name || i.initiative_key}`);
        console.log(`      Start: ${i.start_date || 'N/A'}, End: ${i.end_date || 'N/A'}`);
      });
    }
  } else {
    console.log('  ⚠️  No hay initiatives registradas');
  }

  // Issues por estado
  const { data: issues } = await supabase
    .from('issues')
    .select('current_status, current_story_points, assignee_id, initiative_id')
    .limit(1000);
  
  console.log(`\n🎫 ISSUES (muestra de ${issues?.length || 0}):`);
  if (issues && issues.length > 0) {
    const statusCounts = {};
    const withAssignee = issues.filter(i => i.assignee_id).length;
    const withInitiative = issues.filter(i => i.initiative_id).length;
    const totalSP = issues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
    
    issues.forEach(i => {
      const status = i.current_status || 'Unassigned';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log(`  Total SP: ${totalSP}`);
    console.log(`  Con asignado: ${withAssignee} (${Math.round(withAssignee/issues.length*100)}%)`);
    console.log(`  Con iniciativa: ${withInitiative} (${Math.round(withInitiative/issues.length*100)}%)`);
    console.log(`  Estados principales:`);
    Object.entries(statusCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([status, count]) => {
        console.log(`    - ${status}: ${count}`);
      });
  } else {
    console.log('  ⚠️  No hay issues registradas');
  }

  // Developers
  const { data: developers } = await supabase
    .from('developers')
    .select('id, display_name, active')
    .order('display_name');
  
  console.log(`\n👥 DEVELOPERS (${developers?.length || 0}):`);
  if (developers && developers.length > 0) {
    const active = developers.filter(d => d.active).length;
    console.log(`  Activos: ${active}`);
    console.log(`  Inactivos: ${developers.length - active}`);
    console.log(`  Lista (primeros 10):`);
    developers.slice(0, 10).forEach(d => {
      console.log(`    - ${d.display_name} ${d.active ? '✅' : '❌'}`);
    });
  } else {
    console.log('  ⚠️  No hay developers registrados');
  }

  // Sprints
  const { data: sprints } = await supabase
    .from('sprints')
    .select('id, sprint_name, state, start_date, end_date, squad_id')
    .order('end_date', { ascending: false })
    .limit(10);
  
  console.log(`\n🏃 SPRINTS (mostrando últimos 10 de ${await getTableCount('sprints')}):`);
  if (sprints && sprints.length > 0) {
    const active = sprints.filter(s => s.state === 'active').length;
    const closed = sprints.filter(s => s.state === 'closed').length;
    console.log(`  Activos: ${active}, Cerrados: ${closed}`);
    sprints.slice(0, 5).forEach(s => {
      console.log(`    - ${s.sprint_name} [${s.state}] ${s.start_date} → ${s.end_date}`);
    });
  } else {
    console.log('  ⚠️  No hay sprints registrados');
  }

  // Métricas de vistas
  console.log('\n' + '─'.repeat(70));
  console.log('📈 VISTAS Y MÉTRICAS:\n');

  const { data: sprintMetrics } = await supabase
    .from('v_sprint_metrics_complete')
    .select('*')
    .limit(5);
  
  console.log(`📊 Sprint Metrics (v_sprint_metrics_complete):`);
  if (sprintMetrics && sprintMetrics.length > 0) {
    console.log(`  ✅ Vista disponible con ${sprintMetrics.length} registros (muestra)`);
    console.log(`  Campos: ${Object.keys(sprintMetrics[0]).slice(0, 8).join(', ')}...`);
  } else {
    console.log('  ⚠️  Vista no disponible o sin datos');
  }

  const { data: devMetrics } = await supabase
    .from('v_developer_sprint_metrics_complete')
    .select('*')
    .limit(5);
  
  console.log(`\n👨‍💻 Developer Metrics (v_developer_sprint_metrics_complete):`);
  if (devMetrics && devMetrics.length > 0) {
    console.log(`  ✅ Vista disponible con ${devMetrics.length} registros (muestra)`);
    console.log(`  Campos: ${Object.keys(devMetrics[0]).slice(0, 8).join(', ')}...`);
  } else {
    console.log('  ⚠️  Vista no disponible o sin datos');
  }

  // Resumen final
  console.log('\n' + '='.repeat(70));
  console.log('✅ REVISIÓN COMPLETADA');
  console.log('='.repeat(70));
  console.log('\n💡 Próximos pasos:');
  console.log('  1. Verifica que todas las tablas tengan datos');
  console.log('  2. Revisa que las initiatives tengan fechas (start_date, end_date)');
  console.log('  3. Verifica que los issues estén asignados a initiatives');
  console.log('  4. Asegúrate de que los sprints estén activos y tengan fechas');
  console.log('\n');
}

// Ejecutar revisión
reviewData().catch(error => {
  console.error('\n❌ Error durante la revisión:', error);
  process.exit(1);
});

