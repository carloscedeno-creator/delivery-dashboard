/**
 * Buscar issues que podrían estar faltando
 * Comparar con lo que debería estar según Jira
 */

import { supabase } from './analyze-supabase.js';

async function findMissingIssues() {
  console.log('🔍 Buscando issues faltantes\n');

  try {
    // 1. Himani
    const { data: developers } = await supabase
      .from('developers')
      .select('id, display_name')
      .ilike('display_name', '%himani%');
    const himani = developers[0];

    // 2. Core
    const { data: squads } = await supabase
      .from('squads')
      .select('id, squad_name')
      .or('squad_name.ilike.%core%,squad_key.ilike.%core%');
    const coreSquad = squads[0];

    // 3. Sprint actual
    const { data: sprints } = await supabase
      .from('sprints')
      .select('id, sprint_name, start_date, end_date, state')
      .eq('squad_id', coreSquad.id)
      .or('state.eq.active,state.eq.closed')
      .order('end_date', { ascending: false })
      .limit(1);
    const currentSprint = sprints[0];

    console.log(`👤 Desarrollador: ${himani.display_name}`);
    console.log(`🏢 Squad: ${coreSquad.squad_name}`);
    console.log(`📅 Sprint: ${currentSprint.sprint_name}\n`);

    // 4. Buscar issues recientes de Himani (últimos 30 días)
    console.log('='.repeat(80));
    console.log('Issues de Himani creados/modificados en los últimos 30 días');
    console.log('='.repeat(80));
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: recentIssues } = await supabase
      .from('issues')
      .select(`
        id,
        issue_key,
        summary,
        current_story_points,
        current_status,
        created_date,
        updated_date,
        initiative_id
      `)
      .eq('assignee_id', himani.id)
      .eq('squad_id', coreSquad.id)
      .gte('updated_date', dateStr)
      .order('updated_date', { ascending: false });

    console.log(`Total issues recientes: ${recentIssues.length}`);
    console.table(recentIssues.map(i => ({
      key: i.issue_key,
      summary: i.summary?.substring(0, 50),
      status: i.current_status,
      sp: i.current_story_points,
      updated: i.updated_date?.split('T')[0],
      has_initiative: !!i.initiative_id
    })));

    // 5. Buscar issues sin initiative_id que podrían estar en el sprint
    console.log('\n' + '='.repeat(80));
    console.log('Issues de Himani SIN initiative_id (podrían estar faltando)');
    console.log('='.repeat(80));
    
    const { data: issuesWithoutInitiative } = await supabase
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
      .eq('squad_id', coreSquad.id)
      .is('initiative_id', null);

    console.log(`Total sin initiative: ${issuesWithoutInitiative.length}`);
    console.table(issuesWithoutInitiative.map(i => ({
      key: i.issue_key,
      summary: i.summary?.substring(0, 50),
      status: i.current_status,
      sp: i.current_story_points
    })));

    // 6. Verificar si hay issues en el sprint que no tienen initiative_id
    const { data: issueSprints } = await supabase
      .from('issue_sprints')
      .select('issue_id')
      .eq('sprint_id', currentSprint.id);
    const sprintIssueIds = (issueSprints || []).map(is => is.issue_id);

    const { data: sprintIssuesWithoutInitiative } = await supabase
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
      .in('id', sprintIssueIds)
      .is('initiative_id', null);

    if (sprintIssuesWithoutInitiative && sprintIssuesWithoutInitiative.length > 0) {
      console.log('\n' + '='.repeat(80));
      console.log('⚠️ Issues de Himani EN EL SPRINT pero SIN initiative_id');
      console.log('='.repeat(80));
      console.table(sprintIssuesWithoutInitiative.map(i => ({
        key: i.issue_key,
        summary: i.summary?.substring(0, 50),
        status: i.current_status,
        sp: i.current_story_points
      })));
    }

    // 7. Buscar por issue_key específicos que sabemos que deberían estar
    console.log('\n' + '='.repeat(80));
    console.log('Buscando issue_keys específicos mencionados');
    console.log('='.repeat(80));
    
    const keysToCheck = ['ODSO-328', 'ODSO-317', 'ODSO-314', 'ODSO-310', 'ODSO-309', 'ODSO-308', 'ODSO-275', 'ODSO-266'];
    
    for (const key of keysToCheck) {
      const { data: issue } = await supabase
        .from('issues')
        .select('id, issue_key, summary, current_status, assignee_id, squad_id')
        .eq('issue_key', key)
        .limit(1);
      
      if (issue && issue.length > 0) {
        const i = issue[0];
        const isHimani = i.assignee_id === himani.id;
        const isCore = i.squad_id === coreSquad.id;
        console.log(`${isHimani && isCore ? '✅' : '⚠️'} ${key}: ${i.summary?.substring(0, 50)}`);
        console.log(`   Himani: ${isHimani ? 'Sí' : 'No'} | Core: ${isCore ? 'Sí' : 'No'} | Status: ${i.current_status}`);
      } else {
        console.log(`❌ ${key}: NO ENCONTRADO en Supabase`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 CONCLUSIÓN');
    console.log('='.repeat(80));
    console.log('ODSO-328 no está en Supabase. Esto indica que:');
    console.log('1. El servicio de sincronización podría no estar capturando todos los tickets');
    console.log('2. ODSO-328 podría ser muy reciente y aún no sincronizado');
    console.log('3. Podría haber un problema con el filtro JQL en el servicio de sync');
    console.log('\nRecomendación: Verificar el servicio de sincronización y el filtro JQL');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

findMissingIssues()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
