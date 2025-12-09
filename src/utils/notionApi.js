/**
 * Utilidades para interactuar con la API de Notion
 * Todas las llamadas pasan por el proxy backend para mantener las credenciales seguras
 */

import { NOTION_CONFIG, NOTION_STATUS_MAP } from '../config/notionConfig';

/**
 * Obtiene todas las páginas de una base de datos de Notion
 * @param {Object} filter - Filtro opcional para la consulta
 * @returns {Promise<Array>} Array de páginas
 */
export const getDatabasePages = async (filter = null) => {
    try {
        const proxyUrl = `${NOTION_CONFIG.proxyUrl}?action=getDatabasePages&databaseId=${NOTION_CONFIG.databaseId}`;
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: filter ? JSON.stringify({ filter }) : undefined
        });
        
        if (!response.ok) {
            throw new Error(`Notion API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('[NOTION] Error fetching database pages:', error);
        throw error;
    }
};

/**
 * Busca páginas por nombre de iniciativa
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Array>} Array de páginas encontradas
 */
export const searchPagesByInitiative = async (initiativeName) => {
    try {
        const proxyUrl = `${NOTION_CONFIG.proxyUrl}?action=searchPages&databaseId=${NOTION_CONFIG.databaseId}&initiativeName=${encodeURIComponent(initiativeName)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Notion API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('[NOTION] Error searching pages:', error);
        throw error;
    }
};

/**
 * Extrae el valor de una propiedad de Notion
 * @param {Object} property - Propiedad de Notion
 * @returns {any} Valor extraído
 */
const extractPropertyValue = (property) => {
    if (!property) return null;

    const type = property.type;
    
    switch (type) {
        case 'title':
            return property.title?.[0]?.plain_text || '';
        case 'rich_text':
            return property.rich_text?.[0]?.plain_text || '';
        case 'number':
            return property.number || 0;
        case 'select':
            return property.select?.name || '';
        case 'multi_select':
            return property.multi_select?.map(s => s.name) || [];
        case 'date':
            return property.date?.start || null;
        case 'checkbox':
            return property.checkbox || false;
        case 'people':
            return property.people?.map(p => p.name || p.id) || [];
        default:
            return null;
    }
};

/**
 * Calcula métricas de completación basadas en páginas de Notion
 * @param {Array} pages - Array de páginas de Notion
 * @returns {Object} Métricas calculadas
 */
export const calculateNotionMetrics = (pages) => {
    if (!pages || pages.length === 0) {
        return {
            total: 0,
            completed: 0,
            inProgress: 0,
            blocked: 0,
            completion: 0,
            averageCompletion: 0
        };
    }

    let total = pages.length;
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;
    let completionSum = 0;

    pages.forEach(page => {
        const properties = page.properties || {};
        const status = extractPropertyValue(properties[NOTION_CONFIG.properties.status]);
        const completion = extractPropertyValue(properties[NOTION_CONFIG.properties.completion]) || 0;

        completionSum += completion;

        const statusKey = NOTION_STATUS_MAP[status] || 'planned';

        if (statusKey === 'done' || completion >= 100) {
            completed++;
        } else if (statusKey === 'in_progress' || (completion > 0 && completion < 100)) {
            inProgress++;
        } else if (statusKey === 'blocked') {
            blocked++;
        }
    });

    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    const averageCompletion = total > 0 ? Math.round(completionSum / total) : 0;

    return {
        total,
        completed,
        inProgress,
        blocked,
        completion,
        averageCompletion
    };
};

/**
 * Obtiene métricas de completación para una iniciativa específica
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Object>} Métricas de la iniciativa
 */
export const getInitiativeMetrics = async (initiativeName) => {
    try {
        const pages = await searchPagesByInitiative(initiativeName);
        const metrics = calculateNotionMetrics(pages);

        return {
            initiative: initiativeName,
            metrics,
            pages: pages.map(page => {
                const properties = page.properties || {};
                return {
                    id: page.id,
                    url: page.url,
                    initiative: extractPropertyValue(properties[NOTION_CONFIG.properties.initiative]),
                    status: extractPropertyValue(properties[NOTION_CONFIG.properties.status]),
                    completion: extractPropertyValue(properties[NOTION_CONFIG.properties.completion]) || 0,
                    assignee: extractPropertyValue(properties[NOTION_CONFIG.properties.assignee]),
                    dueDate: extractPropertyValue(properties[NOTION_CONFIG.properties.dueDate])
                };
            })
        };
    } catch (error) {
        console.error('[NOTION] Error getting initiative metrics:', error);
        throw error;
    }
};

export default {
    getDatabasePages,
    searchPagesByInitiative,
    calculateNotionMetrics,
    getInitiativeMetrics
};

