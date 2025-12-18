/**
 * Script para comparar los datos del dashboard con Jira
 * Identifica discrepancias en conteos de issues por estado
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Obtiene métricas del dashboard para un squad y sprint
 */
async function getDashboardMetrics(squadId, sprintId) {
  console.log(`\n📊 Obteniendo métricas del dashboard para squad: ${squadId}, sprint: ${sprintId}`);

  // Obtener initiative_ids del squad
  const { data: initiatives, error: initiativesError } = await supabase
    .from('initiatives')
    .select('id')
    .eq('squad_id', squadId);

  if (initiativesError) throw initiativesError;
  const initiativeIds = (initiatives || []).map(i => i.id);
  
  console.log(`   📋 Initiatives encontradas: ${initiativeIds.length}`);

  // Obtener issue_ids del sprint
  const { data: sprintIssues, error: sprintError } = await supabase
    .from('issue_sprints')
    .select('issue_id')
    .eq('sprint_id', sprintId);

  if (sprintError) throw sprintError;
  const sprintIssueIds = (sprintIssues || []).map(si => si.issue_id);
  
  console.log(`   🏃 Issues en el sprint: ${sprintIssueIds.length}`);

  // Obtener issues
  let query = supabase
    .from('issues')
    .select(`
      id,
      issue_key,
      summary,
      current_status,
      current_story_points,
      initiative_id,
      initiatives(
        id,
        squad_id,
        squads(
          id,
          squad_key,
          squad_name
        )
      )
    `);

  if (initiativeIds.length > 0) {
    query = query.in('initiative_id', initiativeIds);
  }

  if (sprintIssueIds.length > 0) {
    query = query.in('id', sprintIssueIds);
  }

  const { data: issues, error } = await query;

  if (error) throw error;

  console.log(`   ✅ Issues encontrados: ${(issues || []).length}`);

  // Agrupar por estado
  const statusBreakdown = {};
  let totalSP = 0;

  (issues || []).forEach(issue => {
    const status = issue.current_status || 'Unknown';
    if (!statusBreakdown[status]) {
      statusBreakdown[status] = {
        name: status,
        count: 0,
        issues: []
      };
    }
    statusBreakdown[status].count++;
    statusBreakdown[status].issues.push({
      key: issue.issue_key,
      summary: issue.summary?.substring(0, 50),
      sp: issue.current_story_points || 0
    });
    totalSP += issue.current_story_points || 0;
  });

  // Convertir a array
  const statusData = Object.values(statusBreakdown).map(status => ({
    name: status.name,
    value: status.count,
    issues: status.issues
  }));

  // Ordenar por count descendente
  statusData.sort((a, b) => b.value - a.value);

  return {
    totalTickets: issues?.length || 0,
    totalSP,
    statusData,
    issues: issues || []
  };
}

/**
 * Muestra un resumen comparativo
 */
function showComparison(dashboardData, jiraData) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARACIÓN: Dashboard vs Jira');
  console.log('='.repeat(80));

  console.log(`\n📈 Totales:`);
  console.log(`   Dashboard: ${dashboardData.totalTickets} tickets, ${dashboardData.totalSP} SP`);
  console.log(`   Jira:      ${jiraData.totalTickets} tickets, ${jiraData.totalSP} SP`);
  console.log(`   Diferencia: ${dashboardData.totalTickets - jiraData.totalTickets} tickets`);

  console.log(`\n📋 Por Estado:`);
  console.log('   Estado'.padEnd(25) + 'Dashboard'.padEnd(15) + 'Jira'.padEnd(15) + 'Diferencia');
  console.log('   ' + '-'.repeat(70));

  // Combinar estados de ambos
  const allStatuses = new Set([
    ...dashboardData.statusData.map(s => s.name),
    ...Object.keys(jiraData.statusBreakdown)
  ]);

  for (const status of Array.from(allStatuses).sort()) {
    const dashCount = dashboardData.statusData.find(s => s.name === status)?.value || 0;
    const jiraCount = jiraData.statusBreakdown[status] || 0;
    const diff = dashCount - jiraCount;
    const diffStr = diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '✓';
    const marker = diff !== 0 ? '⚠️' : '✅';
    
    console.log(`   ${marker} ${status.padEnd(22)} ${String(dashCount).padEnd(14)} ${String(jiraCount).padEnd(14)} ${diffStr}`);
  }

  // Mostrar issues que están en el dashboard pero no deberían estar
  console.log(`\n🔍 Issues en Dashboard por Estado:`);
  for (const status of dashboardData.statusData) {
    if (status.value > 0) {
      console.log(`\n   ${status.name} (${status.value}):`);
      status.issues.slice(0, 10).forEach(issue => {
        console.log(`      - ${issue.key}: ${issue.summary} (SP: ${issue.sp})`);
      });
      if (status.issues.length > 10) {
        console.log(`      ... y ${status.issues.length - 10} más`);
      }
    }
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    // Obtener squad "Core Infrastructure"
    const { data: squads, error: squadsError } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .ilike('squad_name', '%Core Infrastructure%');

    if (squadsError) throw squadsError;
    
    if (!squads || squads.length === 0) {
      console.error('❌ No se encontró el squad "Core Infrastructure"');
      process.exit(1);
    }

    const squad = squads[0];
    console.log(`✅ Squad encontrado: ${squad.squad_name} (${squad.squad_key})`);

    // Obtener sprint "ODSO Sprint 11"
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name')
      .eq('squad_id', squad.id)
      .ilike('sprint_name', '%Sprint 11%');

    if (sprintsError) throw sprintsError;
    
    if (!sprints || sprints.length === 0) {
      console.error('❌ No se encontró el sprint "ODSO Sprint 11"');
      process.exit(1);
    }

    const sprint = sprints[0];
    console.log(`✅ Sprint encontrado: ${sprint.sprint_name} (${sprint.sprint_key})`);

    // Obtener métricas del dashboard
    const dashboardData = await getDashboardMetrics(squad.id, sprint.id);

    // Datos de Jira (basados en la imagen proporcionada)
    const jiraData = {
      totalTickets: 30, // Total visible en Jira
      totalSP: 0, // No disponible en la imagen
      statusBreakdown: {
        'TO DO': 3,
        'BLOCKED': 1,
        'IN PROGRESS': 4,
        'TESTING': 7,
        'SECURITY REVIEW': 1,
        'DONE': 14
      }
    };

    // Mostrar comparación
    showComparison(dashboardData, jiraData);

    // Análisis adicional
    console.log(`\n🔍 ANÁLISIS ADICIONAL:`);
    console.log(`   Issues únicos en dashboard: ${dashboardData.issues.length}`);
    
    // Verificar si hay issues de otros proyectos
    const odsoIssues = dashboardData.issues.filter(i => i.issue_key?.startsWith('ODSO-'));
    const od60Issues = dashboardData.issues.filter(i => i.issue_key?.startsWith('OD60-'));
    
    console.log(`   Issues ODSO: ${odsoIssues.length}`);
    console.log(`   Issues OD60: ${od60Issues.length}`);
    
    if (od60Issues.length > 0) {
      console.log(`\n   ⚠️ Issues OD60 encontrados (pueden ser de otro proyecto):`);
      od60Issues.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.issue_key}: ${issue.summary?.substring(0, 50)} [${issue.current_status}]`);
      });
    }

    // Verificar issues sin estado
    const unknownStatus = dashboardData.issues.filter(i => !i.current_status || i.current_status === 'Unknown');
    if (unknownStatus.length > 0) {
      console.log(`\n   ⚠️ Issues sin estado (${unknownStatus.length}):`);
      unknownStatus.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.issue_key}: ${issue.summary?.substring(0, 50)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
