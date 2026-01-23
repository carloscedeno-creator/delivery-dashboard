// Verificar si ODSO-319 existe realmente en Jira
import { createJiraClients } from './jira-supabase-sync/src/clients/jira-client-factory.js';
import { projects } from './jira-supabase-sync/src/config/projects.js';

console.log('🔍 Debug: projects import result:', projects);
console.log('🔍 Debug: projects length:', projects?.length);
console.log('🔍 Debug: projects type:', typeof projects);

async function verifyJiraIssue() {
  console.log('🔍 Verificando si ODSO-319 existe en Jira...');

  console.log('📋 Proyectos disponibles:', projects.map(p => p.projectKey));

  // Obtener cliente Jira para ODSO
  const project = projects.find(p => p.projectKey === 'ODSO');
  if (!project) {
    console.log('❌ Proyecto ODSO no encontrado');
    console.log('🔍 Buscando con case insensitive...');
    const projectAlt = projects.find(p => p.projectKey.toUpperCase() === 'ODSO');
    if (projectAlt) {
      console.log('✅ Encontrado con case insensitive');
      return;
    }
    return;
  }

  const jiraClients = createJiraClients([project]);
  const jiraClient = jiraClients.get(project.projectKey);

  try {
    const issueDetails = await jiraClient.fetchIssueDetails('ODSO-319');

    if (issueDetails) {
      console.log('✅ ODSO-319 EXISTE en Jira');
      console.log('📋 Detalles:', {
        key: issueDetails.key,
        summary: issueDetails.fields?.summary,
        status: issueDetails.fields?.status?.name
      });
    } else {
      console.log('❌ ODSO-319 NO EXISTE en Jira (404)');
    }
  } catch (error) {
    if (error.status === 404) {
      console.log('❌ ODSO-319 NO EXISTE en Jira (error 404)');
    } else {
      console.log('❌ Error verificando ODSO-319:', error.message);
    }
  }
}

verifyJiraIssue();