/**
 * Query: Tickets de Himani en sprint actual de Core
 */

import { analyzeData, supabase } from './analyze-supabase.js';

async function getHimaniTicketsInCoreSprint() {
  console.log('🔍 Buscando tickets de Himani en sprint actual de Core\n');

  try {
    // 1. Buscar desarrollador "Himani"
    console.log('1️⃣ Buscando desarrollador "Himani"...');
    const { data: developers, error: devError } = await supabase
      .from('developers')
      .select('id, display_name')
      .ilike('display_name', '%himani%');

    if (devError) throw devError;
    if (!developers || developers.length === 0) {
      console.log('❌ No se encontró el desarrollador "Himani"');
      return;
    }

    const himani = developers[0];
    console.log(`✅ Encontrado: ${himani.display_name} (ID: ${himani.id})\n`);

    // 2. Buscar squad "Core"
    console.log('2️⃣ Buscando squad "Core"...');
    const { data: squads, error: squadError } = await supabase
      .from('squads')
      .select('id, squad_name, squad_key')
      .or('squad_name.ilike.%core%,squad_key.ilike.%core%');

    if (squadError) throw squadError;
    if (!squads || squads.length === 0) {
      console.log('❌ No se encontró el squad "Core"');
      return;
    }

    const coreSquad = squads[0];
    console.log(`✅ Encontrado: ${coreSquad.squad_name} (ID: ${coreSquad.id})\n`);

    // 3. Buscar sprint actual de Core
    console.log('3️⃣ Buscando sprint actual de Core...');
    const { data: sprints, error: sprintError } = await supabase
      .from('sprints')
      .select('id, sprint_name, start_date, end_date, state, squad_id')
      .eq('squad_id', coreSquad.id)
      .or('state.eq.active,state.eq.closed')
      .order('end_date', { ascending: false })
      .limit(1);

    if (sprintError) throw sprintError;
    if (!sprints || sprints.length === 0) {
      console.log('❌ No se encontró sprint para Core');
      return;
    }

    const currentSprint = sprints[0];
    console.log(`✅ Sprint actual: ${currentSprint.sprint_name}`);
    console.log(`   Estado: ${currentSprint.state}`);
    console.log(`   Fechas: ${currentSprint.start_date} - ${currentSprint.end_date}\n`);

    // 4. Buscar issues asignados a Himani en el sprint actual
    console.log('4️⃣ Buscando issues de Himani en el sprint...');
    
    // Primero obtener los issue_ids del sprint
    const { data: issueSprints, error: issueSprintsError } = await supabase
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', currentSprint.id);

    if (issueSprintsError) throw issueSprintsError;
    
    const issueIds = (issueSprints || []).map(is => is.issue_id);
    
    if (issueIds.length === 0) {
      console.log('⚠️ No hay issues en este sprint');
      return;
    }

    console.log(`   Issues en sprint: ${issueIds.length}`);

    // Obtener issues de Himani que están en el sprint
    const { data: issues, error: issuesError } = await supabase
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
      .eq('assignee_id', himani.id)
      .in('id', issueIds);

    if (issuesError) throw issuesError;
    
    if (!issues || issues.length === 0) {
      console.log('❌ No se encontraron issues de Himani en el sprint actual de Core');
      return;
    }

    console.log(`✅ Encontrados ${issues.length} issues de Himani\n`);

    // 5. Obtener las épicas (initiatives) asociadas
    const initiativeIds = [...new Set(issues.map(i => i.initiative_id).filter(Boolean))];
    
    let initiatives = [];
    if (initiativeIds.length > 0) {
      const { data: initData, error: initError } = await supabase
        .from('initiatives')
        .select('id, initiative_name, initiative_key')
        .in('id', initiativeIds);

      if (initError) throw initError;
      initiatives = initData || [];
    }

    // Crear mapa de iniciativas
    const initiativeMap = new Map(initiatives.map(i => [i.id, i]));

    // 6. Mostrar resultados
    console.log('='.repeat(80));
    console.log('📊 RESULTADOS');
    console.log('='.repeat(80));
    console.log(`\n👤 Desarrollador: ${himani.display_name}`);
    console.log(`🏢 Squad: ${coreSquad.squad_name}`);
    console.log(`📅 Sprint: ${currentSprint.sprint_name} (${currentSprint.start_date} - ${currentSprint.end_date})`);
    console.log(`\n📋 Tickets encontrados: ${issues.length}\n`);

    // Agrupar por épica
    const issuesByEpic = {};
    issues.forEach(issue => {
      const epicId = issue.initiative_id || 'sin-epica';
      const epic = initiativeMap.get(issue.initiative_id);
      const epicName = epic ? epic.initiative_name : 'Sin Épica';
      
      if (!issuesByEpic[epicName]) {
        issuesByEpic[epicName] = [];
      }
      issuesByEpic[epicName].push(issue);
    });

    // Mostrar agrupado por épica
    Object.entries(issuesByEpic).forEach(([epicName, epicIssues]) => {
      const totalSP = epicIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
      console.log(`\n📦 ÉPICA: ${epicName}`);
      console.log(`   Tickets: ${epicIssues.length} | Total SP: ${totalSP}`);
      console.log('   ' + '-'.repeat(76));
      
      epicIssues.forEach(issue => {
        const status = issue.current_status || 'N/A';
        const sp = issue.current_story_points || 0;
        console.log(`   • ${issue.issue_key}: ${issue.summary}`);
        console.log(`     Estado: ${status} | SP: ${sp}`);
      });
    });

    // Resumen
    const totalSP = issues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
    const doneIssues = issues.filter(i => {
      const status = (i.current_status || '').toLowerCase();
      return status.includes('done') || status.includes('closed') || status.includes('resolved');
    });
    const doneSP = doneIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);

    console.log('\n' + '='.repeat(80));
    console.log('📈 RESUMEN');
    console.log('='.repeat(80));
    console.log(`Total de tickets: ${issues.length}`);
    console.log(`Total SP: ${totalSP}`);
    console.log(`Tickets completados: ${doneIssues.length} (${doneSP} SP)`);
    console.log(`Tickets en progreso: ${issues.length - doneIssues.length} (${totalSP - doneSP} SP)`);
    console.log(`Épicas involucradas: ${Object.keys(issuesByEpic).length}`);

    return {
      developer: himani,
      squad: coreSquad,
      sprint: currentSprint,
      issues,
      initiatives,
      summary: {
        totalIssues: issues.length,
        totalSP,
        doneIssues: doneIssues.length,
        doneSP,
        epics: Object.keys(issuesByEpic).length
      }
    };

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Ejecutar
getHimaniTicketsInCoreSprint()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
