/**
 * Script para hacer query directo a Supabase y mostrar resultados
 * Verifica permisos y muestra los estados actuales de los issues del sprint
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPermissions() {
  console.log('🔐 Verificando permisos de Supabase...\n');
  
  try {
    // Intentar leer
    const { data: readTest, error: readError } = await supabase
      .from('issues')
      .select('id')
      .limit(1);
    
    if (readError) {
      console.log(`   ❌ Error de lectura: ${readError.message}`);
      return false;
    } else {
      console.log(`   ✅ Permisos de lectura: OK`);
    }

    // Intentar escribir (solo verificar, no actualizar)
    const { error: writeTestError } = await supabase
      .from('issues')
      .update({ updated_date: new Date().toISOString() })
      .eq('id', '00000000-0000-0000-0000-000000000000') // ID que no existe, solo para probar permisos
      .select();
    
    if (writeTestError) {
      if (writeTestError.code === 'PGRST116' || writeTestError.message.includes('permission') || writeTestError.message.includes('policy')) {
        console.log(`   ⚠️ Permisos de escritura: RESTRINGIDOS (RLS activo)`);
        console.log(`   ℹ️  Esto es normal si Row Level Security está activado`);
      } else if (writeTestError.message.includes('No rows')) {
        console.log(`   ✅ Permisos de escritura: OK (el error es porque el ID no existe, pero los permisos funcionan)`);
      } else {
        console.log(`   ⚠️ Permisos de escritura: ${writeTestError.message}`);
      }
    } else {
      console.log(`   ✅ Permisos de escritura: OK`);
    }

    return true;
  } catch (error) {
    console.log(`   ❌ Error verificando permisos: ${error.message}`);
    return false;
  }
}

async function querySprintIssues() {
  console.log('\n📊 Ejecutando query a Supabase...\n');

  try {
    // Paso 1: Obtener squad
    const { data: squads, error: squadError } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .ilike('squad_name', '%Core Infrastructure%');

    if (squadError) {
      console.error(`❌ Error obteniendo squad: ${squadError.message}`);
      return;
    }

    if (!squads || squads.length === 0) {
      console.error('❌ No se encontró el squad Core Infrastructure');
      return;
    }

    const squad = squads[0];
    console.log(`✅ Squad encontrado: ${squad.squad_name} (${squad.squad_key})`);

    // Paso 2: Obtener sprint
    const { data: sprints, error: sprintError } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date')
      .eq('squad_id', squad.id)
      .ilike('sprint_name', '%Sprint 11%')
      .order('start_date', { ascending: false })
      .limit(1);

    if (sprintError) {
      console.error(`❌ Error obteniendo sprint: ${sprintError.message}`);
      return;
    }

    if (!sprints || sprints.length === 0) {
      console.error('❌ No se encontró el sprint ODSO Sprint 11');
      return;
    }

    const sprint = sprints[0];
    console.log(`✅ Sprint encontrado: ${sprint.sprint_name} (${sprint.sprint_key})`);
    console.log(`   Fechas: ${sprint.start_date || 'N/A'} - ${sprint.end_date || 'N/A'}\n`);

    // Paso 3: Obtener issues del sprint
    const { data: sprintIssues, error: sprintIssuesError } = await supabase
      .from('issue_sprints')
      .select('issue_id, status_at_sprint_close')
      .eq('sprint_id', sprint.id);

    if (sprintIssuesError) {
      console.error(`❌ Error obteniendo issues del sprint: ${sprintIssuesError.message}`);
      return;
    }

    const sprintIssueIds = (sprintIssues || []).map(si => si.issue_id);
    console.log(`📋 Issues en el sprint (issue_sprints): ${sprintIssueIds.length}`);

    // Paso 4: Obtener initiatives del squad
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id, initiative_key, initiative_name')
      .eq('squad_id', squad.id);

    if (initiativesError) {
      console.error(`❌ Error obteniendo initiatives: ${initiativesError.message}`);
      return;
    }

    const initiativeIds = (initiatives || []).map(i => i.id);
    console.log(`📋 Initiatives del squad: ${initiativeIds.length}\n`);

    // Paso 5: Query principal - Obtener issues con sus estados
    console.log('🔍 Ejecutando query principal...\n');
    
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_status,
        current_story_points,
        initiative_id,
        updated_date,
        created_date
      `)
      .in('id', sprintIssueIds.length > 0 ? sprintIssueIds : [null])
      .in('initiative_id', initiativeIds.length > 0 ? initiativeIds : [null])
      .order('issue_key', { ascending: true });

    if (issuesError) {
      console.error(`❌ Error en query principal: ${issuesError.message}`);
      console.error(`   Código: ${issuesError.code || 'N/A'}`);
      console.error(`   Detalles: ${JSON.stringify(issuesError, null, 2)}`);
      return;
    }

    console.log(`✅ Query exitoso: ${issues?.length || 0} issues encontrados\n`);

    // Agrupar por estado
    const statusGroups = {};
    (issues || []).forEach(issue => {
      const status = issue.current_status || 'Unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(issue);
    });

    // Mostrar resultados agrupados por estado
    console.log('='.repeat(80));
    console.log('📊 RESULTADOS DEL QUERY - ISSUES POR ESTADO:');
    console.log('='.repeat(80));
    console.log('');

    Object.keys(statusGroups).sort().forEach(status => {
      const count = statusGroups[status].length;
      const totalSP = statusGroups[status].reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);
      console.log(`\n${status.toUpperCase()} (${count} issues, ${totalSP} SP):`);
      console.log('-'.repeat(80));
      
      statusGroups[status].forEach((issue, index) => {
        const sp = issue.current_story_points || 0;
        const updated = issue.updated_date ? new Date(issue.updated_date).toLocaleDateString() : 'N/A';
        console.log(`  ${(index + 1).toString().padStart(2)}. ${issue.issue_key.padEnd(12)} | SP: ${sp.toString().padStart(2)} | Actualizado: ${updated} | ${issue.summary?.substring(0, 50) || 'N/A'}`);
      });
    });

    // Resumen total
    console.log('\n' + '='.repeat(80));
    console.log('📈 RESUMEN TOTAL:');
    console.log('='.repeat(80));
    
    const totalIssues = issues?.length || 0;
    const totalSP = (issues || []).reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);
    const avgSP = totalIssues > 0 ? (totalSP / totalIssues).toFixed(1) : 0;

    console.log(`\nTotal Issues: ${totalIssues}`);
    console.log(`Total Story Points: ${totalSP}`);
    console.log(`Promedio SP: ${avgSP}`);
    console.log(`\nDistribución por Estado:`);
    
    Object.keys(statusGroups).sort().forEach(status => {
      const count = statusGroups[status].length;
      const percentage = totalIssues > 0 ? ((count / totalIssues) * 100).toFixed(1) : 0;
      console.log(`  ${status.padEnd(20)}: ${count.toString().padStart(3)} (${percentage}%)`);
    });

    // Exportar para comparación
    console.log('\n' + '='.repeat(80));
    console.log('📋 DATOS PARA COMPARACIÓN (formato CSV):');
    console.log('='.repeat(80));
    console.log('\nIssue Key,Estado Actual,Story Points,Summary');
    (issues || []).forEach(issue => {
      const summary = (issue.summary || '').replace(/,/g, ';'); // Reemplazar comas en el resumen
      console.log(`${issue.issue_key},${issue.current_status || 'Unknown'},${issue.current_story_points || 0},"${summary}"`);
    });

  } catch (error) {
    console.error('❌ Error inesperado:', error);
  }
}

async function main() {
  console.log('🔍 VERIFICACIÓN DE PERMISOS Y QUERY A SUPABASE');
  console.log('='.repeat(80));
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseKey.substring(0, 20)}...${supabaseKey.substring(supabaseKey.length - 10)}\n`);

  const hasPermissions = await checkPermissions();
  
  if (!hasPermissions) {
    console.log('\n⚠️ Advertencia: Puede haber problemas con los permisos');
  }

  await querySprintIssues();
}

main();
