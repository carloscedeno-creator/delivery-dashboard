/**
 * Verificar si Mauricio tiene issues en múltiples squads que se están sumando
 */

import { supabase } from './analyze-supabase.js';

async function checkMauricioAllSquads() {
  console.log('🔍 Verificando allocation de Mauricio en TODOS los squads\n');

  try {
    // 1. Buscar Mauricio
    const { data: developers } = await supabase
      .from('developers')
      .select('id, display_name')
      .ilike('display_name', '%mauricio%');

    const mauricio = developers[0];
    console.log(`👤 Desarrollador: ${mauricio.display_name}\n`);

    // 2. Obtener TODOS los squads
    const { data: allSquads } = await supabase
      .from('squads')
      .select('id, squad_name, squad_key');

    // 3. Obtener sprints activos por squad
    const { data: activeSprints } = await supabase
      .from('sprints')
      .select('id, squad_id, start_date, end_date, state')
      .or('state.eq.active,state.eq.closed')
      .order('end_date', { ascending: false });

    const squadSprintMap = new Map();
    if (activeSprints) {
      for (const sprint of activeSprints) {
        if (!squadSprintMap.has(sprint.squad_id)) {
          squadSprintMap.set(sprint.squad_id, sprint);
        }
      }
    }

    // 4. Obtener issue_sprints
    const { data: issueSprints } = await supabase
      .from('issue_sprints')
      .select('issue_id, sprint_id');

    const issueSprintMap = new Map();
    if (issueSprints) {
      for (const is of issueSprints) {
        if (!issueSprintMap.has(is.issue_id)) {
          issueSprintMap.set(is.issue_id, []);
        }
        issueSprintMap.get(is.issue_id).push(is.sprint_id);
      }
    }

    // 5. Obtener todas las iniciativas
    const { data: allInitiatives } = await supabase
      .from('initiatives')
      .select('id, initiative_name, squad_id');

    const initiativeMap = new Map(allInitiatives.map(i => [i.id, i]));
    const squadMap = new Map(allSquads.map(s => [s.id, s]));

    // 6. Función de filtro actualizada
    const isIssueActiveInSprint = (issue, sprint) => {
      if (!sprint) return false;

      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = new Date(sprint.end_date);
      const now = new Date();

      if (sprintEnd < now && sprint.state === 'closed') {
        const daysSinceEnd = (now - sprintEnd) / (1000 * 60 * 60 * 24);
        if (daysSinceEnd > 14) return false;
      }

      const issueSprintIds = issueSprintMap.get(issue.id) || [];
      if (issueSprintIds.includes(sprint.id)) {
        return true;
      }

      const issueCreated = issue.created_date ? new Date(issue.created_date) : null;
      if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) {
        return true;
      }

      return false;
    };

    // 7. Obtener TODOS los issues de Mauricio
    const { data: allMauricioIssues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        initiative_id,
        squad_id,
        created_date,
        dev_start_date,
        dev_close_date,
        resolved_date
      `)
      .eq('assignee_id', mauricio.id);

    // 8. Agrupar por squad e iniciativa
    const allocationBySquad = {};

    for (const squad of allSquads) {
      const currentSprint = squadSprintMap.get(squad.id);
      const squadIssues = allMauricioIssues.filter(i => i.squad_id === squad.id);
      
      const activeIssues = squadIssues.filter(issue => 
        isIssueActiveInSprint(issue, currentSprint)
      );

      if (activeIssues.length === 0) continue;

      // Agrupar por iniciativa
      const byInitiative = {};
      activeIssues.forEach(issue => {
        if (!issue.initiative_id) return;
        
        const initiative = initiativeMap.get(issue.initiative_id);
        if (!initiative) return;

        const initName = initiative.initiative_name;
        if (!byInitiative[initName]) {
          byInitiative[initName] = { totalSP: 0, issues: [] };
        }
        byInitiative[initName].totalSP += issue.current_story_points || 0;
        byInitiative[initName].issues.push(issue);
      });

      allocationBySquad[squad.squad_name] = {
        sprint: currentSprint?.sprint_name || 'N/A',
        byInitiative,
        totalSP: activeIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0)
      };
    }

    // 9. Calcular porcentajes como lo hace el dashboard
    const SPRINT_CAPACITY_SP = 17;
    let totalPercentage = 0;
    const allAllocations = [];

    console.log('='.repeat(80));
    console.log('📊 Allocation de Mauricio por Squad');
    console.log('='.repeat(80));

    for (const [squadName, data] of Object.entries(allocationBySquad)) {
      console.log(`\n🏢 ${squadName} (Sprint: ${data.sprint})`);
      console.log(`   Total SP: ${data.totalSP}`);
      
      for (const [initName, initData] of Object.entries(data.byInitiative)) {
        const percentage = Math.round((initData.totalSP / SPRINT_CAPACITY_SP) * 100);
        totalPercentage += percentage;
        
        allAllocations.push({
          squad: squadName,
          initiative: initName,
          sp: initData.totalSP,
          percentage: percentage
        });

        console.log(`   ${initName}: ${initData.totalSP} SP = ${percentage}%`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN TOTAL');
    console.log('='.repeat(80));
    console.table(allAllocations.map(a => ({
      squad: a.squad,
      initiative: a.initiative,
      sp: a.sp,
      percentage: `${a.percentage}%`
    })));

    console.log(`\nTotal Allocation (suma de todos los porcentajes): ${totalPercentage}%`);
    
    const totalSP = allAllocations.reduce((sum, a) => sum + a.sp, 0);
    console.log(`Total SP (suma de todos): ${totalSP}`);
    console.log(`Si fuera un solo cálculo: ${totalSP} / ${SPRINT_CAPACITY_SP} * 100 = ${Math.round((totalSP / SPRINT_CAPACITY_SP) * 100)}%`);

    if (totalPercentage > 100) {
      console.log(`\n⚠️ PROBLEMA: El total es ${totalPercentage}% porque se están sumando porcentajes de múltiples squads`);
      console.log(`   Cada squad calcula su porcentaje independientemente y luego se suman`);
      console.log(`   Esto es incorrecto si el desarrollador trabaja en múltiples squads`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkMauricioAllSquads()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
