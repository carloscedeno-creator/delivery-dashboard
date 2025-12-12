/**
 * Comparar todos los issues de Himani vs lo que está en el sprint
 */

import { supabase } from './analyze-supabase.js';

async function compareHimaniIssues() {
  console.log('🔍 Comparando issues de Himani\n');

  try {
    // 1. Buscar Himani
    const { data: developers } = await supabase
      .from('developers')
      .select('id, display_name')
      .ilike('display_name', '%himani%');

    const himani = developers[0];
    console.log(`👤 Desarrollador: ${himani.display_name} (ID: ${himani.id})\n`);

    // 2. Buscar Core
    const { data: squads } = await supabase
      .from('squads')
      .select('id, squad_name')
      .or('squad_name.ilike.%core%,squad_key.ilike.%core%');

    const coreSquad = squads[0];
    console.log(`🏢 Squad: ${coreSquad.squad_name} (ID: ${coreSquad.id})\n`);

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

    // 4. TODOS los issues de Himani (sin filtrar por sprint)
    console.log('='.repeat(80));
    console.log('1️⃣ TODOS los issues asignados a Himani (sin filtro de sprint)');
    console.log('='.repeat(80));
    
    const { data: allHimaniIssues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        initiative_id,
        squad_id,
        assignee_id
      `)
      .eq('assignee_id', himani.id);

    console.log(`Total issues de Himani: ${allHimaniIssues.length}`);
    console.log('\nIssues por squad:');
    const bySquad = {};
    allHimaniIssues.forEach(issue => {
      const squadId = issue.squad_id || 'sin-squad';
      bySquad[squadId] = (bySquad[squadId] || 0) + 1;
    });
    console.table(bySquad);

    // 5. Issues de Himani en el squad Core (sin filtrar por sprint)
    console.log('\n' + '='.repeat(80));
    console.log('2️⃣ Issues de Himani en squad Core (sin filtro de sprint)');
    console.log('='.repeat(80));
    
    const { data: himaniCoreIssues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        initiative_id
      `)
      .eq('assignee_id', himani.id)
      .eq('squad_id', coreSquad.id);

    console.log(`Total: ${himaniCoreIssues.length}`);
    console.table(himaniCoreIssues.map(i => ({
      key: i.issue_key,
      summary: i.summary?.substring(0, 50),
      status: i.current_status,
      sp: i.current_story_points,
      has_initiative: !!i.initiative_id
    })));

    // 6. Issues en el sprint actual
    console.log('\n' + '='.repeat(80));
    console.log('3️⃣ Issues en el sprint actual (todos, no solo Himani)');
    console.log('='.repeat(80));
    
    const { data: issueSprints } = await supabase
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', currentSprint.id);

    const sprintIssueIds = (issueSprints || []).map(is => is.issue_id);
    console.log(`Total issues en sprint: ${sprintIssueIds.length}`);

    // 7. Issues de Himani que están en el sprint
    console.log('\n' + '='.repeat(80));
    console.log('4️⃣ Issues de Himani que están en el sprint (intersección)');
    console.log('='.repeat(80));
    
    const { data: himaniInSprint } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        initiative_id
      `)
      .eq('assignee_id', himani.id)
      .in('id', sprintIssueIds);

    console.log(`Total: ${himaniInSprint.length}`);
    console.table(himaniInSprint.map(i => ({
      key: i.issue_key,
      summary: i.summary?.substring(0, 50),
      status: i.current_status,
      sp: i.current_story_points,
      has_initiative: !!i.initiative_id
    })));

    // 8. Buscar ODSO-328 específicamente
    console.log('\n' + '='.repeat(80));
    console.log('5️⃣ Buscando ODSO-328 específicamente');
    console.log('='.repeat(80));
    
    const { data: odso328 } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        initiative_id,
        squad_id,
        assignee_id,
        created_date,
        dev_start_date,
        dev_close_date
      `)
      .eq('issue_key', 'ODSO-328');

    if (odso328 && odso328.length > 0) {
      const issue = odso328[0];
      console.log('✅ Encontrado ODSO-328:');
      console.log(`   Summary: ${issue.summary}`);
      console.log(`   Status: ${issue.current_status}`);
      console.log(`   SP: ${issue.current_story_points}`);
      console.log(`   Assignee ID: ${issue.assignee_id}`);
      console.log(`   Squad ID: ${issue.squad_id}`);
      console.log(`   Initiative ID: ${issue.initiative_id || 'null'}`);
      
      // Verificar si está en algún sprint
      const { data: issueSprintData } = await supabase
        .from('issue_sprints')
        .select('sprint_id')
        .eq('issue_id', issue.id);

      console.log(`   En sprints: ${(issueSprintData || []).map(is => is.sprint_id).join(', ') || 'ninguno'}`);
      
      // Verificar si el assignee es Himani
      if (issue.assignee_id === himani.id) {
        console.log('   ✅ Está asignado a Himani');
      } else {
        console.log(`   ⚠️ NO está asignado a Himani (assignee_id: ${issue.assignee_id})`);
      }
      
      // Verificar si está en el sprint actual
      if (sprintIssueIds.includes(issue.id)) {
        console.log('   ✅ Está en el sprint actual');
      } else {
        console.log('   ⚠️ NO está en el sprint actual');
      }
    } else {
      console.log('❌ ODSO-328 no encontrado en la base de datos');
    }

    // 9. Comparación final
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPARACIÓN FINAL');
    console.log('='.repeat(80));
    console.log(`Issues de Himani en Core (sin sprint): ${himaniCoreIssues.length}`);
    console.log(`Issues de Himani en sprint: ${himaniInSprint.length}`);
    console.log(`Diferencia: ${himaniCoreIssues.length - himaniInSprint.length} issues`);
    
    // Issues que están en Core pero NO en el sprint
    const inCoreNotInSprint = himaniCoreIssues.filter(issue => 
      !sprintIssueIds.includes(issue.id)
    );
    
    if (inCoreNotInSprint.length > 0) {
      console.log('\n⚠️ Issues de Himani en Core que NO están en el sprint:');
      console.table(inCoreNotInSprint.map(i => ({
        key: i.issue_key,
        summary: i.summary?.substring(0, 50),
        status: i.current_status,
        sp: i.current_story_points
      })));
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

compareHimaniIssues()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
