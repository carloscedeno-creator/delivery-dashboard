// Script temporal para verificar resultado de limpieza
import supabaseClient from './jira-supabase-sync/src/clients/supabase-client.js';

async function checkCleanupResult() {
  console.log('🔍 Verificando resultado de limpieza...');

  const { data, error } = await supabaseClient.client
    .from('issue_sprints')
    .select('id, issue_id, sprint_id', { count: 'exact' });

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`📊 Registros restantes en issue_sprints: ${data.length}`);

  // Verificar algunos issues específicos
  const testIssues = ['ODSO-319', 'ODSO-310', 'ODSO-311'];

  for (const issueKey of testIssues) {
    const { data: records } = await supabaseClient.client
      .from('issue_sprints')
      .select('id, issues!inner(issue_key)')
      .eq('issues.issue_key', issueKey);

    console.log(`🔍 ${issueKey}: ${records?.length || 0} registros encontrados`);
  }
}

checkCleanupResult();