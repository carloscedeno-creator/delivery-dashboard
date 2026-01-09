/**
 * Funciones de sincronización para múltiples proyectos
 * Versión que acepta proyecto y cliente de Jira como parámetros
 */

import { logger } from '../utils/logger.js';
import supabaseClient from '../clients/supabase-client.js';
import { processIssuesWithClient } from '../processors/issue-processor.js';

/**
 * Sincronización completa para un proyecto específico
 */
export async function fullSyncForProject(project, squadId, jiraClient) {
  const startTime = Date.now();
  logger.info(`🚀 Iniciando sincronización completa para ${project.projectKey}...`);

  try {
    // 1. Registrar inicio de sincronización
    await supabaseClient.logSync(squadId, 'full', 'running', 0);

    // 2. Obtener todos los issues de Jira (incluyendo épicas)
    logger.info(`📥 Obteniendo issues de Jira para ${project.projectKey}...`);
    const jqlQuery = `project = "${project.projectKey.toUpperCase()}" AND issuetype != "Sub-task" ORDER BY created DESC`;
    const jiraIssues = await jiraClient.fetchAllIssues(jqlQuery);

    if (jiraIssues.length === 0) {
      logger.warn(`⚠️ No se encontraron issues en Jira para ${project.projectKey}`);
      await supabaseClient.logSync(squadId, 'full', 'completed', 0);
      return { success: true, issuesProcessed: 0 };
    }

    // 3. Procesar épicas directamente (issues de tipo Epic)
    logger.info(`📦 Procesando épicas directamente para ${project.projectKey}...`);
    const epics = jiraIssues.filter(issue => 
      issue.fields.issuetype?.name === 'Epic'
    );
    
    if (epics.length > 0) {
      logger.info(`   Encontradas ${epics.length} épicas para procesar`);
      logger.info(`   ⚡ Procesando épicas en paralelo (batches de 5)...`);
      
      // Procesar épicas en paralelo (batches más pequeños para épicas)
      const EPIC_BATCH_SIZE = 5;
      for (let i = 0; i < epics.length; i += EPIC_BATCH_SIZE) {
        const batch = epics.slice(i, i + EPIC_BATCH_SIZE);
        const batchPromises = batch.map(async (epic) => {
          try {
            // Obtener detalles completos de la épica para extraer fechas
            const epicDetails = await jiraClient.fetchIssueDetails(epic.key);
            let epicStartDate = null;
            let epicEndDate = null;
            
            if (epicDetails && epicDetails.fields) {
              const timelineDates = jiraClient.extractTimelineDates(epicDetails.fields);
              epicStartDate = timelineDates.startDate;
              epicEndDate = timelineDates.endDate;
            }
            
            await supabaseClient.getOrCreateEpic(
              squadId,
              epic.key,
              epic.fields.summary || 'N/A',
              epicStartDate,
              epicEndDate
            );
            return { success: true, key: epic.key };
          } catch (error) {
            logger.warn(`⚠️ Error procesando épica ${epic.key}:`, error.message);
            return { success: false, key: epic.key, error: error.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        const successful = batchResults.filter(r => r.success).length;
        logger.debug(`   ✅ Batch épicas ${Math.floor(i / EPIC_BATCH_SIZE) + 1}: ${successful}/${batch.length} procesadas`);
      }
    }

    // 4. Procesar issues (usar modo batch optimizado)
    logger.info(`🔄 Procesando ${jiraIssues.length} issues (modo BATCH optimizado)...`);
    const { processIssuesWithClientBatch } = await import('../processors/issue-processor.js');
    const { successCount, errorCount } = await processIssuesWithClientBatch(squadId, jiraIssues, jiraClient);

    // 5. Procesar cierre de sprints cerrados (Tarea 3: Mejorar Condiciones de Cierre)
    try {
      logger.info(`🔍 Validando y procesando sprints cerrados para ${project.projectKey}...`);
      const { processAllClosedSprints } = await import('../processors/sprint-closure-processor.js');
      const closureResult = await processAllClosedSprints(squadId, jiraClient);
      
      if (closureResult.updated > 0) {
        logger.success(`   ✅ ${closureResult.updated} sprints cerrados actualizados con complete_date`);
      }
      if (closureResult.errors > 0) {
        logger.warn(`   ⚠️ ${closureResult.errors} errores durante procesamiento de sprints cerrados`);
      }
    } catch (closureError) {
      logger.warn(`⚠️ Error procesando cierre de sprints: ${closureError.message}`);
      // No fallar la sincronización completa por esto
    }

    // 6. Registrar finalización
    await supabaseClient.logSync(squadId, 'full', 'completed', successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Sincronización completa finalizada para ${project.projectKey} en ${duration}s`);
    logger.success(`   📊 Issues procesados: ${successCount} exitosos, ${errorCount} errores`);

    return {
      success: true,
      issuesProcessed: successCount,
      errors: errorCount,
      duration: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Error durante sincronización completa para ${project.projectKey}:`, error);
    
    // Registrar error
    try {
      await supabaseClient.logSync(
        squadId,
        'full',
        'failed',
        0,
        error.message
      );
    } catch (logError) {
      logger.error('❌ Error registrando sync log:', logError);
    }

    throw error;
  }
}

/**
 * Sincronización incremental para un proyecto específico
 * También sincroniza issues de sprints activos para mantener estados actualizados
 */
export async function incrementalSyncForProject(project, squadId, jiraClient) {
  const startTime = Date.now();
  logger.info(`🔄 Iniciando sincronización incremental para ${project.projectKey}...`);

  try {
    // 1. Obtener última sincronización
    const lastSync = await supabaseClient.getLastSync(squadId);
    
    // Si no hay sync previa, usar una ventana más pequeña (últimas 24 horas) para evitar traer demasiados datos
    // Si hay sync previa, usar esa fecha exacta
    const sinceDate = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000); // Últimas 24 horas si no hay sync previa

    if (lastSync) {
      logger.info(`📅 Sincronización incremental desde última sync: ${sinceDate.toISOString()}`);
    } else {
      logger.info(`📅 Primera sincronización incremental: usando ventana de 24 horas desde ${sinceDate.toISOString()}`);
    }

    // 2. Registrar inicio
    await supabaseClient.logSync(squadId, 'incremental', 'running', 0);

    // 3. Obtener issues actualizados O creados (delta completo)
    // Esto asegura que capturamos tanto tickets modificados como tickets nuevos
    const dateStr = sinceDate.toISOString().split('T')[0];
    const baseJqlQuery = `project = "${project.projectKey.toUpperCase()}" AND issuetype != "Sub-task"`;
    const deltaCondition = `(updated >= "${dateStr}" OR created >= "${dateStr}")`;
    const jqlQuery = `${baseJqlQuery} AND ${deltaCondition} ORDER BY updated DESC`;
    
    logger.info(`📥 Buscando tickets delta desde ${dateStr} (actualizados O creados)...`);
    const jiraIssues = await jiraClient.fetchAllIssues(jqlQuery);
    
    logger.info(`📥 Issues encontrados en delta: ${jiraIssues.length} (actualizados o creados desde ${dateStr})`);

    // 4. Obtener issues del SPRINT ACTUAL (solo el que está en curso ahora) para sincronizar sus estados
    // Esto asegura que los estados de issues en el sprint actual siempre estén actualizados
    // OPTIMIZACIÓN: Solo sincronizar el sprint actual, no todos los sprints activos
    const currentSprintIssues = [];
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Obtener solo el sprint ACTUAL: el que tiene start_date <= hoy <= end_date y está activo
      // Ordenar por start_date DESC para obtener el más reciente primero
      const { data: currentSprints, error: sprintsError } = await supabaseClient.client
        .from('sprints')
        .select('id, sprint_key, sprint_name, start_date, end_date')
        .eq('squad_id', squadId)
        .lte('start_date', today) // Sprint ya inició
        .or(`end_date.is.null,end_date.gte.${today}`) // Sprint no ha terminado o no tiene fecha de fin
        .order('start_date', { ascending: false }) // El más reciente primero
        .limit(1); // Solo el sprint actual más reciente
      
      if (!sprintsError && currentSprints && currentSprints.length > 0) {
        const currentSprint = currentSprints[0];
        logger.info(`🏃 Sincronizando issues del SPRINT ACTUAL: ${currentSprint.sprint_name}`);
        
        // Usar JQL para obtener issues del sprint actual directamente desde Jira
        // Esto es más eficiente que buscar en Supabase primero
        try {
          // Construir JQL para obtener issues del sprint actual
          // Buscar por sprintName en el campo de sprint de Jira
          const sprintJql = `project = "${project.projectKey.toUpperCase()}" AND issuetype != "Sub-task" AND sprint in openSprints() ORDER BY updated DESC`;
          
          logger.info(`   📥 Obteniendo issues del sprint actual desde Jira...`);
          const sprintIssuesFromJira = await jiraClient.fetchAllIssues(sprintJql);
          
          if (sprintIssuesFromJira && sprintIssuesFromJira.length > 0) {
            logger.info(`   📋 Issues encontrados en sprint actual desde Jira: ${sprintIssuesFromJira.length}`);
            
            // Filtrar solo los que no están ya en el delta
            for (const sprintIssue of sprintIssuesFromJira) {
              const alreadyIncluded = jiraIssues.some(ji => ji.key === sprintIssue.key);
              if (!alreadyIncluded) {
                currentSprintIssues.push(sprintIssue);
                logger.debug(`   📋 Issue de sprint actual agregado a cola: ${sprintIssue.key} (se comparará antes de actualizar)`);
              } else {
                logger.debug(`   ⏭️  Issue ${sprintIssue.key} ya está en el delta, omitiendo duplicado`);
              }
            }
          } else {
            logger.info(`   ⚠️ No se encontraron issues del sprint actual desde Jira usando JQL (puede que el sprint no tenga issues o JQL no funcione)`);
            
            // Fallback mejorado: Intentar obtener TODOS los issues del sprint usando sprint ID
            // Esto asegura que capturamos tickets que fueron agregados después de la última sync completa
            if (currentSprint.sprint_key) {
              try {
                logger.info(`   🔄 Intentando obtener issues usando sprint ID: ${currentSprint.sprint_key}...`);
                const sprintIssuesById = await jiraClient.fetchSprintIssues(currentSprint.sprint_key);
                
                if (sprintIssuesById && sprintIssuesById.length > 0) {
                  logger.info(`   ✅ Encontrados ${sprintIssuesById.length} issues usando sprint ID`);
                  
                  // Obtener detalles completos de cada issue EN PARALELO (optimización)
                  // fetchSprintIssues retorna un array de issues con estructura { key, id, ... }
                  const issueKeys = sprintIssuesById
                    .map(si => si.key || si.id)
                    .filter(Boolean);
                  
                  logger.info(`   ⚡ Procesando ${issueKeys.length} issues en paralelo (batches de 10)...`);
                  
                  // Procesar en batches paralelos de 10 para evitar sobrecargar Jira
                  const BATCH_SIZE_PARALLEL = 10;
                  for (let i = 0; i < issueKeys.length; i += BATCH_SIZE_PARALLEL) {
                    const batch = issueKeys.slice(i, i + BATCH_SIZE_PARALLEL);
                    const batchPromises = batch.map(async (issueKey) => {
                      try {
                        const issueDetails = await jiraClient.fetchIssueDetails(issueKey);
                        if (issueDetails) {
                          const alreadyIncluded = jiraIssues.some(ji => ji.key === issueKey);
                          if (!alreadyIncluded) {
                            return issueDetails;
                          } else {
                            logger.debug(`   ⏭️  Issue ${issueKey} ya está en el delta, omitiendo duplicado`);
                            return null;
                          }
                        }
                        return null;
                      } catch (error) {
                        if (error.status !== 404) {
                          logger.debug(`   ⚠️ No se pudo obtener ${issueKey} desde Jira: ${error.message}`);
                        }
                        return null;
                      }
                    });
                    
                    const batchResults = await Promise.all(batchPromises);
                    const validIssues = batchResults.filter(Boolean);
                    currentSprintIssues.push(...validIssues);
                    
                    if (validIssues.length > 0) {
                      logger.debug(`   ✅ Batch ${Math.floor(i / BATCH_SIZE_PARALLEL) + 1}: ${validIssues.length} issues obtenidos`);
                    }
                  }
                } else {
                  logger.info(`   ⚠️ No se encontraron issues usando sprint ID, usando fallback desde Supabase`);
                  // Continuar con fallback desde Supabase
                }
              } catch (sprintIdError) {
                logger.warn(`   ⚠️ Error obteniendo issues usando sprint ID: ${sprintIdError.message}`);
                logger.info(`   💡 Usando fallback desde Supabase`);
              }
            }
            
            // Fallback final: buscar en Supabase si los métodos anteriores no funcionaron
            // Solo usar este fallback si no se encontraron issues con los métodos anteriores
            if (currentSprintIssues.length === 0) {
              logger.info(`   🔄 Usando fallback desde Supabase (solo tickets ya registrados)...`);
              const { data: sprintIssues, error: sprintIssuesError } = await supabaseClient.client
                .from('issue_sprints')
                .select('issue_id')
                .eq('sprint_id', currentSprint.id);
              
              if (!sprintIssuesError && sprintIssues && sprintIssues.length > 0) {
                const issueIds = sprintIssues.map(si => si.issue_id);
                
                const { data: issues, error: issuesError } = await supabaseClient.client
                  .from('issues')
                  .select('issue_key')
                  .in('id', issueIds);
                
                if (!issuesError && issues) {
                  const issueKeys = issues.map(i => i.issue_key).filter(Boolean);
                  logger.info(`   📋 Sprint ${currentSprint.sprint_name}: ${issueKeys.length} issues (fallback desde Supabase - solo tickets ya registrados)`);
                  
                  // Obtener detalles de cada issue desde Jira EN PARALELO (optimización)
                  logger.info(`   ⚡ Procesando ${issueKeys.length} issues en paralelo (batches de 10)...`);
                  
                  // Procesar en batches paralelos de 10 para evitar sobrecargar Jira
                  const BATCH_SIZE_PARALLEL = 10;
                  for (let i = 0; i < issueKeys.length; i += BATCH_SIZE_PARALLEL) {
                    const batch = issueKeys.slice(i, i + BATCH_SIZE_PARALLEL);
                    const batchPromises = batch.map(async (issueKey) => {
                      try {
                        const issueDetails = await jiraClient.fetchIssueDetails(issueKey);
                        if (issueDetails) {
                          const alreadyIncluded = jiraIssues.some(ji => ji.key === issueKey);
                          if (!alreadyIncluded) {
                            return issueDetails;
                          }
                        }
                        return null;
                      } catch (error) {
                        if (error.status !== 404) {
                          logger.debug(`   ⚠️ No se pudo obtener ${issueKey} desde Jira: ${error.message}`);
                        }
                        return null;
                      }
                    });
                    
                    const batchResults = await Promise.all(batchPromises);
                    const validIssues = batchResults.filter(Boolean);
                    currentSprintIssues.push(...validIssues);
                    
                    if (validIssues.length > 0) {
                      logger.debug(`   ✅ Batch ${Math.floor(i / BATCH_SIZE_PARALLEL) + 1}: ${validIssues.length} issues obtenidos`);
                    }
                  }
                }
              } else {
                logger.warn(`   ⚠️ No se encontraron issues en Supabase para el sprint ${currentSprint.sprint_name}`);
              }
            }
          }
        } catch (jqlError) {
          logger.warn(`⚠️ Error obteniendo issues del sprint actual desde Jira (JQL): ${jqlError.message}`);
          logger.info(`   💡 Continuando solo con issues del delta (sin issues del sprint actual)`);
        }
        
        logger.info(`📊 Issues del sprint actual a sincronizar: ${currentSprintIssues.length}`);
      } else {
        logger.info(`ℹ️ No se encontró sprint actual para ${project.projectKey}, solo se sincronizarán issues del delta`);
      }
    } catch (error) {
      logger.warn(`⚠️ Error obteniendo issues del sprint actual: ${error.message}`);
      logger.info(`   💡 Continuando solo con issues del delta`);
    }

    // Combinar issues actualizados con issues del sprint actual
    const allIssues = [...jiraIssues];
    const existingKeys = new Set(jiraIssues.map(ji => ji.key));
    
    for (const sprintIssue of currentSprintIssues) {
      if (!existingKeys.has(sprintIssue.key)) {
        allIssues.push(sprintIssue);
        existingKeys.add(sprintIssue.key);
      }
    }

    if (allIssues.length === 0) {
      logger.info(`✅ No hay cambios desde la última sincronización para ${project.projectKey}`);
      await supabaseClient.logSync(squadId, 'incremental', 'completed', 0);
      return { success: true, issuesProcessed: 0 };
    }
    
    logger.info(`📊 Total de issues a procesar: ${allIssues.length} (${jiraIssues.length} actualizados + ${currentSprintIssues.length} del sprint actual)`);

    // 5. Procesar épicas actualizadas
    const updatedEpics = allIssues.filter(issue => 
      issue.fields.issuetype?.name === 'Epic'
    );
    
    if (updatedEpics.length > 0) {
      logger.info(`   Procesando ${updatedEpics.length} épicas actualizadas para ${project.projectKey}...`);
      for (const epic of updatedEpics) {
        try {
          const epicDetails = await jiraClient.fetchIssueDetails(epic.key);
          let epicStartDate = null;
          let epicEndDate = null;
          
          if (epicDetails && epicDetails.fields) {
            const timelineDates = jiraClient.extractTimelineDates(epicDetails.fields);
            epicStartDate = timelineDates.startDate;
            epicEndDate = timelineDates.endDate;
          }
          
          await supabaseClient.getOrCreateEpic(
            squadId,
            epic.key,
            epic.fields.summary || 'N/A',
            epicStartDate,
            epicEndDate
          );
        } catch (error) {
          logger.warn(`⚠️ Error procesando épica ${epic.key}:`, error.message);
        }
      }
    }

    // 6. Procesar issues (incluyendo los del sprint actual)
    // Usar modo batch optimizado para mejor rendimiento
    logger.info(`🔄 Procesando ${allIssues.length} issues del delta (modo BATCH optimizado)...`);
    const { processIssuesWithClientBatch } = await import('../processors/issue-processor.js');
    const { successCount, errorCount } = await processIssuesWithClientBatch(squadId, allIssues, jiraClient);

    // 7. Procesar cierre de sprints cerrados (Tarea 3: Mejorar Condiciones de Cierre)
    try {
      logger.info(`🔍 Validando y procesando sprints cerrados para ${project.projectKey}...`);
      const { processAllClosedSprints } = await import('../processors/sprint-closure-processor.js');
      const closureResult = await processAllClosedSprints(squadId, jiraClient);
      
      if (closureResult.updated > 0) {
        logger.success(`   ✅ ${closureResult.updated} sprints cerrados actualizados con complete_date`);
      }
      if (closureResult.errors > 0) {
        logger.warn(`   ⚠️ ${closureResult.errors} errores durante procesamiento de sprints cerrados`);
      }
    } catch (closureError) {
      logger.warn(`⚠️ Error procesando cierre de sprints: ${closureError.message}`);
      // No fallar la sincronización completa por esto
    }

    // 8. Registrar finalización
    await supabaseClient.logSync(squadId, 'incremental', 'completed', successCount);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.success(`✅ Sincronización incremental finalizada para ${project.projectKey} en ${duration}s`);
    logger.success(`   📊 Issues procesados: ${successCount} exitosos, ${errorCount} errores`);
    logger.info(`   📈 Solo se actualizaron issues con cambios reales (comparación inteligente)`);

    return {
      success: true,
      issuesProcessed: successCount,
      errors: errorCount,
      duration: parseFloat(duration),
    };
  } catch (error) {
    logger.error(`❌ Error durante sincronización incremental para ${project.projectKey}:`, error);
    throw error;
  }
}
