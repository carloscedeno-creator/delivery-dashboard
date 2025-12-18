/**
 * Script para verificar en detalle los issues del sprint y comparar con Jira
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

async function main() {
  try {
    // Obtener squad "Core Infrastructure"
    const { data: squads } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .ilike('squad_name', '%Core Infrastructure%');

    if (!squads || squads.length === 0) {
      console.error('❌ No se encontró el squad');
      process.exit(1);
    }

    const squad = squads[0];
    console.log(`✅ Squad: ${squad.squad_name} (${squad.squad_key})\n`);

    // Obtener sprint "ODSO Sprint 11"
    const { data: sprints } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name')
      .eq('squad_id', squad.id)
      .ilike('sprint_name', '%Sprint 11%');

    if (!sprints || sprints.length === 0) {
      console.error('❌ No se encontró el sprint');
      process.exit(1);
    }

    const sprint = sprints[0];
    console.log(`✅ Sprint: ${sprint.sprint_name} (${sprint.sprint_key})\n`);

    // Obtener issues del sprint
    const { data: sprintIssues } = await supabase
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', sprint.id);

    const sprintIssueIds = (sprintIssues || []).map(si => si.issue_id);
    console.log(`📊 Issues en el sprint: ${sprintIssueIds.length}\n`);

    // Obtener initiatives del squad
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('id')
      .eq('squad_id', squad.id);

    const initiativeIds = (initiatives || []).map(i => i.id);
    console.log(`📋 Initiatives del squad: ${initiativeIds.length}\n`);

    // Obtener issues
    const { data: issues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_status,
        current_story_points,
        initiative_id
      `)
      .in('id', sprintIssueIds)
      .in('initiative_id', initiativeIds);

    console.log(`✅ Issues encontrados: ${issues?.length || 0}\n`);

    // Agrupar por estado
    const statusGroups = {};
    (issues || []).forEach(issue => {
      const status = issue.current_status || 'Unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(issue);
    });

    console.log('📊 Issues por Estado:\n');
    Object.keys(statusGroups).sort().forEach(status => {
      console.log(`   ${status} (${statusGroups[status].length}):`);
      statusGroups[status].slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.issue_key}: ${issue.summary?.substring(0, 50)} [SP: ${issue.current_story_points || 0}]`);
      });
      if (statusGroups[status].length > 5) {
        console.log(`      ... y ${statusGroups[status].length - 5} más`);
      }
      console.log('');
    });

    // Comparar con Jira (datos de la imagen)
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPARACIÓN CON JIRA:');
    console.log('='.repeat(60));
    
    const jiraCounts = {
      'TO DO': 3,
      'BLOCKED': 1,
      'IN PROGRESS': 4,
      'TESTING': 7,
      'SECURITY REVIEW': 1,
      'DONE': 14
    };

    console.log('\nEstado'.padEnd(25) + 'Dashboard'.padEnd(15) + 'Jira'.padEnd(15) + 'Diferencia');
    console.log('-'.repeat(70));

    // Normalizar estados para comparar
    const normalizedGroups = {};
    Object.keys(statusGroups).forEach(status => {
      const normalized = status.toUpperCase();
      if (!normalizedGroups[normalized]) {
        normalizedGroups[normalized] = 0;
      }
      normalizedGroups[normalized] += statusGroups[status].length;
    });

    const allStatuses = new Set([
      ...Object.keys(normalizedGroups),
      ...Object.keys(jiraCounts)
    ]);

    allStatuses.forEach(status => {
      const dashCount = normalizedGroups[status] || 0;
      const jiraCount = jiraCounts[status] || 0;
      const diff = dashCount - jiraCount;
      const marker = diff !== 0 ? '⚠️' : '✅';
      console.log(`${marker} ${status.padEnd(22)} ${String(dashCount).padEnd(14)} ${String(jiraCount).padEnd(14)} ${diff !== 0 ? (diff > 0 ? `+${diff}` : `${diff}`) : '✓'}`);
    });

    const totalDash = issues?.length || 0;
    const totalJira = Object.values(jiraCounts).reduce((a, b) => a + b, 0);
    console.log(`\nTotal: ${totalDash} (Dashboard) vs ${totalJira} (Jira) - Diferencia: ${totalDash - totalJira}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
