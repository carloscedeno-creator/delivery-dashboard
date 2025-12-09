/**
 * Servicio unificado para obtener métricas de completación
 * Combina datos de Google Sheets con métricas reales de Jira y Notion
 */

import { getInitiativeMetrics as getJiraMetrics } from './jiraApi';
import { getInitiativeMetrics as getNotionMetrics } from './notionApi';

/**
 * Obtiene métricas combinadas para una iniciativa
 * Intenta obtener métricas de Jira y Notion, y las combina con los datos de Google Sheets
 * 
 * @param {Object} initiative - Iniciativa de Google Sheets
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.useJira - Si se debe usar Jira (default: true)
 * @param {boolean} options.useNotion - Si se debe usar Notion (default: true)
 * @param {string} options.jiraProjectKey - Clave del proyecto de Jira (opcional)
 * @returns {Promise<Object>} Métricas combinadas
 */
export const getCombinedMetrics = async (initiative, options = {}) => {
    const {
        useJira = true,
        useNotion = true,
        jiraProjectKey = null
    } = options;

    const initiativeName = initiative.initiative || initiative.name || '';
    const currentCompletion = initiative.status || initiative.completion || 0;

    let jiraMetrics = null;
    let notionMetrics = null;
    let realisticCompletion = null;
    let mightBeMisleading = false;

    // Intentar obtener métricas de Jira
    if (useJira && initiativeName) {
        try {
            jiraMetrics = await getJiraMetrics(initiativeName, jiraProjectKey);
            if (jiraMetrics && jiraMetrics.metrics) {
                // Usar el porcentaje basado en story points si está disponible
                realisticCompletion = jiraMetrics.metrics.storyPointsCompletion || 
                                    jiraMetrics.metrics.completion;
                
                // Determinar si puede ser engañoso
                if (realisticCompletion && currentCompletion) {
                    mightBeMisleading = Math.abs(currentCompletion - realisticCompletion) > 20;
                }
            }
        } catch (error) {
            console.warn('[METRICS] Jira metrics not available:', error.message);
        }
    }

    // Intentar obtener métricas de Notion
    if (useNotion && initiativeName && !realisticCompletion) {
        try {
            notionMetrics = await getNotionMetrics(initiativeName);
            if (notionMetrics && notionMetrics.metrics) {
                realisticCompletion = notionMetrics.metrics.averageCompletion || 
                                    notionMetrics.metrics.completion;
                
                // Determinar si puede ser engañoso
                if (realisticCompletion && currentCompletion) {
                    mightBeMisleading = Math.abs(currentCompletion - realisticCompletion) > 20;
                }
            }
        } catch (error) {
            console.warn('[METRICS] Notion metrics not available:', error.message);
        }
    }

    // Si no hay métricas de Jira o Notion, usar lógica de detección básica
    if (!realisticCompletion) {
        // Detectar si puede ser engañoso basado en otros factores
        const comments = (initiative.comments || '').toLowerCase();
        const spi = initiative.spi || 1;
        
        mightBeMisleading = 
            (currentCompletion > 80 && spi < 0.9) || // Alto porcentaje pero atrasado
            comments.includes('blocked') || // Bloqueado
            comments.includes('missing') || // Faltan tareas
            comments.includes('incomplete'); // Incompleto
    }

    return {
        initiative: initiativeName,
        currentCompletion,
        realisticCompletion,
        mightBeMisleading,
        jiraMetrics,
        notionMetrics,
        source: realisticCompletion 
            ? (jiraMetrics ? 'jira' : 'notion') 
            : 'sheets'
    };
};

/**
 * Obtiene métricas combinadas para múltiples iniciativas
 * @param {Array} initiatives - Array de iniciativas
 * @param {Object} options - Opciones de configuración
 * @returns {Promise<Array>} Array de métricas combinadas
 */
export const getCombinedMetricsBatch = async (initiatives, options = {}) => {
    const results = [];
    
    for (const initiative of initiatives) {
        try {
            const metrics = await getCombinedMetrics(initiative, options);
            results.push({
                ...initiative,
                ...metrics
            });
        } catch (error) {
            console.error(`[METRICS] Error getting metrics for ${initiative.initiative}:`, error);
            results.push({
                ...initiative,
                realisticCompletion: null,
                mightBeMisleading: false,
                source: 'sheets'
            });
        }
    }
    
    return results;
};

export default {
    getCombinedMetrics,
    getCombinedMetricsBatch
};

