/**
 * Configuración de integración con Notion
 * 
 * Para usar esta integración, necesitas:
 * 1. Crear una integración en Notion: https://www.notion.so/my-integrations
 * 2. Obtener el Internal Integration Token
 * 3. Compartir tu base de datos con la integración
 * 4. Obtener el ID de la base de datos (de la URL)
 */

export const NOTION_CONFIG = {
    // API Version de Notion
    apiVersion: '2022-06-28',
    
    // Base URL de la API de Notion
    baseUrl: 'https://api.notion.com/v1',
    
    // Internal Integration Token
    // Obtener en: https://www.notion.so/my-integrations
    apiToken: process.env.VITE_NOTION_API_TOKEN || '',
    
    // ID de la base de datos de Notion
    // Se encuentra en la URL de la base de datos
    // Ejemplo: https://www.notion.so/workspace/DATABASE_ID?v=...
    databaseId: process.env.VITE_NOTION_DATABASE_ID || '',
    
    // Configuración del proxy backend (Supabase Edge Function)
    // El proxy manejará la autenticación de forma segura
    // Si VITE_SUPABASE_URL está configurado, usa la Edge Function
    // Si no, usa la URL personalizada de VITE_NOTION_PROXY_URL
    proxyUrl: process.env.VITE_NOTION_PROXY_URL || 
             (process.env.VITE_SUPABASE_URL ? `${process.env.VITE_SUPABASE_URL}/functions/v1/notion-proxy` : ''),
    
    // Cache time en segundos (5 minutos por defecto)
    cacheTime: 300,
    
    // Mapeo de propiedades de Notion (ajustar según tu base de datos)
    properties: {
        initiative: 'Initiative', // Nombre de la propiedad que contiene el nombre de la iniciativa
        status: 'Status', // Propiedad de estado
        completion: 'Completion', // Porcentaje de completación
        assignee: 'Assignee', // Asignado
        dueDate: 'Due Date', // Fecha de entrega
        epic: 'Epic', // Epic relacionado
        storyPoints: 'Story Points', // Story points
        tags: 'Tags', // Tags o categorías
        comments: 'Comments' // Comentarios o notas
    }
};

/**
 * Mapeo de estados de Notion a estados internos
 */
export const NOTION_STATUS_MAP = {
    'Not Started': 'planned',
    'In Progress': 'in_progress',
    'Done': 'done',
    'Blocked': 'blocked',
    'On Hold': 'blocked',
    'Review': 'in_progress'
};

/**
 * Obtiene el header de autenticación para Notion
 * NOTA: Esto solo se usa en el backend/proxy, nunca en el frontend
 */
export const getNotionAuthHeader = () => {
    if (!NOTION_CONFIG.apiToken) {
        throw new Error('Notion API token not configured');
    }
    return {
        'Authorization': `Bearer ${NOTION_CONFIG.apiToken}`,
        'Notion-Version': NOTION_CONFIG.apiVersion,
        'Content-Type': 'application/json'
    };
};

export default NOTION_CONFIG;

