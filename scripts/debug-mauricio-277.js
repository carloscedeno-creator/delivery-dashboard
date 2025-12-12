/**
 * Debug: Por qué Mauricio muestra 277% cuando tiene 16 SP
 */

import { supabase } from './analyze-supabase.js';

async function debugMauricio277() {
  console.log('🔍 Debug: Mauricio 277% con 16 SP\n');

  try {
    // 1. Buscar Mauricio
    const { data: developers } = await supabase
      .from('developers')
      .select('id, display_name')
      .ilike('display_name', '%mauricio%');

    const mauricio = developers[0];
    console.log(`👤 Desarrollador: ${mauricio.display_name} (ID: ${mauricio.id})\n`);

    // 2. Obtener TODOS los issues de Mauricio (sin filtro de squad)
    const { data: allMauricioIssues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        initiative_id,
        squad_id,
        created_date,
        dev_start_date,
        dev_close_date,
        resolved_date
      `)
      .eq('assignee_id', mauricio.id);

    console.log('='.repeat(80));
    console.log('📋 TODOS los issues de Mauricio (todos los squads)');
    console.log('='.repeat(80));
    console.log(`Total: ${allMauricioIssues.length} issues`);

    const totalSPAll = allMauricioIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
    console.log(`Total SP (todos los squads): ${totalSPAll}`);

    // 3. Agrupar por squad
    const bySquad = {};
    allMauricioIssues.forEach(issue => {
      const squadId = issue.squad_id || 'sin-squad';
      if (!bySquad[squadId]) {
        bySquad[squadId] = { issues: [], totalSP: 0 };
      }
      bySquad[squadId].issues.push(issue);
      bySquad[squadId].totalSP += issue.current_story_points || 0;
    });

    console.log('\n📊 Por Squad:');
    for (const [squadId, data] of Object.entries(bySquad)) {
      const { data: squad } = await supabase
        .from('squads')
        .select('squad_name')
        .eq('id', squadId)
        .single();
      
      const squadName = squad?.squad_name || squadId;
      console.log(`\n${squadName}:`);
      console.log(`  Issues: ${data.issues.length}`);
      console.log(`  Total SP: ${data.totalSP}`);
    }

    // 4. Simular el cálculo que hace getDeveloperAllocationData
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Simulando cálculo de getDeveloperAllocationData');
    console.log('='.repeat(80));

    // Obtener todos los squads
    const { data: allSquads } = await supabase
      .from('squads')
      .select('id, squad_name, squad_key');

    // Obtener todas las iniciativas
    const { data: allInitiatives } = await supabase
      .from('initiatives')
      .select('id, initiative_name, squad_id');

    // Obtener sprints activos
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

    // Obtener issue_sprints
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

    // Función isIssueActiveInSprint (igual que en el código actualizado)
    const isIssueActiveInSprint = (issue, sprint) => {
      if (!sprint) return false;

      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = new Date(sprint.end_date);
      const now = new Date();

      if (sprintEnd < now && sprint.state === 'closed') {
        const daysSinceEnd = (now - sprintEnd) / (1000 * 60 * 60 * 24);
        if (daysSinceEnd > 14) return false;
      }

      // PRIORIDAD 1: Verificar si el issue está explícitamente en este sprint (issue_sprints)
      const issueSprintIds = issueSprintMap.get(issue.id) || [];
      if (issueSprintIds.includes(sprint.id)) {
        return true; // Está en el sprint, contar
      }

      // PRIORIDAD 2: Si NO está en issue_sprints, verificar fechas SOLO para tickets muy recientes
      // Solo contar si fue creado DURANTE el sprint actual (no antes)
      const issueCreated = issue.created_date ? new Date(issue.created_date) : null;
      
      // Si fue creado durante el sprint actual, contarlo
      if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) {
        return true;
      }

      // NO contar issues viejos que se solapan por fechas de desarrollo
      return false;
    };

    // Agrupar por iniciativa y desarrollador (como lo hace getDeveloperAllocationData)
    const allocationMap = new Map();
    const initiativeMap = new Map(allInitiatives.map(i => [i.id, i]));
    const squadMap = new Map(allSquads.map(s => [s.id, s]));

    for (const issue of allMauricioIssues) {
      if (!issue.initiative_id || !issue.assignee_id) continue;

      const initiative = initiativeMap.get(issue.initiative_id);
      if (!initiative) continue;

      const squad = squadMap.get(initiative.squad_id);
      if (!squad) continue;

      const currentSprint = squadSprintMap.get(squad.id);
      
      // Filtrar: solo contar issues activos en el sprint actual
      if (!isIssueActiveInSprint(issue, currentSprint)) {
        continue;
      }

      const key = `${squad.squad_name}::${initiative.initiative_name}::${mauricio.display_name}`;
      
      if (!allocationMap.has(key)) {
        allocationMap.set(key, {
          squad: squad.squad_name,
          initiative: initiative.initiative_name,
          dev: mauricio.display_name,
          totalSP: 0
        });
      }

      const allocation = allocationMap.get(key);
      allocation.totalSP += issue.current_story_points || 0;
    }

    // Calcular porcentajes
    const SPRINT_CAPACITY_SP = 17;
    const allocations = Array.from(allocationMap.values()).map(allocation => {
      const percentage = Math.round((allocation.totalSP / SPRINT_CAPACITY_SP) * 100);
      return {
        squad: allocation.squad,
        initiative: allocation.initiative,
        dev: allocation.dev,
        totalSP: allocation.totalSP,
        percentage: percentage
      };
    });

    console.log('\n📊 Allocation calculado (como el dashboard):');
    console.table(allocations.map(a => ({
      squad: a.squad,
      initiative: a.initiative,
      sp: a.totalSP,
      percentage: `${a.percentage}%`
    })));

    const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);
    const totalSP = allocations.reduce((sum, a) => sum + a.totalSP, 0);

    console.log(`\nTotal Allocation (suma de porcentajes): ${totalPercentage}%`);
    console.log(`Total SP: ${totalSP}`);
    console.log(`\nSi fuera un solo cálculo: ${totalSP} / ${SPRINT_CAPACITY_SP} * 100 = ${Math.round((totalSP / SPRINT_CAPACITY_SP) * 100)}%`);

    // 5. Verificar si hay issues de otros squads
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Issues de Mauricio por Squad');
    console.log('='.repeat(80));

    for (const [squadId, data] of Object.entries(bySquad)) {
      const { data: squad } = await supabase
        .from('squads')
        .select('squad_name')
        .eq('id', squadId)
        .single();
      
      const squadName = squad?.squad_name || squadId;
      const currentSprint = squadSprintMap.get(squadId);
      
      const activeIssues = data.issues.filter(issue => 
        isIssueActiveInSprint(issue, currentSprint)
      );
      const activeSP = activeIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);

      console.log(`\n${squadName}:`);
      console.log(`  Total issues: ${data.issues.length} (${data.totalSP} SP)`);
      console.log(`  Issues activos en sprint: ${activeIssues.length} (${activeSP} SP)`);
      
      if (activeIssues.length > 0) {
        console.log(`  Issues activos:`);
        activeIssues.forEach(i => {
          console.log(`    - ${i.issue_key}: ${i.current_story_points} SP`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

debugMauricio277()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
