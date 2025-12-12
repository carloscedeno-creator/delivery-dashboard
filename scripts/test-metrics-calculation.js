/**
 * Script de prueba para validar el cálculo de métricas
 * 
 * Uso:
 *   node scripts/test-metrics-calculation.js [projectKey]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Necesitas: VITE_SUPABASE_URL (o SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Verifica que las funciones SQL existen
 */
async function verifyFunctions() {
  console.log('\n🔍 Verificando funciones SQL...');
  
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
        AND routine_name LIKE '%metrics%'
      ORDER BY routine_name;
    `
  });
  
  // Usar query directa en su lugar
  const { data: functions, error: funcError } = await supabase
    .from('information_schema.routines')
    .select('routine_name')
    .like('routine_name', '%metrics%');
  
  if (funcError) {
    console.log('⚠️  No se pudo verificar funciones (puede ser normal si no tienes acceso directo)');
    console.log('   Verifica manualmente en Supabase SQL Editor');
    return;
  }
  
  const requiredFunctions = [
    'calculate_all_metrics',
    'calculate_developer_sprint_metrics',
    'calculate_sprint_metrics',
    'map_to_target_status',
  ];
  
  const foundFunctions = functions?.map(f => f.routine_name) || [];
  const missing = requiredFunctions.filter(f => !foundFunctions.includes(f));
  
  if (missing.length > 0) {
    console.log('❌ Funciones faltantes:', missing.join(', '));
    console.log('   Ejecuta: docs/supabase/04_calculate_metrics_functions.sql');
    return false;
  }
  
  console.log('✅ Todas las funciones requeridas están instaladas');
  return true;
}

/**
 * Verifica que hay datos para calcular métricas
 */
async function verifyData(projectKey) {
  console.log(`\n📊 Verificando datos para proyecto: ${projectKey}`);
  
  // Obtener proyecto
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('project_key', projectKey.toUpperCase())
    .single();
  
  if (projectError || !project) {
    console.error(`❌ Proyecto ${projectKey} no encontrado`);
    return false;
  }
  
  console.log(`✅ Proyecto encontrado: ${project.project_name}`);
  
  // Verificar sprints
  const { count: sprintCount, error: sprintError } = await supabase
    .from('sprints')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id);
  
  if (sprintError) {
    console.error('❌ Error verificando sprints:', sprintError);
    return false;
  }
  
  console.log(`   📅 Sprints: ${sprintCount || 0}`);
  
  // Verificar issues
  const { count: issueCount, error: issueError } = await supabase
    .from('issues')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', project.id);
  
  if (issueError) {
    console.error('❌ Error verificando issues:', issueError);
    return false;
  }
  
  console.log(`   📋 Issues: ${issueCount || 0}`);
  
  // Verificar issue_sprints
  const { count: issueSprintCount, error: issueSprintError } = await supabase
    .from('issue_sprints')
    .select('*', { count: 'exact', head: true });
  
  if (issueSprintError) {
    console.error('❌ Error verificando issue_sprints:', issueSprintError);
    return false;
  }
  
  console.log(`   🔗 Relaciones issue-sprint: ${issueSprintCount || 0}`);
  
  if ((sprintCount || 0) === 0 || (issueCount || 0) === 0) {
    console.log('⚠️  No hay suficientes datos para calcular métricas');
    return false;
  }
  
  return true;
}

/**
 * Prueba el cálculo de métricas
 */
async function testCalculation(projectKey) {
  console.log(`\n🧪 Probando cálculo de métricas para: ${projectKey}`);
  
  try {
    // Llamar a la función SQL
    const { data, error } = await supabase.rpc('calculate_all_metrics', {
      p_project_key: projectKey.toUpperCase()
    });
    
    if (error) {
      console.error('❌ Error calculando métricas:', error);
      console.error('   Asegúrate de que las funciones SQL están instaladas');
      return false;
    }
    
    if (data && data.length > 0) {
      const result = data[0];
      console.log('✅ Métricas calculadas exitosamente:');
      console.log(`   - Sprints procesados: ${result.sprints_processed || 0}`);
      console.log(`   - Desarrolladores procesados: ${result.developers_processed || 0}`);
      console.log(`   - Total métricas: ${result.metrics_calculated || 0}`);
    } else {
      console.log('⚠️  La función se ejecutó pero no retornó datos');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Verifica las métricas calculadas
 */
async function verifyMetrics(projectKey) {
  console.log(`\n📈 Verificando métricas calculadas...`);
  
  // Obtener proyecto
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('project_key', projectKey.toUpperCase())
    .single();
  
  if (!project) return;
  
  // Verificar métricas de sprint
  const { data: sprintMetrics, error: sprintError } = await supabase
    .from('sprint_metrics')
    .select(`
      *,
      sprint:sprints(sprint_name)
    `)
    .order('calculated_at', { ascending: false })
    .limit(5);
  
  if (sprintError) {
    console.error('❌ Error obteniendo métricas de sprint:', sprintError);
    return;
  }
  
  if (!sprintMetrics || sprintMetrics.length === 0) {
    console.log('⚠️  No se encontraron métricas de sprint');
    return;
  }
  
  console.log(`✅ Encontradas ${sprintMetrics.length} métricas de sprint recientes:`);
  sprintMetrics.forEach((m, i) => {
    const sprint = m.sprint || {};
    console.log(`   ${i + 1}. ${sprint.sprint_name || 'N/A'}:`);
    console.log(`      - Total SP: ${m.total_story_points}, Completados: ${m.completed_story_points}`);
    console.log(`      - Tickets: ${m.total_tickets} total, ${m.completed_tickets} completados`);
    console.log(`      - Calculado: ${new Date(m.calculated_at).toLocaleString()}`);
  });
  
  // Verificar métricas de desarrollador
  const { data: devMetrics, error: devError } = await supabase
    .from('developer_sprint_metrics')
    .select(`
      *,
      developer:developers(display_name),
      sprint:sprints(sprint_name)
    `)
    .order('calculated_at', { ascending: false })
    .limit(5);
  
  if (devError) {
    console.error('❌ Error obteniendo métricas de desarrollador:', devError);
    return;
  }
  
  if (!devMetrics || devMetrics.length === 0) {
    console.log('⚠️  No se encontraron métricas de desarrollador');
    return;
  }
  
  console.log(`\n✅ Encontradas ${devMetrics.length} métricas de desarrollador recientes:`);
  devMetrics.forEach((m, i) => {
    const dev = m.developer || {};
    const sprint = m.sprint || {};
    console.log(`   ${i + 1}. ${dev.display_name || 'N/A'} - ${sprint.sprint_name || 'N/A'}:`);
    console.log(`      - Workload: ${m.workload_sp}SP, Velocity: ${m.velocity_sp}SP`);
    console.log(`      - Tickets: ${m.tickets_assigned} asignados, ${m.tickets_completed} completados`);
  });
}

/**
 * Función principal
 */
async function main() {
  const projectKey = process.argv[2] || 'OBD';
  
  console.log('🧪 Test de Cálculo de Métricas');
  console.log('=' .repeat(50));
  console.log(`📊 Proyecto: ${projectKey}`);
  console.log(`🔗 Supabase: ${supabaseUrl}`);
  
  // 1. Verificar funciones
  const functionsOk = await verifyFunctions();
  
  // 2. Verificar datos
  const dataOk = await verifyData(projectKey);
  
  if (!dataOk) {
    console.log('\n❌ No se puede continuar sin datos');
    process.exit(1);
  }
  
  // 3. Probar cálculo
  const calculationOk = await testCalculation(projectKey);
  
  if (!calculationOk) {
    console.log('\n❌ El cálculo falló. Revisa los errores arriba.');
    process.exit(1);
  }
  
  // 4. Verificar resultados
  await verifyMetrics(projectKey);
  
  console.log('\n✅ ✅ ✅ Test completado exitosamente');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Verifica que las métricas se ven correctas');
  console.log('   2. Compara con los datos de Google Sheets');
  console.log('   3. El trigger automático calculará métricas después de cada sync');
}

main().catch(error => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});


