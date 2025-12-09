/**
 * Configuración de integración con Jira
 * 
 * Para usar esta integración, necesitas:
 * 1. Crear un API Token en Jira: https://id.atlassian.com/manage-profile/security/api-tokens
 * 2. Obtener tu dominio de Jira (ej: tu-empresa.atlassian.net)
 * 3. Configurar las variables de entorno o usar el proxy backend
 */

export const JIRA_CONFIG = {
    // URL base de tu instancia de Jira
    // Ejemplo: 'https://tu-empresa.atlassian.net'
    baseUrl: process.env.VITE_JIRA_BASE_URL || '',
    
    // Email asociado a tu cuenta de Jira
    email: process.env.VITE_JIRA_EMAIL || '',
    
    // API Token (generado en https://id.atlassian.com/manage-profile/security/api-tokens)
    apiToken: process.env.VITE_JIRA_API_TOKEN || '',
    
    // Proyecto de Jira a consultar
    projectKey: process.env.VITE_JIRA_PROJECT_KEY || '',
    
    // Configuración del proxy backend (Cloudflare Worker)
    // El proxy manejará la autenticación de forma segura
    proxyUrl: process.env.VITE_JIRA_PROXY_URL || 'https://sheets-proxy.carlos-cedeno.workers.dev/jira',
    
    // Cache time en segundos (5 minutos por defecto)
    cacheTime: 300,
    
    // Campos de Jira que queremos obtener
    fields: {
        summary: 'summary',
        status: 'status',
        assignee: 'assignee',
        created: 'created',
        updated: 'updated',
        resolution: 'resolutiondate',
        epic: 'customfield_10011', // Epic Link (puede variar según tu configuración)
        storyPoints: 'customfield_10016', // Story Points (puede variar)
        sprint: 'customfield_10020', // Sprint (puede variar)
        priority: 'priority',
        issueType: 'issuetype'
    }
};

/**
 * Mapeo de estados de Jira a estados internos
 */
export const JIRA_STATUS_MAP = {
    'To Do': 'planned',
    'In Progress': 'in_progress',
    'Done': 'done',
    'Resolved': 'done',
    'Closed': 'done',
    'Blocked': 'blocked',
    'In Review': 'in_progress',
    'Testing': 'in_progress'
};

/**
 * Construye la URL de autenticación básica para Jira
 * NOTA: Esto solo se usa en el backend/proxy, nunca en el frontend
 */
export const getJiraAuthHeader = () => {
    if (!JIRA_CONFIG.email || !JIRA_CONFIG.apiToken) {
        throw new Error('Jira credentials not configured');
    }
    const token = btoa(`${JIRA_CONFIG.email}:${JIRA_CONFIG.apiToken}`);
    return `Basic ${token}`;
};

/**
 * Obtiene la URL completa para una consulta de Jira
 */
export const buildJiraUrl = (endpoint) => {
    if (!JIRA_CONFIG.baseUrl) {
        throw new Error('Jira base URL not configured');
    }
    return `${JIRA_CONFIG.baseUrl}/rest/api/3/${endpoint}`;
};

export default JIRA_CONFIG;

