/**
 * Script para verificar tickets en un sprint específico
 * Ayuda a diagnosticar por qué faltan tickets en Developer Metrics
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSprintIssues(sprintName = 'ODSO Sprint 11') {
  try {
    console.log(`\n🔍 Verificando sprint: ${sprintName}\n`);

    // 1. Buscar el sprint
    const { data: sprints, error: sprintError } = await supabase
      .from('sprints')
      .select('id, sprint_key, sprint_name, squad_id')
      .ilike('sprint_name', `%${sprintName}%`);

    if (sprintError) throw sprintError;

    if (!sprints || sprints.length === 0) {
      console.log('❌ No se encontró el sprint');
      return;
    }

    const sprint = sprints[0];
    console.log('✅ Sprint encontrado:', {
      id: sprint.id,
      key: sprint.sprint_key,
      name: sprint.sprint_name,
      squad_id: sprint.squad_id
    });

    // 2. Obtener todos los issues del sprint
    const { data: sprintIssues, error: sprintIssuesError } = await supabase
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', sprint.id);

    if (sprintIssuesError) throw sprintIssuesError;

    const issueIds = (sprintIssues || []).map(si => si.issue_id);
    console.log(`\n📊 Total issues en el sprint: ${issueIds.length}`);

    if (issueIds.length === 0) {
      console.log('⚠️ No hay issues vinculados al sprint en issue_sprints');
      return;
    }

    // 3. Obtener detalles de los issues
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_status,
        current_story_points,
        assignee_id,
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
      `)
      .in('id', issueIds.slice(0, 50)); // Limitar a 50 para no sobrecargar

    if (issuesError) throw issuesError;

    console.log(`\n📋 Issues encontrados en Supabase: ${issues?.length || 0}`);

    // 4. Agrupar por assignee
    const byAssignee = {};
    issues.forEach(issue => {
      const assigneeId = issue.assignee_id || 'unassigned';
      if (!byAssignee[assigneeId]) {
        byAssignee[assigneeId] = [];
      }
      byAssignee[assigneeId].push(issue);
    });

    console.log(`\n👥 Issues por assignee:`);
    Object.entries(byAssignee).forEach(([assigneeId, assigneeIssues]) => {
      console.log(`  ${assigneeId}: ${assigneeIssues.length} tickets`);
      assigneeIssues.slice(0, 3).forEach(issue => {
        console.log(`    - ${issue.issue_key}: ${issue.summary?.substring(0, 50)}... [${issue.current_status}] SP:${issue.current_story_points || 0}`);
      });
    });

    // 5. Verificar issues específicos mencionados
    const checkIssues = ['ODSO-297', 'ODSO-313'];
    console.log(`\n🔍 Verificando issues específicos:`);
    for (const key of checkIssues) {
      const { data: issue, error } = await supabase
        .from('issues')
        .select('*, initiatives(squads(squad_name))')
        .eq('issue_key', key)
        .single();

      if (error) {
        console.log(`  ❌ ${key}: No encontrado en Supabase`);
      } else {
        console.log(`  ✅ ${key}:`, {
          status: issue.current_status,
          sp: issue.current_story_points,
          assignee_id: issue.assignee_id,
          squad: issue.initiatives?.[0]?.squads?.squad_name || 'N/A',
          in_sprint: issueIds.includes(issue.id)
        });
      }
    }

    // 6. Verificar developers
    const assigneeIds = [...new Set(issues.map(i => i.assignee_id).filter(Boolean))];
    if (assigneeIds.length > 0) {
      const { data: developers, error: devError } = await supabase
        .from('developers')
        .select('id, display_name, email')
        .in('id', assigneeIds);

      if (!devError && developers) {
        console.log(`\n👨‍💻 Developers con tickets en el sprint:`);
        developers.forEach(dev => {
          const devIssues = issues.filter(i => String(i.assignee_id) === String(dev.id));
          console.log(`  ${dev.display_name} (${dev.id}): ${devIssues.length} tickets`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
const sprintName = process.argv[2] || 'ODSO Sprint 11';
checkSprintIssues(sprintName);





