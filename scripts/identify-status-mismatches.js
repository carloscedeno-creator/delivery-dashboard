/**
 * Script para identificar issues con estados que no coinciden con Jira
 * Lista todos los issues del sprint y sus estados actuales
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

// Estados esperados en Jira para el sprint
const jiraExpectedStates = {
  'ODSO-310': 'TO DO',
  'ODSO-317': 'TO DO',
  'ODSO-7': 'TO DO',
  'ODSO-309': 'BLOCKED',
  'ODSO-320': 'IN PROGRESS',
  'ODSO-316': 'IN PROGRESS',
  'ODSO-312': 'IN PROGRESS',
  'ODSO-334': 'IN PROGRESS',
  'ODSO-315': 'TESTING',
  'ODSO-329': 'TESTING',
  'ODSO-328': 'TESTING',
  'ODSO-308': 'TESTING',
  'ODSO-311': 'TESTING',
  // ... más issues en TESTING
  'ODSO-297': 'SECURITY REVIEW',
  // Issues en DONE (14 total según Jira)
  'OD60-248': 'DONE',
  'OD60-301': 'DONE',
  'OD60-326': 'DONE',
  'OD60-304': 'DONE',
  'OD60-310': 'DONE',
  'OD60-306': 'DONE',
  'ODSO-205': 'DONE',
  'OD60-07': 'DONE',
  // ... más issues en DONE
};

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

    // Obtener issues con sus estados
    const { data: issues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_status,
        current_story_points,
        updated_date
      `)
      .in('id', sprintIssueIds)
      .in('initiative_id', initiativeIds)
      .order('issue_key', { ascending: true });

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

    console.log('📊 Issues por Estado en Base de Datos:\n');
    Object.keys(statusGroups).sort().forEach(status => {
      console.log(`\n   ${status} (${statusGroups[status].length}):`);
      statusGroups[status].forEach(issue => {
        const expectedStatus = jiraExpectedStates[issue.issue_key];
        const marker = expectedStatus && expectedStatus.toUpperCase() !== status.toUpperCase() ? '⚠️' : '  ';
        console.log(`      ${marker} ${issue.issue_key}: ${issue.summary?.substring(0, 60)}`);
        if (expectedStatus && expectedStatus.toUpperCase() !== status.toUpperCase()) {
          console.log(`         Esperado en Jira: ${expectedStatus}, Actual: ${status}`);
        }
      });
    });

    // Listar todos los issues para comparación
    console.log('\n' + '='.repeat(80));
    console.log('📋 LISTA COMPLETA DE ISSUES DEL SPRINT:');
    console.log('='.repeat(80));
    console.log('\nIssue Key'.padEnd(15) + 'Estado Actual'.padEnd(20) + 'Estado Esperado (Jira)'.padEnd(25) + 'Coincide');
    console.log('-'.repeat(80));

    (issues || []).forEach(issue => {
      const currentStatus = (issue.current_status || 'Unknown').toUpperCase();
      const expectedStatus = jiraExpectedStates[issue.issue_key]?.toUpperCase() || 'N/A';
      const matches = expectedStatus === 'N/A' ? '?' : (currentStatus === expectedStatus ? '✅' : '❌');
      console.log(`${issue.issue_key.padEnd(15)} ${currentStatus.padEnd(20)} ${expectedStatus.padEnd(25)} ${matches}`);
    });

    // Resumen de discrepancias
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN DE DISCREPANCIAS:');
    console.log('='.repeat(80));

    const mismatches = (issues || []).filter(issue => {
      const expected = jiraExpectedStates[issue.issue_key];
      if (!expected) return false;
      return (issue.current_status || '').toUpperCase() !== expected.toUpperCase();
    });

    console.log(`\n⚠️ Issues con estados incorrectos: ${mismatches.length}`);
    if (mismatches.length > 0) {
      mismatches.forEach(issue => {
        console.log(`   - ${issue.issue_key}: "${issue.current_status}" debería ser "${jiraExpectedStates[issue.issue_key]}"`);
      });
    }

    const notInJira = (issues || []).filter(issue => !jiraExpectedStates[issue.issue_key]);
    console.log(`\n❓ Issues en BD pero no en lista de Jira: ${notInJira.length}`);
    if (notInJira.length > 0) {
      notInJira.slice(0, 10).forEach(issue => {
        console.log(`   - ${issue.issue_key}: ${issue.summary?.substring(0, 50)} [${issue.current_status}]`);
      });
      if (notInJira.length > 10) {
        console.log(`   ... y ${notInJira.length - 10} más`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
