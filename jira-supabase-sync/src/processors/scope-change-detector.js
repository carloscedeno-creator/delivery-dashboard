/**
 * Detector de Cambios de Scope en Sprints
 * Tarea 4: Tracking Básico de Scope Changes
 * 
 * Detecta y registra cambios de scope durante sprints:
 * - Issues agregados al sprint
 * - Issues removidos del sprint
 * - Cambios en Story Points durante el sprint
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';

/**
 * Detecta si un issue fue agregado al sprint después de su inicio
 * @param {Object} changelog - Changelog del issue desde Jira
 * @param {string} sprintName - Nombre del sprint
 * @param {string} sprintStartDate - Fecha de inicio del sprint (ISO string)
 * @returns {Object|null} { date: Date, storyPoints: number } o null si no fue agregado después del inicio
 */
export function detectIssueAddedToSprint(changelog, sprintName, sprintStartDate) {
  if (!changelog || !changelog.histories || !sprintStartDate) {
    return null;
  }

  const sprintFieldNames = ['Sprint', 'customfield_10020'];
  const sprintStartTime = new Date(sprintStartDate).getTime();
  
  if (isNaN(sprintStartTime)) {
    return null;
  }

  // Buscar cambios del campo Sprint después del inicio del sprint
  const sprintChanges = changelog.histories
    .flatMap(history => (history.items || []).map(item => ({
      ...item,
      created: new Date(history.created).getTime(),
      historyCreated: history.created,
    })))
    .filter(item => {
      const fieldLower = (item.field || '').toLowerCase();
      return sprintFieldNames.some(fn => fieldLower === fn.toLowerCase());
    })
    .filter(item => item.created > sprintStartTime) // Solo cambios después del inicio
    .sort((a, b) => a.created - b.created);

  // Buscar el primer cambio donde el sprint fue agregado
  for (const change of sprintChanges) {
    const toString = change.toString || '';
    const fromString = change.fromString || '';
    
    // Si el toString contiene el nombre del sprint y el fromString no, fue agregado
    if (toString.includes(sprintName) && !fromString.includes(sprintName)) {
      return {
        date: new Date(change.historyCreated),
        storyPoints: null, // Se obtendrá del issue en ese momento
      };
    }
  }

  return null;
}

/**
 * Detecta si un issue fue removido del sprint antes de su cierre
 * @param {Object} changelog - Changelog del issue desde Jira
 * @param {string} sprintName - Nombre del sprint
 * @param {string} sprintStartDate - Fecha de inicio del sprint (ISO string)
 * @param {string} sprintEndDate - Fecha de fin del sprint (ISO string)
 * @returns {Object|null} { date: Date, storyPoints: number } o null si no fue removido
 */
export function detectIssueRemovedFromSprint(changelog, sprintName, sprintStartDate, sprintEndDate) {
  if (!changelog || !changelog.histories || !sprintEndDate) {
    return null;
  }

  const sprintFieldNames = ['Sprint', 'customfield_10020'];
  const sprintStartTime = sprintStartDate ? new Date(sprintStartDate).getTime() : 0;
  const sprintEndTime = new Date(sprintEndDate).getTime();
  
  if (isNaN(sprintEndTime)) {
    return null;
  }

  // Buscar cambios del campo Sprint durante el sprint
  const sprintChanges = changelog.histories
    .flatMap(history => (history.items || []).map(item => ({
      ...item,
      created: new Date(history.created).getTime(),
      historyCreated: history.created,
    })))
    .filter(item => {
      const fieldLower = (item.field || '').toLowerCase();
      return sprintFieldNames.some(fn => fieldLower === fn.toLowerCase());
    })
    .filter(item => {
      // Solo cambios durante el sprint
      return item.created >= sprintStartTime && item.created <= sprintEndTime;
    })
    .sort((a, b) => a.created - b.created);

  // Buscar el último cambio donde el sprint fue removido
  for (let i = sprintChanges.length - 1; i >= 0; i--) {
    const change = sprintChanges[i];
    const toString = change.toString || '';
    const fromString = change.fromString || '';
    
    // Si el fromString contenía el sprint pero el toString no, fue removido
    if (fromString.includes(sprintName) && !toString.includes(sprintName)) {
      return {
        date: new Date(change.historyCreated),
        storyPoints: null, // Se obtendrá del issue en ese momento
      };
    }
  }

  return null;
}

/**
 * Detecta cambios en Story Points durante el sprint
 * @param {Object} changelog - Changelog del issue desde Jira
 * @param {string} sprintStartDate - Fecha de inicio del sprint (ISO string)
 * @param {string} sprintEndDate - Fecha de fin del sprint (ISO string)
 * @param {number} initialStoryPoints - Story Points al inicio del sprint
 * @returns {Array} Array de cambios { date: Date, before: number, after: number }
 */
export function detectStoryPointsChanges(changelog, sprintStartDate, sprintEndDate, initialStoryPoints) {
  if (!changelog || !changelog.histories || !sprintStartDate || !sprintEndDate) {
    return [];
  }

  const storyPointsFieldNames = ['Story Points', 'Story Point Estimate', 'customfield_10016'];
  const sprintStartTime = new Date(sprintStartDate).getTime();
  const sprintEndTime = new Date(sprintEndDate).getTime();
  
  if (isNaN(sprintStartTime) || isNaN(sprintEndTime)) {
    return [];
  }

  // Buscar cambios en Story Points durante el sprint
  const spChanges = changelog.histories
    .flatMap(history => (history.items || []).map(item => ({
      ...item,
      created: new Date(history.created).getTime(),
      historyCreated: history.created,
    })))
    .filter(item => {
      const fieldLower = (item.field || '').toLowerCase();
      return storyPointsFieldNames.some(fn => fieldLower === fn.toLowerCase());
    })
    .filter(item => {
      // Solo cambios durante el sprint
      return item.created >= sprintStartTime && item.created <= sprintEndTime;
    })
    .sort((a, b) => a.created - b.created);

  const changes = [];
  let currentSP = initialStoryPoints || 0;

  for (const change of spChanges) {
    const fromValue = parseFloat(change.fromString || '0') || 0;
    const toValue = parseFloat(change.toString || '0') || 0;
    
    // Solo registrar si hay un cambio real
    if (fromValue !== toValue) {
      changes.push({
        date: new Date(change.historyCreated),
        before: fromValue,
        after: toValue,
      });
      currentSP = toValue;
    }
  }

  return changes;
}

/**
 * Guarda un cambio de scope en la base de datos
 * @param {string} sprintId - ID del sprint
 * @param {string} issueId - ID del issue
 * @param {string} changeType - Tipo de cambio: 'added', 'removed', 'story_points_changed'
 * @param {Date} changeDate - Fecha del cambio
 * @param {number|null} storyPointsBefore - Story Points antes (opcional)
 * @param {number|null} storyPointsAfter - Story Points después (opcional)
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
export async function saveScopeChange(sprintId, issueId, changeType, changeDate, storyPointsBefore = null, storyPointsAfter = null) {
  try {
    // Verificar si ya existe un cambio del mismo tipo en el mismo día (evitar duplicados)
    const changeDateOnly = new Date(changeDate);
    changeDateOnly.setHours(0, 0, 0, 0);
    const changeDateEnd = new Date(changeDateOnly);
    changeDateEnd.setHours(23, 59, 59, 999);

    const { data: existing } = await supabaseClient.client
      .from('sprint_scope_changes')
      .select('id')
      .eq('sprint_id', sprintId)
      .eq('issue_id', issueId)
      .eq('change_type', changeType)
      .gte('change_date', changeDateOnly.toISOString())
      .lte('change_date', changeDateEnd.toISOString())
      .maybeSingle();

    if (existing) {
      logger.debug(`⏭️ Cambio de scope ya existe para sprint ${sprintId}, issue ${issueId}, tipo ${changeType}, fecha ${changeDateOnly.toISOString()}`);
      return false;
    }

    // Insertar nuevo cambio
    const { error } = await supabaseClient.client
      .from('sprint_scope_changes')
      .insert({
        sprint_id: sprintId,
        issue_id: issueId,
        change_type: changeType,
        change_date: changeDate.toISOString(),
        story_points_before: storyPointsBefore,
        story_points_after: storyPointsAfter,
      });

    if (error) {
      logger.error(`❌ Error guardando cambio de scope:`, error);
      return false;
    }

    logger.debug(`✅ Cambio de scope guardado: sprint ${sprintId}, issue ${issueId}, tipo ${changeType}`);
    return true;
  } catch (error) {
    logger.error(`❌ Error guardando cambio de scope:`, error);
    return false;
  }
}

/**
 * Detecta y guarda todos los cambios de scope para un issue en un sprint
 * @param {string} sprintId - ID del sprint
 * @param {string} issueId - ID del issue
 * @param {Object} issueData - Datos del issue (changelog, storyPoints, etc.)
 * @param {Object} sprint - Datos del sprint (name, startDate, endDate, state)
 * @param {number} initialStoryPoints - Story Points al inicio del sprint
 * @returns {Promise<Object>} Resumen de cambios detectados
 */
export async function detectAndSaveScopeChanges(sprintId, issueId, issueData, sprint, initialStoryPoints) {
  const result = {
    added: false,
    removed: false,
    spChanges: 0,
  };

  try {
    const changelog = issueData.changelog || {};
    const sprintName = sprint.name;
    const sprintStartDate = sprint.startDate;
    const sprintEndDate = sprint.endDate || sprint.completeDate;

    // Solo detectar cambios si el sprint tiene fechas válidas
    if (!sprintStartDate || !sprintEndDate) {
      return result;
    }

    // 1. Detectar si el issue fue agregado después del inicio
    if (sprint.state === 'active' || sprint.state === 'closed') {
      const addedInfo = detectIssueAddedToSprint(changelog, sprintName, sprintStartDate);
      if (addedInfo) {
        const saved = await saveScopeChange(
          sprintId,
          issueId,
          'added',
          addedInfo.date,
          null,
          issueData.storyPoints || 0
        );
        if (saved) {
          result.added = true;
          logger.debug(`📝 Issue agregado al sprint detectado: sprint ${sprintName}, issue ${issueData.key}`);
        }
      }
    }

    // 2. Detectar si el issue fue removido antes del cierre (solo para sprints cerrados)
    if (sprint.state === 'closed') {
      const removedInfo = detectIssueRemovedFromSprint(changelog, sprintName, sprintStartDate, sprintEndDate);
      if (removedInfo) {
        const saved = await saveScopeChange(
          sprintId,
          issueId,
          'removed',
          removedInfo.date,
          initialStoryPoints || issueData.storyPoints || 0,
          null
        );
        if (saved) {
          result.removed = true;
          logger.debug(`📝 Issue removido del sprint detectado: sprint ${sprintName}, issue ${issueData.key}`);
        }
      }
    }

    // 3. Detectar cambios en Story Points durante el sprint
    if (sprint.state === 'active' || sprint.state === 'closed') {
      const spChanges = detectStoryPointsChanges(changelog, sprintStartDate, sprintEndDate, initialStoryPoints);
      for (const change of spChanges) {
        const saved = await saveScopeChange(
          sprintId,
          issueId,
          'story_points_changed',
          change.date,
          change.before,
          change.after
        );
        if (saved) {
          result.spChanges++;
          logger.debug(`📝 Cambio de SP detectado: sprint ${sprintName}, issue ${issueData.key}, ${change.before} → ${change.after}`);
        }
      }
    }

    return result;
  } catch (error) {
    logger.error(`❌ Error detectando cambios de scope:`, error);
    return result;
  }
}
