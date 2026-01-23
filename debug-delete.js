// Script de debug para probar eliminación de un registro específico
import supabaseClient from './jira-supabase-sync/src/clients/supabase-client.js';

async function debugDelete() {
  console.log('🔍 Testing delete operation...');

  // Obtener un registro específico para probar
  const { data: records } = await supabaseClient.client
    .from('issue_sprints')
    .select('id, issue_id, sprint_id, issues!inner(issue_key)')
    .eq('issues.issue_key', 'ODSO-319')
    .limit(1);

  if (!records || records.length === 0) {
    console.log('❌ No se encontró el registro ODSO-319');
    return;
  }

  const record = records[0];
  console.log('📋 Registro encontrado:', {
    id: record.id,
    issue_key: record.issues.issue_key,
    sprint_id: record.sprint_id
  });

  // Intentar eliminar
  console.log('🔄 Intentando eliminar...');
  const { error, data } = await supabaseClient.client
    .from('issue_sprints')
    .delete()
    .eq('id', record.id);

  if (error) {
    console.error('❌ Error en eliminación:', error);
  } else {
    console.log('✅ Eliminación exitosa, respuesta:', data);
  }

  // Verificar si se eliminó
  const { data: check } = await supabaseClient.client
    .from('issue_sprints')
    .select('id')
    .eq('id', record.id);

  console.log('🔍 Verificación post-eliminación:', check?.length || 0, 'registros encontrados');
}

debugDelete();