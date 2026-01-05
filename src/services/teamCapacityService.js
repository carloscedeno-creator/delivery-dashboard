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
      capacity_available_sp: parseFloat(capacity_available_sp) || 0,
      updated_by_id: userId
    };

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
      record.created_by_id = userId;
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
      .select('id, sprint_name, start_date, end_date, state, squad_id')
      .order('start_date', { ascending: false });

    if (squadId) {
      query = query.eq('squad_id', squadId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[TeamCapacity] Error getting sprints:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
};

/**
 * Get developers for a specific squad
 * @param {string} squadId - Squad ID
 * @returns {Promise<Array>} Array of developers
 */
export const getDevelopersForSquad = async (squadId) => {
  if (!supabase) {
    console.warn('[TeamCapacity] Supabase not configured');
    return [];
  }

  try {
    // Get developers that have issues assigned in initiatives of this squad
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id')
      .eq('squad_id', squadId);

    if (initiativesError) {
      console.error('[TeamCapacity] Error getting initiatives:', initiativesError);
      return [];
    }

    const initiativeIds = (initiatives || []).map(i => i.id);

    if (initiativeIds.length === 0) {
      return [];
    }

    // Get issues for these initiatives
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('assignee_id')
      .in('initiative_id', initiativeIds)
      .not('assignee_id', 'is', null);

    if (issuesError) {
      console.error('[TeamCapacity] Error getting issues:', issuesError);
      return [];
    }

    const assigneeIds = [...new Set(issues.map(i => i.assignee_id).filter(Boolean))];

    if (assigneeIds.length === 0) {
      return [];
    }

    // Get developer information
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name, email')
      .in('id', assigneeIds)
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (devsError) {
      console.error('[TeamCapacity] Error getting developers:', devsError);
      return [];
    }

    return developers || [];
  } catch (error) {
    console.error('[TeamCapacity] Error:', error);
    return [];
  }
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
 * @param {Array} participations - Array of {developer_id, is_participating}
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
      is_participating: p.is_participating
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

