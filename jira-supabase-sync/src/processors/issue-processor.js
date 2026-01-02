/**
 * Procesador de issues de Jira
 * Convierte datos de Jira API a formato para Supabase
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';
import jiraClientDefault from '../clients/jira-client.js';
import { config } from '../config.js';

// Cache para detalles de épicas para evitar llamadas redundantes a la API de Jira
const epicDetailsCache = new Map();

/**
 * Encuentra el valor de un campo en el changelog en una fecha específica
 * @param {Object} changelog - Changelog del issue de Jira
 * @param {Array<string>} fieldNames - Nombres de campos a buscar
 * @param {Date|string} targetDate - Fecha objetivo
 * @param {any} fallbackValue - Valor por defecto si no se encuentra
 * @returns {any} Valor encontrado o fallbackValue
 */
function findHistoryValueAtDate(changelog, fieldNames, targetDate, fallbackValue) {
  if (!changelog || !changelog.histories || !targetDate) return fallbackValue;
  
  const normalizedFields = fieldNames.map(n => n.toLowerCase());
  const targetTime = new Date(targetDate).getTime();
  
  if (isNaN(targetTime)) return fallbackValue;
  
  const changes = changelog.histories
    .flatMap(history => (history.items || []).map(item => ({ 
      ...item, 
      created: new Date(history.created).getTime() 
    })))
    .filter(item => item.field && normalizedFields.includes(item.field.toLowerCase()))
    .sort((a, b) => a.created - b.created);

  if (changes.length === 0) return fallbackValue;

  let lastChangeBefore = null;
  for (const change of changes) {
    if (change.created <= targetTime) {
      lastChangeBefore = change;
    } else {
      break;
    }
  }

  if (lastChangeBefore) return lastChangeBefore.toString || fallbackValue;

  const firstChange = changes[0];
  if (firstChange && firstChange.created > targetTime) {
    return firstChange.fromString || fallbackValue;
  }

  return fallbackValue;
}

/**
 * Calcula el tiempo en cada estado basado en el changelog
 * @param {Object} changelog - Changelog del issue
 * @param {string} createdDateISO - Fecha de creación en ISO
 * @param {string} resolvedDateISO - Fecha de resolución en ISO (opcional)
 * @param {string} currentStatus - Estado actual
 * @returns {string} String con tiempo en cada estado (ej: "To Do: 2.5d; In Progress: 5.0d")
 */
function calculateTimeInStatus(changelog, createdDateISO, resolvedDateISO, currentStatus) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const now = new Date();
  const createdDate = new Date(createdDateISO);
  if (isNaN(createdDate.getTime())) return 'N/A';

  const statusTimes = {};
  
  function addStatusTime(statusName, days) {
    if (!statusName || days <= 0) return;
    const normalizedStatus = statusName.trim().toLowerCase();
    if (!statusTimes[normalizedStatus]) {
      statusTimes[normalizedStatus] = { totalDays: 0, displayName: statusName.trim() };
    }
    statusTimes[normalizedStatus].totalDays += days;
  }

  let statusChanges = [];
  if (changelog && changelog.histories && changelog.histories.length > 0) {
    statusChanges = changelog.histories
      .flatMap(history => (history.items || []).map(item => ({ ...item, created: new Date(history.created) })))
      .filter(item => (item.field || '').trim().toLowerCase() === 'status' && item.fromString)
      .sort((a, b) => a.created - b.created);
  }

  let lastStatusDate = createdDate;
  const endDate = resolvedDateISO ? new Date(resolvedDateISO) : now;
  
  if (statusChanges.length > 0) {
    for (const change of statusChanges) {
      const statusName = change.fromString;
      const changeDate = change.created;
      if (isNaN(changeDate.getTime())) continue;
      
      const daysInStatus = (changeDate - lastStatusDate) / MS_PER_DAY;
      addStatusTime(statusName, daysInStatus);
      lastStatusDate = changeDate;
    }
  }

  // Agregar tiempo en el estado actual
  if (currentStatus && lastStatusDate) {
    const daysInCurrentStatus = (endDate - lastStatusDate) / MS_PER_DAY;
    addStatusTime(currentStatus, daysInCurrentStatus);
  }

  // Formatear resultado
  const result = Object.values(statusTimes)
    .map(st => `${st.displayName}: ${st.totalDays.toFixed(1)}d`)
    .join('; ');

  return result || 'N/A';
}

/**
 * Normaliza el nombre del estado para que coincida con el formato de Jira
 * Convierte a mayúsculas y maneja variaciones comunes
 */
function normalizeStatus(status) {
  if (!status || status === 'Unknown') return 'Unknown';
  
  // Mapeo de estados comunes a su formato estándar en Jira
  const statusMap = {
    'to do': 'TO DO',
    'todo': 'TO DO',
    'to-do': 'TO DO',
    'in progress': 'IN PROGRESS',
    'in-progress': 'IN PROGRESS',
    'en progreso': 'IN PROGRESS',
    'done': 'DONE',
    'testing': 'TESTING',
    'test': 'TESTING',
    'blocked': 'BLOCKED',
    'security review': 'SECURITY REVIEW',
    'security-review': 'SECURITY REVIEW',
    'reopen': 'REOPEN',
    're-opened': 'REOPEN',
    'reopen': 'REOPEN',
    'compliance check': 'COMPLIANCE CHECK',
    'compliance-check': 'COMPLIANCE CHECK',
    'development done': 'DEVELOPMENT DONE',
    'development-done': 'DEVELOPMENT DONE',
    'qa': 'QA',
    'qa external': 'QA EXTERNAL',
    'qa-external': 'QA EXTERNAL',
    'staging': 'STAGING',
    'ready to release': 'READY TO RELEASE',
    'ready-to-release': 'READY TO RELEASE',
    'in review': 'IN REVIEW',
    'in-review': 'IN REVIEW',
    'open': 'OPEN',
    'hold': 'HOLD',
    'requisitions': 'REQUISITIONS',
  };

  const normalized = status.trim();
  const lowerStatus = normalized.toLowerCase();
  
  // Si está en el mapa, usar el valor mapeado
  if (statusMap[lowerStatus]) {
    return statusMap[lowerStatus];
  }
  
  // Si ya está completamente en mayúsculas, verificar si es un estado válido
  if (normalized === normalized.toUpperCase()) {
    // Estados válidos que ya están en mayúsculas
    const validUpperStates = ['QA', 'BLOCKED', 'DONE', 'TO DO', 'IN PROGRESS', 'TESTING', 
                              'SECURITY REVIEW', 'REOPEN', 'STAGING', 'OPEN', 'HOLD', 
                              'IN REVIEW', 'REQUISITIONS', 'DEVELOPMENT DONE', 'QA EXTERNAL', 
                              'READY TO RELEASE', 'COMPLIANCE CHECK'];
    
    if (validUpperStates.includes(normalized)) {
      return normalized;
    }
  }
  
  // Convertir a mayúsculas por defecto
  return normalized.toUpperCase();
}

/**
 * Procesa un issue de Jira y lo guarda en Supabase
 */
export async function processIssue(squadId, jiraIssue, jiraClient = null) {
  // Usar el cliente pasado o el por defecto
  const client = jiraClient || jiraClientDefault;
  try {
    const fields = jiraIssue.fields;
    
    // Obtener o crear desarrollador
    let assigneeId = null;
    if (fields.assignee) {
      assigneeId = await supabaseClient.getOrCreateDeveloper(
        fields.assignee.displayName || 'Unassigned',
        fields.assignee.emailAddress || null,
        fields.assignee.accountId || null
      );
    }

    // Obtener o crear epic con fechas del timeline
    let epicId = null;
    if (fields.parent && fields.parent.fields?.issuetype?.name === 'Epic') {
      // Obtener detalles completos de la épica para extraer fechas del timeline
      let epicStartDate = null;
      let epicEndDate = null;
      
      const epicKey = fields.parent.key;
      
      // Usar cache para evitar llamadas redundantes a la API de Jira
      let epicDetails = epicDetailsCache.get(epicKey);
      
      if (!epicDetails) {
        try {
          epicDetails = await client.fetchIssueDetails(epicKey);
          if (epicDetails) {
            // Guardar en cache
            epicDetailsCache.set(epicKey, epicDetails);
          }
        } catch (error) {
          logger.warn(`⚠️ Error obteniendo fechas de timeline para épica ${epicKey}:`, error.message);
        }
      }
      
      if (epicDetails && epicDetails.fields) {
        // Intentar extraer fechas del timeline
        const timelineDates = client.extractTimelineDates(epicDetails.fields);
        epicStartDate = timelineDates.startDate;
        epicEndDate = timelineDates.endDate;
        
        logger.debug(`📅 Épica ${epicKey}: start=${epicStartDate || 'null'}, end=${epicEndDate || 'null'}`);
      }
      
      epicId = await supabaseClient.getOrCreateEpic(
        squadId,
        epicKey,
        fields.parent.fields.summary || 'N/A',
        epicStartDate,
        epicEndDate
      );
    }

    // Procesar sprints
    const sprintData = fields[config.jira.sprintFieldId] || [];
    const sprintIds = [];
    
    // --- CÁLCULO DE SPRINT ACTUAL/ÚLTIMO (current_sprint) ---
    // Lógica: Si hay sprint "active", ese es el current_sprint
    // Si no hay activo, se toma el último sprint de la lista
    // Si no hay sprints, el valor por defecto es "Backlog"
    let currentSprint = 'Backlog'; // Por defecto si no hay sprint
    
    if (Array.isArray(sprintData) && sprintData.length > 0) {
      // Buscar primero el sprint que esté "active" (en curso)
      const activeSprint = sprintData.find(sprint => sprint.state === 'active');
      
      if (activeSprint) {
        currentSprint = activeSprint.name;
      } else {
        // Si no hay activo, tomamos el último de la lista (el más reciente)
        const lastSprint = sprintData[sprintData.length - 1];
        if (lastSprint) currentSprint = lastSprint.name;
      }
      
      for (const sprint of sprintData) {
        const sprintId = await supabaseClient.getOrCreateSprint(squadId, {
          name: sprint.name,
          id: sprint.id,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          completeDate: sprint.completeDate,
          state: sprint.state,
        });
        if (sprintId) sprintIds.push({ sprintId, sprint });
      }
    }

    // Procesar changelog para obtener fechas de desarrollo
    let devStartDate = null;
    let devCloseDate = null;
    const statusHistory = [];

    if (jiraIssue.changelog && jiraIssue.changelog.histories) {
      for (const history of jiraIssue.changelog.histories) {
        for (const item of history.items || []) {
          if (item.field === 'status') {
            statusHistory.push({
              from: item.fromString,
              to: item.toString,
              date: new Date(history.created),
            });

            // Primera transición a "In Progress"
            if (!devStartDate && 
                (item.toString?.toLowerCase().includes('in progress') ||
                 item.toString?.toLowerCase().includes('en progreso'))) {
              devStartDate = new Date(history.created);
            }

            // Primera transición a "Done"
            if (!devCloseDate && 
                (item.toString?.toLowerCase() === 'done' ||
                 item.toString?.toLowerCase() === 'development done')) {
              devCloseDate = new Date(history.created);
            }
          }
        }
      }
    }

    // Preparar datos del issue - normalizar estado primero
    const jiraStatus = fields.status?.name || 'Unknown';
    const normalizedStatus = normalizeStatus(jiraStatus);

    // Calcular campos históricos adicionales
    let sprintHistory = 'N/A';
    const statusBySprint = {};
    const storyPointsBySprint = {};
    let statusHistoryDays = 'N/A';
    let epicName = null;

    // 1. Sprint History (todos los sprints separados por "; ")
    if (Array.isArray(sprintData) && sprintData.length > 0) {
      sprintHistory = sprintData.map(sprint => sprint.name).join('; ');
    }

    // 2. Epic Name
    if (fields.parent && fields.parent.fields?.issuetype?.name === 'Epic') {
      epicName = fields.parent.fields.summary || null;
    }

    // 3. Status by Sprint y Story Points by Sprint
    if (jiraIssue.changelog && sprintData && Array.isArray(sprintData) && sprintData.length > 0) {
      const currentSP = fields[config.jira.storyPointsFieldId] || 0;
      const issueCreated = fields.created ? new Date(fields.created) : null;

      for (const sprint of sprintData) {
        const sprintName = sprint.name;
        let fotoDate = null;

        // Determinar fecha de "foto" del sprint
        if (sprint.completeDate) {
          fotoDate = sprint.completeDate;
        } else if (sprint.state === 'closed' && sprint.endDate) {
          fotoDate = sprint.endDate;
        } else if (sprint.endDate && new Date(sprint.endDate) < new Date()) {
          fotoDate = sprint.endDate;
        }

        // Status by Sprint: estado al momento del cierre o estado actual si está activo
        if (fotoDate) {
          const statusAtClose = findHistoryValueAtDate(
            jiraIssue.changelog,
            ['status'],
            fotoDate,
            null
          );
          if (statusAtClose) {
            statusBySprint[sprintName] = normalizeStatus(statusAtClose);
          } else {
            statusBySprint[sprintName] = 'N/A (Sin Historial)';
          }
        } else if (sprint.state === 'active') {
          // Sprint activo: usar estado actual normalizado
          statusBySprint[sprintName] = normalizedStatus;
        }

        // Story Points by Sprint: SP al inicio del sprint
        if (sprint.startDate) {
          const sprintStart = new Date(sprint.startDate);
          let spAtStart = 0;

          if (issueCreated && issueCreated.getTime() > sprintStart.getTime()) {
            // Ticket creado después del inicio del sprint = 0 SP iniciales
            spAtStart = 0;
          } else {
            // Buscar SP al inicio del sprint en el changelog
            const spFieldNames = ['Story Points', 'Story point estimate', 'Puntos de historia', 'customfield_10016'];
            const foundSP = findHistoryValueAtDate(
              jiraIssue.changelog,
              spFieldNames,
              sprint.startDate,
              currentSP
            );
            spAtStart = foundSP ? Number(foundSP) : (issueCreated && issueCreated.getTime() <= sprintStart.getTime() ? currentSP : 0);
          }
          storyPointsBySprint[sprintName] = spAtStart;
        }
      }
    }

    // 4. Status History Days (tiempo en cada estado)
    if (jiraIssue.changelog && fields.created) {
      statusHistoryDays = calculateTimeInStatus(
        jiraIssue.changelog,
        fields.created,
        fields.resolutiondate || null,
        normalizedStatus
      );
    }
    
    // Log si hay diferencia entre el estado original y el normalizado
    if (jiraStatus !== normalizedStatus) {
      logger.debug(`🔄 [${jiraIssue.key}] Normalizando estado: "${jiraStatus}" -> "${normalizedStatus}"`);
    }
    
    const issueData = {
      key: jiraIssue.key,
      issueType: fields.issuetype?.name || 'Unknown',
      summary: fields.summary || '',
      assigneeId,
      priority: fields.priority?.name || null,
      status: normalizedStatus,
      storyPoints: fields[config.jira.storyPointsFieldId] || 0,
      resolution: fields.resolution?.name || null,
      createdDate: fields.created ? new Date(fields.created) : null,
      resolvedDate: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
      updatedDate: fields.updated ? new Date(fields.updated) : null,
      devStartDate,
      devCloseDate,
      epicId,
      epicName,
      sprintHistory,
      currentSprint, // Sprint actual/último calculado arriba
      statusBySprint: Object.keys(statusBySprint).length > 0 ? statusBySprint : null,
      storyPointsBySprint: Object.keys(storyPointsBySprint).length > 0 ? storyPointsBySprint : null,
      statusHistoryDays,
      rawData: jiraIssue,
    };

    // Log del estatus para debugging
    if (jiraIssue.key === 'ODSO-297' || jiraIssue.key === 'ODSO-313') {
      logger.info(`🔍 [${jiraIssue.key}] Estatus en Jira: "${jiraStatus}"`);
      logger.info(`🔍 [${jiraIssue.key}] Estatus normalizado: "${normalizedStatus}"`);
      logger.info(`🔍 [${jiraIssue.key}] Status object completo:`, JSON.stringify(fields.status, null, 2));
    }

    // Upsert issue (retorna null si no hay cambios)
    const issueId = await supabaseClient.upsertIssue(squadId, issueData);
    
    // Si no hay cambios, retornar null para indicar que se omitió
    if (issueId === null) {
      return null;
    }
    
    // Verificar que se actualizó correctamente
    if (jiraIssue.key === 'ODSO-297' || jiraIssue.key === 'ODSO-313') {
      const { data: updatedIssue } = await supabaseClient.client
        .from('issues')
        .select('current_status, updated_date')
        .eq('issue_key', jiraIssue.key)
        .single();
      
      if (updatedIssue) {
        logger.info(`✅ [${jiraIssue.key}] Estatus guardado en Supabase: "${updatedIssue.current_status}"`);
        if (normalizedStatus !== updatedIssue.current_status) {
          logger.warn(`⚠️ [${jiraIssue.key}] DISCREPANCIA: Normalizado="${normalizedStatus}" vs Supabase="${updatedIssue.current_status}"`);
        }
      }
    }

    // Guardar relación issue-sprints
    if (sprintIds.length > 0) {
      for (const { sprintId, sprint } of sprintIds) {
        // Determinar estado al cierre del sprint
        let statusAtSprintClose = null;
        const sprintCloseDate = sprint.completeDate || sprint.endDate;
        
        if (sprintCloseDate && statusHistory.length > 0) {
          const closeDate = new Date(sprintCloseDate);
          // Buscar el estado más cercano antes del cierre
          for (const status of statusHistory.reverse()) {
            if (status.date <= closeDate) {
              statusAtSprintClose = status.to;
              break;
            }
          }
        }

        // Upsert issue_sprints
        await supabaseClient.client
          .from('issue_sprints')
          .upsert({
            issue_id: issueId,
            sprint_id: sprintId,
            status_at_sprint_close: statusAtSprintClose ? normalizeStatus(statusAtSprintClose) : normalizedStatus,
            story_points_at_start: issueData.storyPoints, // TODO: calcular SP inicial del sprint
            story_points_at_close: issueData.storyPoints,
          }, {
            onConflict: 'issue_id,sprint_id',
          });
      }
    }

    // Guardar historial de cambios
    if (statusHistory.length > 0) {
      const historyRecords = statusHistory.map(status => ({
        issue_id: issueId,
        field_name: 'status',
        field_type: 'status',
        from_value: status.from,
        to_value: status.to,
        changed_at: status.date.toISOString(),
      }));

      if (historyRecords.length > 0) {
        await supabaseClient.client
          .from('issue_history')
          .upsert(historyRecords, {
            onConflict: 'issue_id,field_name,changed_at',
          });
      }
    }

    return issueId;
  } catch (error) {
    logger.error(`❌ Error procesando issue ${jiraIssue.key}:`, error);
    throw error;
  }
}

/**
 * Procesa múltiples issues en batch
 */
export async function processIssues(squadId, jiraIssues) {
  // Usar el cliente por defecto (backward compatibility)
  const jiraClient = (await import('../clients/jira-client.js')).default;
  return processIssuesWithClient(squadId, jiraIssues, jiraClient);
}

/**
 * Procesa issues en modo batch optimizado (más rápido)
 * Compara todos los issues de una vez y hace batch upsert
 */
export async function processIssuesWithClientBatch(squadId, jiraIssues, jiraClient) {
  logger.info(`🔄 Procesando ${jiraIssues.length} issues en modo BATCH optimizado...`);
  logger.info(`   📋 Comparando cambios antes de actualizar (solo se actualizarán issues con cambios reales)`);
  
  // Limpiar cache de épicas al inicio de cada sincronización para evitar datos obsoletos
  epicDetailsCache.clear();
  
  // 1. Procesar todos los issues primero (transformar datos de Jira a formato Supabase)
  const issuesData = [];
  const processingErrors = [];
  
  logger.info(`   🔄 Transformando ${jiraIssues.length} issues de Jira a formato Supabase...`);
  
  for (let i = 0; i < jiraIssues.length; i++) {
    const issue = jiraIssues[i];
    try {
      const issueData = await transformIssueToSupabaseFormat(squadId, issue, jiraClient);
      if (issueData) {
        issuesData.push(issueData);
      }
      
      if ((i + 1) % 50 === 0) {
        logger.info(`   📊 Progreso transformación: ${i + 1}/${jiraIssues.length}`);
      }
    } catch (error) {
      processingErrors.push({ key: issue.key, error: error.message });
      logger.error(`   ❌ Error transformando issue ${issue.key}:`, error.message);
    }
  }
  
  if (issuesData.length === 0) {
    logger.warn(`⚠️ No se pudo transformar ningún issue`);
    return { successCount: 0, errorCount: processingErrors.length, skippedCount: 0 };
  }
  
  logger.info(`   ✅ Transformación completa: ${issuesData.length} issues listos para batch upsert`);
  
  // 2. Batch upsert: comparar y actualizar todos de una vez
  logger.info(`   🚀 Ejecutando batch upsert optimizado...`);
  const batchResult = await supabaseClient.upsertIssuesBatch(squadId, issuesData);
  
  // 3. Crear mapa de issue_key -> issue_id para los actualizados
  // El batch upsert ya retorna los IDs con sus keys, así que los mapeamos directamente
  const issueKeyToIdMap = new Map();
  if (batchResult.updated && batchResult.updated.length > 0) {
    batchResult.updated.forEach(({ id, key }) => {
      if (id && key) {
        issueKeyToIdMap.set(key, id);
      }
    });
  }
  
  // 4. Guardar relaciones de sprints e historial para los issues actualizados
  logger.info(`   🔗 Guardando relaciones de sprints e historial...`);
  let relationsSaved = 0;
  
  for (const issueData of issuesData) {
    // Solo guardar relaciones para issues que fueron actualizados (no skipped)
    if (batchResult.skipped.includes(issueData.key)) {
      continue;
    }
    
    const issueId = issueKeyToIdMap.get(issueData.key);
    if (!issueId) {
      continue;
    }
    
    try {
      // Guardar relaciones issue-sprints
      if (issueData.sprintIds && issueData.sprintIds.length > 0) {
        const normalizedStatus = issueData.status;
        
        for (const { sprintId, sprint } of issueData.sprintIds) {
          let statusAtSprintClose = null;
          const sprintCloseDate = sprint.completeDate || sprint.endDate;
          
          if (sprintCloseDate && issueData.statusHistory && issueData.statusHistory.length > 0) {
            const closeDate = new Date(sprintCloseDate);
            for (const status of [...issueData.statusHistory].reverse()) {
              if (status.date <= closeDate) {
                statusAtSprintClose = normalizeStatus(status.to);
                break;
              }
            }
          }
          
          await supabaseClient.client
            .from('issue_sprints')
            .upsert({
              issue_id: issueId,
              sprint_id: sprintId,
              status_at_sprint_close: statusAtSprintClose || normalizedStatus,
              story_points_at_start: issueData.storyPoints,
              story_points_at_close: issueData.storyPoints,
            }, {
              onConflict: 'issue_id,sprint_id',
            });
        }
      }
      
      // Guardar historial de cambios
      if (issueData.statusHistory && issueData.statusHistory.length > 0) {
        const historyRecords = issueData.statusHistory.map(status => ({
          issue_id: issueId,
          field_name: 'status',
          field_type: 'status',
          from_value: status.from,
          to_value: status.to,
          changed_at: status.date.toISOString(),
        }));
        
        if (historyRecords.length > 0) {
          await supabaseClient.client
            .from('issue_history')
            .upsert(historyRecords, {
              onConflict: 'issue_id,field_name,changed_at',
            });
        }
      }
      
      relationsSaved++;
    } catch (error) {
      logger.warn(`⚠️ Error guardando relaciones para ${issueData.key}:`, error.message);
    }
  }
  
  const successCount = batchResult.updated?.length || 0;
  const skippedCount = batchResult.skipped?.length || 0;
  const errorCount = processingErrors.length + (batchResult.errors?.length || 0);
  
  logger.success(`✅ Procesamiento batch completo:`);
  logger.success(`   📊 Issues actualizados: ${successCount}`);
  logger.success(`   ⏭️  Issues sin cambios (omitidos): ${skippedCount}`);
  logger.success(`   🔗 Relaciones guardadas: ${relationsSaved}`);
  logger.success(`   ❌ Errores: ${errorCount}`);
  logger.info(`   💡 Total procesados: ${successCount + skippedCount + errorCount}/${jiraIssues.length}`);
  logger.info(`   ⚡ Optimización: Reducción de ~${jiraIssues.length * 2} queries individuales a ~${Math.ceil(issuesData.length / 1000) + 2} queries batch`);
  
  return { successCount, errorCount, skippedCount };
}

/**
 * Transforma un issue de Jira al formato de Supabase (sin hacer upsert)
 * Retorna null si hay error
 */
async function transformIssueToSupabaseFormat(squadId, jiraIssue, jiraClient) {
  try {
    const fields = jiraIssue.fields;
    
    // Obtener o crear desarrollador
    let assigneeId = null;
    if (fields.assignee) {
      assigneeId = await supabaseClient.getOrCreateDeveloper(
        fields.assignee.displayName || 'Unassigned',
        fields.assignee.emailAddress || null,
        fields.assignee.accountId || null
      );
    }

    // Obtener o crear epic con fechas del timeline
    let epicId = null;
    if (fields.parent && fields.parent.fields?.issuetype?.name === 'Epic') {
      const epicKey = fields.parent.key;
      
      let epicDetails = epicDetailsCache.get(epicKey);
      
      if (!epicDetails) {
        try {
          epicDetails = await jiraClient.fetchIssueDetails(epicKey);
          if (epicDetails) {
            epicDetailsCache.set(epicKey, epicDetails);
          }
        } catch (error) {
          logger.warn(`⚠️ Error obteniendo fechas de timeline para épica ${epicKey}:`, error.message);
        }
      }
      
      let epicStartDate = null;
      let epicEndDate = null;
      
      if (epicDetails && epicDetails.fields) {
        const timelineDates = jiraClient.extractTimelineDates(epicDetails.fields);
        epicStartDate = timelineDates.startDate;
        epicEndDate = timelineDates.endDate;
      }
      
      epicId = await supabaseClient.getOrCreateEpic(
        squadId,
        epicKey,
        fields.parent.fields.summary || 'N/A',
        epicStartDate,
        epicEndDate
      );
    }

    // Procesar sprints
    const sprintData = fields[config.jira.sprintFieldId] || [];
    const sprintIds = [];
    let currentSprint = 'Backlog';
    
    if (Array.isArray(sprintData) && sprintData.length > 0) {
      const activeSprint = sprintData.find(sprint => sprint.state === 'active');
      
      if (activeSprint) {
        currentSprint = activeSprint.name;
      } else {
        const lastSprint = sprintData[sprintData.length - 1];
        if (lastSprint) currentSprint = lastSprint.name;
      }
      
      for (const sprint of sprintData) {
        const sprintId = await supabaseClient.getOrCreateSprint(squadId, {
          name: sprint.name,
          id: sprint.id,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          completeDate: sprint.completeDate,
          state: sprint.state,
        });
        if (sprintId) sprintIds.push({ sprintId, sprint });
      }
    }

    // Procesar changelog
    let devStartDate = null;
    let devCloseDate = null;
    const statusHistory = [];

    if (jiraIssue.changelog && jiraIssue.changelog.histories) {
      for (const history of jiraIssue.changelog.histories) {
        for (const item of history.items || []) {
          if (item.field === 'status') {
            statusHistory.push({
              from: item.fromString,
              to: item.toString,
              date: new Date(history.created),
            });

            if (!devStartDate && 
                (item.toString?.toLowerCase().includes('in progress') ||
                 item.toString?.toLowerCase().includes('en progreso'))) {
              devStartDate = new Date(history.created);
            }

            if (!devCloseDate && 
                (item.toString?.toLowerCase() === 'done' ||
                 item.toString?.toLowerCase() === 'development done')) {
              devCloseDate = new Date(history.created);
            }
          }
        }
      }
    }

    // Normalizar estado
    const jiraStatus = fields.status?.name || 'Unknown';
    const normalizedStatus = normalizeStatus(jiraStatus);

    // Calcular campos históricos
    let sprintHistory = 'N/A';
    const statusBySprint = {};
    const storyPointsBySprint = {};
    let statusHistoryDays = 'N/A';
    let epicName = null;

    if (Array.isArray(sprintData) && sprintData.length > 0) {
      sprintHistory = sprintData.map(sprint => sprint.name).join('; ');
    }

    if (fields.parent && fields.parent.fields?.issuetype?.name === 'Epic') {
      epicName = fields.parent.fields.summary || null;
    }

    if (jiraIssue.changelog && sprintData && Array.isArray(sprintData) && sprintData.length > 0) {
      const currentSP = fields[config.jira.storyPointsFieldId] || 0;
      const issueCreated = fields.created ? new Date(fields.created) : null;

      for (const sprint of sprintData) {
        const sprintName = sprint.name;
        let fotoDate = null;

        if (sprint.completeDate) {
          fotoDate = sprint.completeDate;
        } else if (sprint.state === 'closed' && sprint.endDate) {
          fotoDate = sprint.endDate;
        } else if (sprint.endDate && new Date(sprint.endDate) < new Date()) {
          fotoDate = sprint.endDate;
        }

        if (fotoDate) {
          const statusAtClose = findHistoryValueAtDate(
            jiraIssue.changelog,
            ['status'],
            fotoDate,
            null
          );
          if (statusAtClose) {
            statusBySprint[sprintName] = normalizeStatus(statusAtClose);
          } else {
            statusBySprint[sprintName] = 'N/A (Sin Historial)';
          }
        } else if (sprint.state === 'active') {
          statusBySprint[sprintName] = normalizedStatus;
        }

        if (sprint.startDate) {
          const sprintStart = new Date(sprint.startDate);
          let spAtStart = 0;

          if (issueCreated && issueCreated.getTime() > sprintStart.getTime()) {
            spAtStart = 0;
          } else {
            const spFieldNames = ['Story Points', 'Story point estimate', 'Puntos de historia', 'customfield_10016'];
            const foundSP = findHistoryValueAtDate(
              jiraIssue.changelog,
              spFieldNames,
              sprint.startDate,
              currentSP
            );
            spAtStart = foundSP ? Number(foundSP) : (issueCreated && issueCreated.getTime() <= sprintStart.getTime() ? currentSP : 0);
          }
          storyPointsBySprint[sprintName] = spAtStart;
        }
      }
    }

    if (jiraIssue.changelog && fields.created) {
      statusHistoryDays = calculateTimeInStatus(
        jiraIssue.changelog,
        fields.created,
        fields.resolutiondate || null,
        normalizedStatus
      );
    }
    
    return {
      key: jiraIssue.key,
      issueType: fields.issuetype?.name || 'Unknown',
      summary: fields.summary || '',
      assigneeId,
      priority: fields.priority?.name || null,
      status: normalizedStatus,
      storyPoints: fields[config.jira.storyPointsFieldId] || 0,
      resolution: fields.resolution?.name || null,
      createdDate: fields.created ? new Date(fields.created) : null,
      resolvedDate: fields.resolutiondate ? new Date(fields.resolutiondate) : null,
      updatedDate: fields.updated ? new Date(fields.updated) : null,
      devStartDate,
      devCloseDate,
      epicId,
      epicName,
      sprintHistory,
      currentSprint,
      statusBySprint: Object.keys(statusBySprint).length > 0 ? statusBySprint : null,
      storyPointsBySprint: Object.keys(storyPointsBySprint).length > 0 ? storyPointsBySprint : null,
      statusHistoryDays,
      rawData: jiraIssue,
      sprintIds, // Necesario para guardar relaciones después
      statusHistory, // Necesario para guardar historial después
    };
  } catch (error) {
    logger.error(`❌ Error transformando issue ${jiraIssue.key}:`, error);
    return null;
  }
}

/**
 * Versión original (mantener para compatibilidad)
 * @deprecated Use processIssuesWithClientBatch for better performance
 */
export async function processIssuesWithClient(squadId, jiraIssues, jiraClient) {
  logger.info(`🔄 Procesando ${jiraIssues.length} issues del delta...`);
  logger.info(`   📋 Comparando cambios antes de actualizar (solo se actualizarán issues con cambios reales)`);
  logger.warn(`   ⚠️ Usando modo individual (más lento). Considera usar processIssuesWithClientBatch para mejor rendimiento.`);
  
  // Limpiar cache de épicas al inicio de cada sincronización para evitar datos obsoletos
  epicDetailsCache.clear();
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0; // Issues sin cambios que se omitieron

  for (const issue of jiraIssues) {
    try {
      const result = await processIssue(squadId, issue, jiraClient);
      
      // Si processIssue retorna null, significa que no había cambios
      if (result === null) {
        skippedCount++;
      } else {
        successCount++;
      }
      
      if ((successCount + skippedCount) % 20 === 0) {
        logger.info(`   📊 Progreso: ${successCount} actualizados, ${skippedCount} sin cambios, ${successCount + skippedCount}/${jiraIssues.length}`);
      }
    } catch (error) {
      errorCount++;
      logger.error(`   ❌ Error en issue ${issue.key}:`, error.message);
    }
  }

  logger.success(`✅ Procesamiento completo:`);
  logger.success(`   📊 Issues actualizados: ${successCount}`);
  logger.success(`   ⏭️  Issues sin cambios (omitidos): ${skippedCount}`);
  logger.success(`   ❌ Errores: ${errorCount}`);
  logger.info(`   💡 Total procesados: ${successCount + skippedCount + errorCount}/${jiraIssues.length}`);
  
  return { successCount, errorCount, skippedCount };
}

