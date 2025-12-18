/**
 * Configuración del servicio de sincronización
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  jira: {
    domain: process.env.JIRA_DOMAIN || 'goavanto.atlassian.net',
    email: process.env.JIRA_EMAIL || 'carlos.cedeno@agenticdream.com',
    apiToken: process.env.JIRA_API_TOKEN,
    storyPointsFieldId: process.env.STORY_POINTS_FIELD_ID || 'customfield_10016',
    sprintFieldId: process.env.SPRINT_FIELD_ID || 'customfield_10020',
    // Campos de fecha del timeline de épicas (pueden variar según configuración de Jira)
    epicStartDateFieldId: process.env.EPIC_START_DATE_FIELD_ID || null,
    epicEndDateFieldId: process.env.EPIC_END_DATE_FIELD_ID || null,
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  sync: {
    intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '30', 10),
    projectKey: process.env.PROJECT_KEY || 'obd',
    jqlQuery: process.env.JQL_QUERY || 'project = "obd" AND issuetype != "Sub-task" ORDER BY created DESC',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    debug: process.env.DEBUG === 'true',
  },
};

// Validar configuración requerida (solo si no se usa PROJECTS_CONFIG)
// Si se usa PROJECTS_CONFIG, los tokens vienen en el JSON
// NOTA: Esta validación se puede omitir si se usa PROJECTS_CONFIG
// La validación real se hace en projects.js cuando se valida la configuración

// Solo validar Supabase (siempre requerido)
// La validación de Jira se hace en projects.js cuando se valida PROJECTS_CONFIG
if (!config.supabase.serviceRoleKey) {
  // No lanzar error aquí, solo en runtime cuando realmente se necesite
  // Esto permite que el script de verificación cargue el .env primero
}

export default config;

