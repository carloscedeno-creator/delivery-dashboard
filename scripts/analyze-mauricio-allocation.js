/**
 * Analizar allocation de Mauricio para entender el 277%
 */

import { supabase } from './analyze-supabase.js';

async function analyzeMauricioAllocation() {
  console.log('🔍 Analizando allocation de Mauricio\n');

  try {
    // 1. Buscar Mauricio
    const { data: developers } = await supabase
      .from('developers')
      .select('id, display_name')
      .ilike('display_name', '%mauricio%');

    if (!developers || developers.length === 0) {
      console.log('❌ No se encontró Mauricio');
      return;
    }

    const mauricio = developers[0];
    console.log(`👤 Desarrollador: ${mauricio.display_name} (ID: ${mauricio.id})\n`);

    // 2. Buscar Core
    const { data: squads } = await supabase
      .from('squads')
      .select('id, squad_name, squad_key')
      .or('squad_name.ilike.%core%,squad_key.ilike.%core%');

    const coreSquad = squads[0];
    console.log(`🏢 Squad: ${coreSquad.squad_name}\n`);

    // 3. Sprint actual
    const { data: sprints } = await supabase
      .from('sprints')
      .select('id, sprint_name, start_date, end_date, state')
      .eq('squad_id', coreSquad.id)
      .or('state.eq.active,state.eq.closed')
      .order('end_date', { ascending: false })
      .limit(1);

    const currentSprint = sprints[0];
    console.log(`📅 Sprint: ${currentSprint.sprint_name} (${currentSprint.start_date} - ${currentSprint.end_date})\n`);

    // 4. Obtener issues de Mauricio en el sprint
    const { data: issueSprints } = await supabase
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', currentSprint.id);

    const sprintIssueIds = (issueSprints || []).map(is => is.issue_id);

    const { data: mauricioIssues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        initiative_id,
        created_date,
        dev_start_date,
        dev_close_date,
        resolved_date
      `)
      .eq('assignee_id', mauricio.id)
      .in('id', sprintIssueIds);

    console.log('='.repeat(80));
    console.log('📋 Issues de Mauricio en el sprint');
    console.log('='.repeat(80));
    console.log(`Total issues: ${mauricioIssues.length}`);

    const totalSP = mauricioIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
    console.log(`Total SP: ${totalSP}`);

    console.table(mauricioIssues.map(i => ({
      key: i.issue_key,
      summary: i.summary?.substring(0, 40),
      sp: i.current_story_points,
      status: i.current_status,
      initiative_id: i.initiative_id || 'null'
    })));

    // 5. Agrupar por iniciativa
    const { data: initiatives } = await supabase
      .from('initiatives')
      .select('id, initiative_name')
      .in('id', [...new Set(mauricioIssues.map(i => i.initiative_id).filter(Boolean))]);

    const initiativeMap = new Map(initiatives.map(i => [i.id, i.initiative_name]));

    console.log('\n' + '='.repeat(80));
    console.log('📦 Agrupado por Iniciativa');
    console.log('='.repeat(80));

    const byInitiative = {};
    mauricioIssues.forEach(issue => {
      const initId = issue.initiative_id || 'sin-iniciativa';
      const initName = initiativeMap.get(issue.initiative_id) || 'Sin Iniciativa';
      
      if (!byInitiative[initName]) {
        byInitiative[initName] = {
          issues: [],
          totalSP: 0
        };
      }
      
      byInitiative[initName].issues.push(issue);
      byInitiative[initName].totalSP += issue.current_story_points || 0;
    });

    Object.entries(byInitiative).forEach(([initName, data]) => {
      const percentage = Math.round((data.totalSP / 17) * 100);
      console.log(`\n${initName}:`);
      console.log(`  Issues: ${data.issues.length}`);
      console.log(`  Total SP: ${data.totalSP}`);
      console.log(`  Porcentaje: ${percentage}% (${data.totalSP} / 17 * 100)`);
      console.log(`  Issues: ${data.issues.map(i => `${i.issue_key} (${i.current_story_points} SP)`).join(', ')}`);
    });

    // 6. Calcular total como lo hace el dashboard
    const SPRINT_CAPACITY_SP = 17;
    const totalPercentage = Object.values(byInitiative).reduce((sum, data) => {
      return sum + Math.round((data.totalSP / SPRINT_CAPACITY_SP) * 100);
    }, 0);

    console.log('\n' + '='.repeat(80));
    console.log('📊 Cálculo del Dashboard');
    console.log('='.repeat(80));
    console.log(`Total SP de Mauricio: ${totalSP}`);
    console.log(`Capacidad del sprint: ${SPRINT_CAPACITY_SP} SP`);
    console.log(`\nCálculo por iniciativa (suma de porcentajes):`);
    
    Object.entries(byInitiative).forEach(([initName, data]) => {
      const percentage = Math.round((data.totalSP / SPRINT_CAPACITY_SP) * 100);
      console.log(`  ${initName}: ${data.totalSP} SP = ${percentage}%`);
    });

    console.log(`\nTotal Allocation (suma): ${totalPercentage}%`);
    console.log(`\nSi fuera un solo cálculo: ${totalSP} / ${SPRINT_CAPACITY_SP} * 100 = ${Math.round((totalSP / SPRINT_CAPACITY_SP) * 100)}%`);

    // 7. Verificar si hay issues fuera del sprint que se están contando
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Verificando issues fuera del sprint');
    console.log('='.repeat(80));

    const { data: allMauricioIssues } = await supabase
      .from('issues')
      .select('id, issue_key, summary, current_story_points, initiative_id')
      .eq('assignee_id', mauricio.id)
      .eq('squad_id', coreSquad.id);

    const issuesNotInSprint = allMauricioIssues.filter(issue => 
      !sprintIssueIds.includes(issue.id)
    );

    if (issuesNotInSprint.length > 0) {
      console.log(`⚠️ Encontrados ${issuesNotInSprint.length} issues de Mauricio que NO están en el sprint:`);
      console.table(issuesNotInSprint.map(i => ({
        key: i.issue_key,
        summary: i.summary?.substring(0, 40),
        sp: i.current_story_points,
        initiative_id: i.initiative_id || 'null'
      })));
    } else {
      console.log('✅ Todos los issues de Mauricio están en el sprint');
    }

    // 8. Verificar si el filtro por sprint está funcionando
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Verificando filtro por sprint (isIssueActiveInSprint)');
    console.log('='.repeat(80));

    // Simular el filtro que usa el dashboard
    const sprintStart = new Date(currentSprint.start_date);
    const sprintEnd = new Date(currentSprint.end_date);
    const now = new Date();

    let activeIssues = 0;
    let inactiveIssues = 0;
    let activeSP = 0;
    let inactiveSP = 0;

    mauricioIssues.forEach(issue => {
      let isActive = false;

      // Verificar fechas
      const issueCreated = issue.created_date ? new Date(issue.created_date) : null;
      const issueDevStart = issue.dev_start_date ? new Date(issue.dev_start_date) : null;
      const issueDevClose = issue.dev_close_date ? new Date(issue.dev_close_date) : null;
      const issueResolved = issue.resolved_date ? new Date(issue.resolved_date) : null;

      // Está en el sprint según issue_sprints
      if (sprintIssueIds.includes(issue.id)) {
        isActive = true;
      }
      // O fue creado durante el sprint
      else if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) {
        isActive = true;
      }
      // O está en desarrollo durante el sprint
      else if (issueDevStart && issueDevStart <= sprintEnd) {
        if (!issueDevClose || issueDevClose >= sprintStart) {
          isActive = true;
        }
      }
      // O fue resuelto durante el sprint
      else if (issueResolved && issueResolved >= sprintStart && issueResolved <= sprintEnd) {
        isActive = true;
      }

      if (isActive) {
        activeIssues++;
        activeSP += issue.current_story_points || 0;
      } else {
        inactiveIssues++;
        inactiveSP += issue.current_story_points || 0;
      }
    });

    console.log(`Issues activos: ${activeIssues} (${activeSP} SP)`);
    console.log(`Issues inactivos: ${inactiveIssues} (${inactiveSP} SP)`);

    if (inactiveIssues > 0) {
      console.log('\n⚠️ Hay issues que NO deberían contarse según el filtro:');
      const inactive = mauricioIssues.filter(issue => {
        const issueCreated = issue.created_date ? new Date(issue.created_date) : null;
        const issueDevStart = issue.dev_start_date ? new Date(issue.dev_start_date) : null;
        const issueDevClose = issue.dev_close_date ? new Date(issue.dev_close_date) : null;
        const issueResolved = issue.resolved_date ? new Date(issue.resolved_date) : null;

        if (sprintIssueIds.includes(issue.id)) return false;
        if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) return false;
        if (issueDevStart && issueDevStart <= sprintEnd && (!issueDevClose || issueDevClose >= sprintStart)) return false;
        if (issueResolved && issueResolved >= sprintStart && issueResolved <= sprintEnd) return false;
        return true;
      });

      console.table(inactive.map(i => ({
        key: i.issue_key,
        summary: i.summary?.substring(0, 40),
        sp: i.current_story_points,
        created: i.created_date?.split('T')[0],
        dev_start: i.dev_start_date?.split('T')[0],
        dev_close: i.dev_close_date?.split('T')[0]
      })));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

analyzeMauricioAllocation()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
