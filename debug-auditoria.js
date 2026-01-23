// Script de debug para verificar qué IDs obtiene la auditoría
import supabaseClient from './jira-supabase-sync/src/clients/supabase-client.js';

async function debugAuditoria() {
  console.log('🔍 Verificando qué IDs obtiene la auditoría...');

  // Simular la query de la auditoría
  const { data: sprintIssues, error } = await supabaseClient.client
    .from('issue_sprints')
    .select(`
      id,
      sprint_id,
      issue_id,
      status_at_sprint_close,
      sprints!inner(
        id,
        sprint_name,
        state,
        start_date,
        end_date,
        complete_date
      ),
      issues!inner(
        id,
        issue_key,
        squad_id
      )
    `)
    .eq('sprints.state', 'closed')
    .limit(5); // Solo primeros 5

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Encontrados ${sprintIssues.length} registros`);
  console.log('📋 Primeros registros:');

  sprintIssues.forEach((record, index) => {
    console.log(`${index + 1}. ID: ${record.id}`);
    console.log(`   Issue: ${record.issues?.issue_key}`);
    console.log(`   Sprint: ${record.sprints?.sprint_name}`);
    console.log(`   Sprint State: ${record.sprints?.state}`);
    console.log('');
  });

  // Verificar si estos IDs existen realmente
  console.log('🔍 Verificando si estos IDs existen...');
  for (const record of sprintIssues.slice(0, 3)) {
    const { data: check } = await supabaseClient.client
      .from('issue_sprints')
      .select('id')
      .eq('id', record.id);

    console.log(`ID ${record.id}: ${check?.length || 0} registros encontrados`);
  }
}

debugAuditoria();