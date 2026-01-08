/**
 * Service for managing Team Capacity data
 * Handles CRUD operations for squad_sprint_capacity table
 */
import { supabase } from '../utils/supabaseApi';

/**
 * Get capacity data for a specific squad and sprint
 * @param {string} squadId - Squad ID
 * @param {string} sprintId - Sprint ID
 * @returns {Promise<Object|null>} Capacity data or null if not found
 */
export const getCapacityForSquadSprint = async (squadId, sprintId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('squad_sprint_capacity')
      .select('*')
      .eq('squad_id', squadId)
      .eq('sprint_id', sprintId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return null
        return null;
      }
      console.error('[TeamCapacity] Error getting capacity:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return null;
  }
};

/**
 * Get all capacity data for a sprint (all squads)
 * @param {string} sprintId - Sprint ID
 * @returns {Promise<Array>} Array of capacity records
 */
export const getCapacityForSprint = async (sprintId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('v_squad_sprint_capacity_complete')
      .select('*')
      .eq('sprint_id', sprintId)
      .order('squad_name');

    if (error) {
      console.error('[TeamCapacity] Error getting capacity for sprint:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Get all capacity data for a squad (all sprints)
 * @param {string} squadId - Squad ID
 * @returns {Promise<Array>} Array of capacity records
 */
export const getCapacityForSquad = async (squadId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('v_squad_sprint_capacity_complete')
      .select('*')
      .eq('squad_id', squadId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[TeamCapacity] Error getting capacity for squad:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Create or update capacity record
 * @param {Object} capacityData - Capacity data
 * @param {string} capacityData.squad_id - Squad ID
 * @param {string} capacityData.sprint_id - Sprint ID
 * @param {number} capacityData.capacity_goal_sp - Capacity goal in SP
 * @param {number} capacityData.capacity_available_sp - Available capacity in SP
 * @param {string} userId - User ID creating/updating
 * @returns {Promise<Object|null>} Created/updated record or null on error
 */
export const upsertCapacity = async (capacityData, userId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return null;
  }

  try {
    const { squad_id, sprint_id, capacity_goal_sp, capacity_available_sp } = capacityData;

    // Check if record exists
    const existing = await getCapacityForSquadSprint(squad_id, sprint_id);

    const record = {
      squad_id,
      sprint_id,
      capacity_goal_sp: parseFloat(capacity_goal_sp) || 0,
      capacity_available_sp: parseFloat(capacity_available_sp) || 0
    };

    // Solo incluir created_by_id y updated_by_id si userId es válido
    // (cuando se usa clave anónima, userId puede ser null/undefined/inválido)
    // Validar que userId sea un UUID válido (no vacío, no null, formato correcto)
    const isValidUserId = userId && 
                          typeof userId === 'string' && 
                          userId.trim() !== '' &&
                          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    
    if (isValidUserId) {
      record.updated_by_id = userId;
      if (!existing) {
        record.created_by_id = userId;
      }
      console.log('[TeamCapacity] Including userId fields:', { created_by_id: record.created_by_id, updated_by_id: record.updated_by_id });
    } else {
      // Asegurarse de que estos campos NO estén en el record
      delete record.created_by_id;
      delete record.updated_by_id;
      console.log('[TeamCapacity] userId is invalid or missing, excluding created_by_id and updated_by_id:', { userId, isValidUserId: false });
    }
    // Si userId no es válido, simplemente no incluimos estos campos
    // La base de datos usará NULL (que está permitido por el schema)

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('squad_sprint_capacity')
        .update(record)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[TeamCapacity] Error updating capacity:', error);
        return null;
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('squad_sprint_capacity')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('[TeamCapacity] Error creating capacity:', error);
        return null;
      }
      result = data;
    }

    console.log('[TeamCapacity] Capacity saved successfully:', result.id);
    return result;
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return null;
  }
};

/**
 * Get all squads
 * @returns {Promise<Array>} Array of squads
 */
export const getAllSquads = async () => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('squads')
      .select('id, squad_name, squad_key')
      .order('squad_name');

    if (error) {
      console.error('[TeamCapacity] Error getting squads:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Get all sprints for a squad
 * @param {string} squadId - Squad ID (optional, if null returns all sprints)
 * @returns {Promise<Array>} Array of sprints
 */
export const getAllSprints = async (squadId = null) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    let query = supabase
      .from('sprints')
      .select('id, sprint_name, start_date, end_date, complete_date, state, squad_id')
      .ilike('sprint_name', '%Sprint%')
      .order('start_date', { ascending: false });

    if (squadId) {
      query = query.eq('squad_id', squadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TeamCapacity] Error getting sprints:', error);
      return [];
    }

    // Determinar sprint actual (active state o el más reciente que no ha terminado)
    const now = new Date();
    const sprintsWithCurrent = (data || []).map(sprint => {
      // Un sprint está activo si:
      // 1. Tiene state === 'active', O
      // 2. No tiene end_date o end_date es en el futuro (y no está cerrado)
      const isActive = sprint.state === 'active' || 
        (sprint.state !== 'closed' && (!sprint.end_date || new Date(sprint.end_date) >= now));
      return { ...sprint, is_active: isActive };
    });

    return sprintsWithCurrent;
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Get ALL active developers (for multisquad support)
 * @returns {Promise<Array>} Array of all active developers
 */
export const getAllDevelopers = async () => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    // Get all active developers
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name, email')
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (devsError) {
      console.error('[TeamCapacity] Error getting all developers:', devsError);
      return [];
    }

    return developers || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Get developers for a specific squad (legacy - kept for compatibility)
 * @param {string} squadId - Squad ID
 * @returns {Promise<Array>} Array of developers
 */
export const getDevelopersForSquad = async (squadId) => {
  // For multisquad support, return all developers
  // The UI will allow selecting any developer for any squad
  return getAllDevelopers();
};

/**
 * Get participating developers for a squad-sprint capacity record
 * @param {string} capacityId - Squad sprint capacity ID
 * @returns {Promise<Array>} Array of participating developers
 */
export const getParticipatingDevelopers = async (capacityId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('v_squad_sprint_developers_complete')
      .select('*')
      .eq('squad_sprint_capacity_id', capacityId)
      .eq('is_participating', true)
      .order('developer_name');

    if (error) {
      console.error('[TeamCapacity] Error getting participating developers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Get all developers (participating and non-participating) for a squad-sprint capacity record
 * @param {string} capacityId - Squad sprint capacity ID
 * @returns {Promise<Array>} Array of all developers with participation status
 */
export const getAllDevelopersForCapacity = async (capacityId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('v_squad_sprint_developers_complete')
      .select('*')
      .eq('squad_sprint_capacity_id', capacityId)
      .order('developer_name');

    if (error) {
      console.error('[TeamCapacity] Error getting developers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Upsert developer participation for a squad-sprint capacity
 * @param {string} capacityId - Squad sprint capacity ID
 * @param {string} developerId - Developer ID
 * @param {boolean} isParticipating - Whether developer is participating
 * @returns {Promise<Object|null>} Created/updated record or null on error
 */
export const upsertDeveloperParticipation = async (capacityId, developerId, isParticipating) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('squad_sprint_developers')
      .upsert({
        squad_sprint_capacity_id: capacityId,
        developer_id: developerId,
        is_participating: isParticipating
      }, {
        onConflict: 'squad_sprint_capacity_id,developer_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[TeamCapacity] Error upserting developer participation:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return null;
  }
};

/**
 * Batch upsert developer participations
 * @param {string} capacityId - Squad sprint capacity ID
 * @param {Array} participations - Array of {developer_id, is_participating, capacity_allocation_sp}
 * @returns {Promise<boolean>} Success status
 */
export const batchUpsertDeveloperParticipations = async (capacityId, participations) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return false;
  }

  try {
    const records = participations.map(p => ({
      squad_sprint_capacity_id: capacityId,
      developer_id: p.developer_id,
      is_participating: p.is_participating || false,
      capacity_allocation_sp: p.capacity_allocation_sp || 0
    }));

    const { error } = await supabase
      .from('squad_sprint_developers')
      .upsert(records, {
        onConflict: 'squad_sprint_capacity_id,developer_id'
      });

    if (error) {
      console.error('[TeamCapacity] Error batch upserting participations:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return false;
  }
};

/**
 * Get last capacity allocation for developers from previous sprints
 * @param {Array<string>} developerIds - Array of developer IDs
 * @param {string} currentSprintId - Current sprint ID (to exclude from search)
 * @returns {Promise<Object>} Map of developer_id to last capacity_allocation_sp
 */
export const getLastCapacityAllocations = async (developerIds, currentSprintId = null) => {
  if (!supabase || !developerIds || developerIds.length === 0) {
    return {};
  }

  try {
    // First, get all capacity records excluding current sprint
    let capacityQuery = supabase
      .from('squad_sprint_capacity')
      .select('id, sprint_id, sprint:sprints!inner(end_date)')
      .order('sprint.end_date', { ascending: false })
      .limit(100); // Get recent sprints

    if (currentSprintId) {
      capacityQuery = capacityQuery.neq('sprint_id', currentSprintId);
    }

    const { data: capacityRecords, error: capacityError } = await capacityQuery;

    if (capacityError || !capacityRecords || capacityRecords.length === 0) {
      console.log('[TeamCapacity] No previous capacity records found');
      return {};
    }

    const capacityIds = capacityRecords.map(c => c.id);

    // Get developer allocations from these capacity records
    const { data: allocations, error } = await supabase
      .from('squad_sprint_developers')
      .select('developer_id, capacity_allocation_sp, squad_sprint_capacity_id')
      .in('developer_id', developerIds)
      .in('squad_sprint_capacity_id', capacityIds)
      .eq('is_participating', true)
      .not('capacity_allocation_sp', 'is', null)
      .gt('capacity_allocation_sp', 0)
      .order('squad_sprint_capacity_id', { ascending: false });

    if (error) {
      console.warn('[TeamCapacity] Error getting last capacity allocations:', error);
      return {};
    }

    if (!allocations || allocations.length === 0) {
      console.log('[TeamCapacity] No previous allocations found for developers');
      return {};
    }

    // Create a map of capacity_id to sprint end_date for sorting
    const capacityToSprintDate = {};
    capacityRecords.forEach(c => {
      capacityToSprintDate[c.id] = c.sprint?.end_date || '';
    });

    // Sort allocations by sprint end_date (most recent first)
    allocations.sort((a, b) => {
      const dateA = capacityToSprintDate[a.squad_sprint_capacity_id] || '';
      const dateB = capacityToSprintDate[b.squad_sprint_capacity_id] || '';
      return dateB.localeCompare(dateA);
    });

    // Create a map of developer_id to last capacity_allocation_sp
    // (take the first occurrence for each developer since they're sorted by date)
    const lastCapacityMap = {};
    const seenDevelopers = new Set();
    
    allocations.forEach(allocation => {
      if (!seenDevelopers.has(allocation.developer_id) && allocation.capacity_allocation_sp > 0) {
        lastCapacityMap[allocation.developer_id] = allocation.capacity_allocation_sp;
        seenDevelopers.add(allocation.developer_id);
      }
    });

    console.log('[TeamCapacity] Found last capacity allocations for', Object.keys(lastCapacityMap).length, 'developers');
    return lastCapacityMap;
  } catch (error) {
    console.error('[TeamCapacity] Error getting last capacity allocations:', error);
    return {};
  }
};

/**
 * Get last squad/project assigned for developers from previous sprints
 * @param {Array<string>} developerIds - Array of developer IDs
 * @param {string} currentSprintId - Current sprint ID (to exclude from search)
 * @returns {Promise<Object>} Map of developer_id to last squad_name
 */
export const getLastSquadAssignments = async (developerIds, currentSprintId = null) => {
  if (!supabase || !developerIds || developerIds.length === 0) {
    return {};
  }

  try {
    // First, get all capacity records excluding current sprint
    let capacityQuery = supabase
      .from('squad_sprint_capacity')
      .select('id, squad_id, sprint_id, sprint:sprints!inner(end_date), squad:squads!inner(squad_name)')
      .order('sprint.end_date', { ascending: false })
      .limit(100); // Get recent sprints

    if (currentSprintId) {
      capacityQuery = capacityQuery.neq('sprint_id', currentSprintId);
    }

    const { data: capacityRecords, error: capacityError } = await capacityQuery;

    if (capacityError || !capacityRecords || capacityRecords.length === 0) {
      console.log('[TeamCapacity] No previous capacity records found for squad assignments');
      return {};
    }

    const capacityIds = capacityRecords.map(c => c.id);

    // Get developer allocations from these capacity records
    const { data: allocations, error } = await supabase
      .from('squad_sprint_developers')
      .select('developer_id, squad_sprint_capacity_id')
      .in('developer_id', developerIds)
      .in('squad_sprint_capacity_id', capacityIds)
      .eq('is_participating', true);

    if (error) {
      console.warn('[TeamCapacity] Error getting last squad assignments:', error);
      return {};
    }

    if (!allocations || allocations.length === 0) {
      console.log('[TeamCapacity] No previous allocations found for developers');
      return {};
    }

    // Create a map of capacity_id to squad_name and sprint end_date for sorting
    const capacityToSquad = {};
    const capacityToSprintDate = {};
    capacityRecords.forEach(c => {
      capacityToSquad[c.id] = c.squad?.squad_name || '';
      capacityToSprintDate[c.id] = c.sprint?.end_date || '';
    });

    // Sort allocations by sprint end_date (most recent first)
    allocations.sort((a, b) => {
      const dateA = capacityToSprintDate[a.squad_sprint_capacity_id] || '';
      const dateB = capacityToSprintDate[b.squad_sprint_capacity_id] || '';
      return dateB.localeCompare(dateA);
    });

    // Create a map of developer_id to last squad_name
    // (take the first occurrence for each developer since they're sorted by date)
    const lastSquadMap = {};
    const seenDevelopers = new Set();
    
    allocations.forEach(allocation => {
      if (!seenDevelopers.has(allocation.developer_id)) {
        const squadName = capacityToSquad[allocation.squad_sprint_capacity_id];
        if (squadName) {
          lastSquadMap[allocation.developer_id] = squadName;
          seenDevelopers.add(allocation.developer_id);
        }
      }
    });

    console.log('[TeamCapacity] Found last squad assignments for', Object.keys(lastSquadMap).length, 'developers');
    return lastSquadMap;
  } catch (error) {
    console.error('[TeamCapacity] Error getting last squad assignments:', error);
    return {};
  }
};

/**
 * Recalculate SP Done for a specific capacity record
 * @param {string} squadId - Squad ID
 * @param {string} sprintId - Sprint ID
 * @returns {Promise<number|null>} Calculated SP Done or null on error
 */
export const recalculateSpDone = async (squadId, sprintId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase.rpc('calculate_squad_sprint_sp_done', {
      p_squad_id: squadId,
      p_sprint_id: sprintId
    });

    if (error) {
      console.error('[TeamCapacity] Error recalculating SP Done:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return null;
  }
};

