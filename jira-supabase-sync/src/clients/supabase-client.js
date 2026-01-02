/**
 * Cliente para interactuar con Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

class SupabaseClient {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || config.supabase.url;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || config.supabase.serviceRoleKey;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Obtiene o crea un squad
   */
  async getOrCreateSquad(squadKey, squadName, jiraDomain) {
    // Buscar squad existente
    const { data: existingSquad } = await this.client
      .from('squads')
      .select('id')
      .eq('squad_key', squadKey.toUpperCase())
      .single();

    if (existingSquad) {
      return existingSquad.id;
    }

    // Crear nuevo squad
    const { data: newSquad, error } = await this.client
      .from('squads')
      .insert({
        squad_key: squadKey.toUpperCase(),
        squad_name: squadName,
        jira_domain: jiraDomain,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error creando squad:`, error);
      throw error;
    }

    return newSquad.id;
  }

  /**
   * Obtiene o crea un desarrollador
   */
  async getOrCreateDeveloper(displayName, email, accountId) {
    if (!displayName) {
      return null;
    }

    // Buscar por accountId primero (más confiable)
    if (accountId) {
      const { data: existingDev } = await this.client
        .from('developers')
        .select('id')
        .eq('jira_account_id', accountId)
        .single();

      if (existingDev) {
        return existingDev.id;
      }
    }

    // Buscar por email
    if (email) {
      const { data: existingDev } = await this.client
        .from('developers')
        .select('id')
        .eq('email', email)
        .single();

      if (existingDev) {
        return existingDev.id;
      }
    }

    // Buscar por nombre
    const { data: existingDev } = await this.client
      .from('developers')
      .select('id')
      .eq('display_name', displayName)
      .single();

    if (existingDev) {
      return existingDev.id;
    }

    // Crear nuevo desarrollador
    const { data: newDev, error } = await this.client
      .from('developers')
      .insert({
        display_name: displayName,
        email: email || null,
        jira_account_id: accountId || null,
        active: true,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error creando developer:`, error);
      return null;
    }

    return newDev.id;
  }

  /**
   * Obtiene o crea una épica
   */
  async getOrCreateEpic(squadId, epicKey, epicName, startDate = null, endDate = null) {
    if (!epicKey) {
      return null;
    }

    // Buscar épica existente
    const { data: existingEpic } = await this.client
      .from('initiatives')
      .select('id')
      .eq('squad_id', squadId)
      .eq('initiative_key', epicKey)
      .single();

    if (existingEpic) {
      // Actualizar fechas si se proporcionan y son diferentes
      if (startDate || endDate) {
        const updateData = {};
        if (startDate !== null) updateData.start_date = startDate;
        if (endDate !== null) updateData.end_date = endDate;

        if (Object.keys(updateData).length > 0) {
          await this.client
            .from('initiatives')
            .update(updateData)
            .eq('id', existingEpic.id);
        }
      }
      return existingEpic.id;
    }

    // Crear nueva épica
    const { data: newEpic, error } = await this.client
      .from('initiatives')
      .insert({
        squad_id: squadId,
        initiative_key: epicKey,
        initiative_name: epicName,
        start_date: startDate,
        end_date: endDate,
      })
      .select('id')
      .single();

    if (error) {
      logger.error(`❌ Error creando épica:`, error);
      return null;
    }

    return newEpic.id;
  }

  /**
   * Obtiene o crea un sprint
   */
  async getOrCreateSprint(squadId, sprintData) {
    if (!sprintData.id || !sprintData.name) {
      return null;
    }

    // Buscar sprint existente por sprint_key primero (más específico)
    const { data: existingSprint } = await this.client
      .from('sprints')
      .select('id')
      .eq('squad_id', squadId)
      .eq('sprint_key', sprintData.id.toString())
      .maybeSingle();

    if (existingSprint) {
      return existingSprint.id;
    }

    // Si no existe por sprint_key, buscar por sprint_name (para manejar casos donde sprint_key puede variar)
    const { data: existingByName } = await this.client
      .from('sprints')
      .select('id')
      .eq('squad_id', squadId)
      .eq('sprint_name', sprintData.name)
      .maybeSingle();

    if (existingByName) {
      return existingByName.id;
    }

    // Crear nuevo sprint usando upsert para evitar condiciones de carrera
    const { data: newSprint, error } = await this.client
      .from('sprints')
      .upsert({
        squad_id: squadId,
        sprint_key: sprintData.id.toString(),
        sprint_name: sprintData.name,
        start_date: sprintData.startDate ? new Date(sprintData.startDate) : null,
        end_date: sprintData.endDate ? new Date(sprintData.endDate) : null,
      }, {
        onConflict: 'squad_id,sprint_name', // Usar la constraint que realmente existe
      })
      .select('id')
      .single();

    if (error) {
      // Si el error es de duplicado, intentar obtener el sprint existente
      if (error.code === '23505') {
        const { data: existing } = await this.client
          .from('sprints')
          .select('id')
          .eq('squad_id', squadId)
          .eq('sprint_name', sprintData.name)
          .maybeSingle();
        
        if (existing) {
          return existing.id;
        }
      }
      logger.error(`❌ Error creando sprint:`, error);
      return null;
    }

    return newSprint.id;
  }

  /**
   * Upsert de un issue con comparación de cambios
   * Solo actualiza si hay cambios reales en los campos importantes
   * 
   * @deprecated Use upsertIssuesBatch for better performance
   */
  async upsertIssue(squadId, issueData) {
    // Construir el objeto de datos explícitamente, asegurándonos de NO incluir epic_id
    const upsertData = {
      squad_id: squadId,
      issue_key: issueData.key,
      issue_type: issueData.issueType,
      summary: issueData.summary,
      assignee_id: issueData.assigneeId,
      priority: issueData.priority,
      current_status: issueData.status,
      current_story_points: issueData.storyPoints || 0,
      resolution: issueData.resolution,
      created_date: issueData.createdDate,
      resolved_date: issueData.resolvedDate,
      updated_date: issueData.updatedDate,
      dev_start_date: issueData.devStartDate,
      dev_close_date: issueData.devCloseDate,
      initiative_id: issueData.epicId || null, // Usar initiative_id, NO epic_id
      epic_name: issueData.epicName || null,
      sprint_history: issueData.sprintHistory || null,
      current_sprint: issueData.currentSprint || 'Backlog', // Sprint actual/último calculado
      status_by_sprint: issueData.statusBySprint || {},
      story_points_by_sprint: issueData.storyPointsBySprint || {},
      status_history_days: issueData.statusHistoryDays || null,
      raw_data: issueData.rawData,
    };

    // Asegurarse de que NO haya ninguna referencia a epic_id
    if ('epic_id' in upsertData) {
      delete upsertData.epic_id;
    }

    // Verificar si el issue ya existe y comparar cambios importantes
    const { data: existingIssue } = await this.client
      .from('issues')
      .select('id, current_status, current_story_points, updated_date, current_sprint, assignee_id')
      .eq('issue_key', issueData.key)
      .single();

    let hasChanges = false;
    if (existingIssue) {
      // Comparar campos importantes para determinar si hay cambios reales
      const statusChanged = existingIssue.current_status !== issueData.status;
      const spChanged = existingIssue.current_story_points !== (issueData.storyPoints || 0);
      const sprintChanged = existingIssue.current_sprint !== (issueData.currentSprint || 'Backlog');
      const assigneeChanged = existingIssue.assignee_id !== issueData.assigneeId;
      const updatedDateChanged = existingIssue.updated_date !== issueData.updatedDate?.toISOString();
      
      hasChanges = statusChanged || spChanged || sprintChanged || assigneeChanged || updatedDateChanged;
      
      if (!hasChanges) {
        // Retornar null para indicar que no hubo cambios (será contado como skipped)
        return null;
      }
      
      const changes = [];
      if (statusChanged) changes.push(`status: ${existingIssue.current_status} → ${issueData.status}`);
      if (spChanged) changes.push(`SP: ${existingIssue.current_story_points} → ${issueData.storyPoints || 0}`);
      if (sprintChanged) changes.push(`sprint: ${existingIssue.current_sprint} → ${issueData.currentSprint || 'Backlog'}`);
      if (assigneeChanged) changes.push(`assignee changed`);
      if (updatedDateChanged) changes.push(`updated_date changed`);
      
      logger.debug(`🔄 [${issueData.key}] Cambios detectados: ${changes.join(', ')}`);
    } else {
      logger.debug(`➕ [${issueData.key}] Nuevo ticket, insertando...`);
      hasChanges = true;
    }

    // Solo hacer upsert si hay cambios o es un ticket nuevo
    const { data, error } = await this.client
      .from('issues')
      .upsert(upsertData, {
        onConflict: 'issue_key',
      })
      .select('id')
      .single();

    if (error) {
      // Si el error es sobre epic_id, intentar esperar un momento y reintentar
      // (esto puede ayudar si PostgREST está refrescando su caché)
      if (error.message && error.message.includes('epic_id')) {
        logger.warn(`⚠️ Error relacionado con epic_id para ${issueData.key}, esperando 2 segundos y reintentando...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Reintentar una vez más
        const { data: retryData, error: retryError } = await this.client
          .from('issues')
          .upsert(upsertData, {
            onConflict: 'issue_key',
          })
          .select('id')
          .single();

        if (retryError) {
          logger.error(`❌ Error upserting issue ${issueData.key} (después de reintento):`, retryError);
          throw retryError;
        }

        return retryData.id;
      }

      logger.error(`❌ Error upserting issue ${issueData.key}:`, error);
      throw error;
    }

    return data.id;
  }

  /**
   * Upsert optimizado en batch: obtiene todos los issues existentes de una vez
   * y solo actualiza los que tienen cambios reales
   * 
   * @param {string} squadId - ID del squad
   * @param {Array} issuesData - Array de objetos issueData con la estructura esperada
   * @returns {Object} { updated: Array<issueId>, skipped: Array<issueKey>, errors: Array<{key, error}> }
   */
  async upsertIssuesBatch(squadId, issuesData) {
    if (!issuesData || issuesData.length === 0) {
      return { updated: [], skipped: [], errors: [] };
    }

    // 1. Obtener todos los issue_keys a verificar
    const issueKeys = issuesData.map(issue => issue.key).filter(Boolean);
    
    if (issueKeys.length === 0) {
      return { updated: [], skipped: [], errors: [] };
    }

    // 2. Batch SELECT: obtener todos los issues existentes de una vez
    // Usar paginación si hay muchos (Supabase tiene límite de ~1000 en IN)
    const BATCH_SIZE = 1000;
    const existingIssuesMap = new Map();
    
    for (let i = 0; i < issueKeys.length; i += BATCH_SIZE) {
      const batchKeys = issueKeys.slice(i, i + BATCH_SIZE);
      
      const { data: existingIssues, error: selectError } = await this.client
        .from('issues')
        .select('id, issue_key, current_status, current_story_points, updated_date, current_sprint, assignee_id')
        .in('issue_key', batchKeys);
      
      if (selectError) {
        logger.error(`❌ Error obteniendo issues existentes (batch ${i / BATCH_SIZE + 1}):`, selectError);
        // Continuar con el siguiente batch
        continue;
      }
      
      // Crear mapa para acceso rápido
      if (existingIssues) {
        existingIssues.forEach(issue => {
          existingIssuesMap.set(issue.issue_key, issue);
        });
      }
    }

    logger.debug(`📊 Issues existentes encontrados: ${existingIssuesMap.size} de ${issueKeys.length}`);

    // 3. Comparar en memoria y separar en: nuevos, actualizados, sin cambios
    const toInsert = [];
    const toUpdate = [];
    const skipped = [];
    
    for (const issueData of issuesData) {
      const existingIssue = existingIssuesMap.get(issueData.key);
      
      if (!existingIssue) {
        // Nuevo issue - NO incluir id, Supabase lo generará automáticamente
        const upsertData = this.buildUpsertData(squadId, issueData);
        // Asegurarse de que NO haya campo id (ni null ni undefined explícito)
        delete upsertData.id;
        toInsert.push(upsertData);
      } else {
        // Comparar cambios
        const statusChanged = existingIssue.current_status !== issueData.status;
        const spChanged = existingIssue.current_story_points !== (issueData.storyPoints || 0);
        const sprintChanged = existingIssue.current_sprint !== (issueData.currentSprint || 'Backlog');
        const assigneeChanged = existingIssue.assignee_id !== issueData.assigneeId;
        const updatedDateChanged = existingIssue.updated_date !== issueData.updatedDate?.toISOString();
        
        const hasChanges = statusChanged || spChanged || sprintChanged || assigneeChanged || updatedDateChanged;
        
        if (hasChanges) {
          const upsertData = this.buildUpsertData(squadId, issueData);
          upsertData.id = existingIssue.id; // Incluir ID para el upsert
          toUpdate.push(upsertData);
          
          const changes = [];
          if (statusChanged) changes.push(`status: ${existingIssue.current_status} → ${issueData.status}`);
          if (spChanged) changes.push(`SP: ${existingIssue.current_story_points} → ${issueData.storyPoints || 0}`);
          if (sprintChanged) changes.push(`sprint: ${existingIssue.current_sprint} → ${issueData.currentSprint || 'Backlog'}`);
          if (assigneeChanged) changes.push(`assignee changed`);
          if (updatedDateChanged) changes.push(`updated_date changed`);
          
          logger.debug(`🔄 [${issueData.key}] Cambios detectados: ${changes.join(', ')}`);
        } else {
          skipped.push(issueData.key);
        }
      }
    }

    logger.info(`📊 Análisis batch: ${toInsert.length} nuevos, ${toUpdate.length} con cambios, ${skipped.length} sin cambios`);

    // 4. Batch UPSERT: insertar/actualizar todos en una sola operación
    const updated = [];
    const errors = [];
    
    const allToUpsert = [...toInsert, ...toUpdate];
    
    if (allToUpsert.length > 0) {
      // Dividir en batches si es necesario (Supabase tiene límite de ~1000 por operación)
      for (let i = 0; i < allToUpsert.length; i += BATCH_SIZE) {
        const batch = allToUpsert.slice(i, i + BATCH_SIZE);
        
        const { data: upserted, error: upsertError } = await this.client
          .from('issues')
          .upsert(batch, {
            onConflict: 'issue_key',
          })
          .select('id, issue_key');
        
        if (upsertError) {
          logger.error(`❌ Error en batch upsert (batch ${i / BATCH_SIZE + 1}):`, upsertError);
          // Agregar todos los issues del batch como errores
          batch.forEach(issue => {
            errors.push({ key: issue.issue_key, error: upsertError.message });
          });
        } else if (upserted) {
          // Guardar tanto ID como issue_key para mapeo posterior
          updated.push(...upserted.map(u => ({ id: u.id, key: u.issue_key })));
        }
      }
    }

    return {
      updated: updated,
      skipped: skipped,
      errors: errors,
    };
  }

  /**
   * Construye el objeto de datos para upsert
   */
  buildUpsertData(squadId, issueData) {
    const upsertData = {
      squad_id: squadId,
      issue_key: issueData.key,
      issue_type: issueData.issueType,
      summary: issueData.summary,
      assignee_id: issueData.assigneeId,
      priority: issueData.priority,
      current_status: issueData.status,
      current_story_points: issueData.storyPoints || 0,
      resolution: issueData.resolution,
      created_date: issueData.createdDate,
      resolved_date: issueData.resolvedDate,
      updated_date: issueData.updatedDate,
      dev_start_date: issueData.devStartDate,
      dev_close_date: issueData.devCloseDate,
      initiative_id: issueData.epicId || null,
      epic_name: issueData.epicName || null,
      sprint_history: issueData.sprintHistory || null,
      current_sprint: issueData.currentSprint || 'Backlog',
      status_by_sprint: issueData.statusBySprint || {},
      story_points_by_sprint: issueData.storyPointsBySprint || {},
      status_history_days: issueData.statusHistoryDays || null,
      raw_data: issueData.rawData,
    };

    // Asegurarse de que NO haya ninguna referencia a epic_id
    if ('epic_id' in upsertData) {
      delete upsertData.epic_id;
    }

    return upsertData;
  }

  /**
   * Obtiene la última sincronización
   */
  async getLastSync(squadId) {
    const { data, error } = await this.client
      .from('data_sync_log')
      .select('sync_completed_at')
      .eq('squad_id', squadId)
      .eq('status', 'completed')
      .order('sync_completed_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return new Date(data.sync_completed_at);
  }

  /**
   * Registra una sincronización
   */
  async logSync(squadId, syncType, status, issuesCount = 0, errorMessage = null) {
    const { error } = await this.client
      .from('data_sync_log')
      .insert({
        squad_id: squadId,
        sync_type: syncType,
        sync_started_at: new Date().toISOString(),
        sync_completed_at: status === 'completed' ? new Date().toISOString() : null,
        issues_imported: issuesCount,
        status: status,
        error_message: errorMessage,
      });

    if (error) {
      logger.error(`❌ Error registrando sync log:`, error);
    }
  }
}

export default new SupabaseClient();
