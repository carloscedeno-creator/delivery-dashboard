/**
 * Utilidades para interactuar con la API de Jira
 * Todas las llamadas pasan por el proxy backend para mantener las credenciales seguras
 */

import { JIRA_CONFIG, JIRA_STATUS_MAP } from '../config/jiraConfig';

/**
 * Obtiene todas las issues de un epic o proyecto
 * @param {string} epicKey - Clave del epic (ej: 'PROJ-123') o proyecto
 * @returns {Promise<Array>} Array de issues
 */
export const getEpicIssues = async (epicKey) => {
    try {
        const proxyUrl = `${JIRA_CONFIG.proxyUrl}?action=getEpicIssues&epicKey=${epicKey}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.issues || [];
    } catch (error) {
        console.error('[JIRA] Error fetching epic issues:', error);
        throw error;
    }
};

/**
 * Obtiene todas las issues de un proyecto
 * @param {string} projectKey - Clave del proyecto (ej: 'PROJ')
 * @returns {Promise<Array>} Array de issues
 */
export const getProjectIssues = async (projectKey) => {
    try {
        const proxyUrl = `${JIRA_CONFIG.proxyUrl}?action=getProjectIssues&projectKey=${projectKey}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.issues || [];
    } catch (error) {
        console.error('[JIRA] Error fetching project issues:', error);
        throw error;
    }
};

/**
 * Busca issues por JQL (Jira Query Language)
 * @param {string} jql - Query JQL
 * @returns {Promise<Array>} Array de issues
 */
export const searchIssues = async (jql) => {
    try {
        const proxyUrl = `${JIRA_CONFIG.proxyUrl}?action=search&jql=${encodeURIComponent(jql)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.issues || [];
    } catch (error) {
        console.error('[JIRA] Error searching issues:', error);
        throw error;
    }
};

/**
 * Calcula métricas de completación basadas en issues de Jira
 * @param {Array} issues - Array de issues de Jira
 * @returns {Object} Métricas calculadas
 */
export const calculateJiraMetrics = (issues) => {
    if (!issues || issues.length === 0) {
        return {
            total: 0,
            completed: 0,
            inProgress: 0,
            blocked: 0,
            completion: 0,
            storyPointsTotal: 0,
            storyPointsCompleted: 0,
            storyPointsCompletion: 0
        };
    }

    let total = issues.length;
    let completed = 0;
    let inProgress = 0;
    let blocked = 0;
    let storyPointsTotal = 0;
    let storyPointsCompleted = 0;

    issues.forEach(issue => {
        const status = issue.fields?.status?.name || 'Unknown';
        const statusKey = JIRA_STATUS_MAP[status] || 'planned';
        const storyPoints = issue.fields?.customfield_10016 || 0; // Ajustar según tu campo

        storyPointsTotal += storyPoints;

        if (statusKey === 'done') {
            completed++;
            storyPointsCompleted += storyPoints;
        } else if (statusKey === 'in_progress') {
            inProgress++;
        } else if (statusKey === 'blocked') {
            blocked++;
        }
    });

    const completion = total > 0 ? Math.round((completed / total) * 100) : 0;
    const storyPointsCompletion = storyPointsTotal > 0 
        ? Math.round((storyPointsCompleted / storyPointsTotal) * 100) 
        : 0;

    return {
        total,
        completed,
        inProgress,
        blocked,
        completion,
        storyPointsTotal,
        storyPointsCompleted,
        storyPointsCompletion
    };
};

/**
 * Obtiene métricas de completación para una iniciativa específica
 * Busca issues que contengan el nombre de la iniciativa en el summary o en un campo personalizado
 * @param {string} initiativeName - Nombre de la iniciativa
 * @param {string} projectKey - Clave del proyecto (opcional)
 * @returns {Promise<Object>} Métricas de la iniciativa
 */
export const getInitiativeMetrics = async (initiativeName, projectKey = null) => {
    try {
        // Construir JQL query para buscar issues relacionadas con la iniciativa
        let jql = `summary ~ "${initiativeName}" OR description ~ "${initiativeName}"`;
        
        if (projectKey) {
            jql = `project = ${projectKey} AND (${jql})`;
        }

        const issues = await searchIssues(jql);
        const metrics = calculateJiraMetrics(issues);

        return {
            initiative: initiativeName,
            metrics,
            issues: issues.map(issue => ({
                key: issue.key,
                summary: issue.fields?.summary || '',
                status: issue.fields?.status?.name || '',
                assignee: issue.fields?.assignee?.displayName || 'Unassigned',
                storyPoints: issue.fields?.customfield_10016 || 0,
                url: `${JIRA_CONFIG.baseUrl}/browse/${issue.key}`
            }))
        };
    } catch (error) {
        console.error('[JIRA] Error getting initiative metrics:', error);
        throw error;
    }
};

export default {
    getEpicIssues,
    getProjectIssues,
    searchIssues,
    calculateJiraMetrics,
    getInitiativeMetrics
};

