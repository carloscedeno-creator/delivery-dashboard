/**
 * Service for managing Product Department KPIs data
 * Handles CRUD operations for product_department_kpis table
 */
import { supabase } from '../utils/supabaseApi';

/**
 * Get all Product Department KPIs
 * @returns {Promise<Array>} Array of KPI records
 */
export const getAllProductDepartmentKPIs = async () => {
  if (!supabase) {
    console.warn('[ProductDepartmentKPIs] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('product_department_kpis')
      .select('*')
      .order('initiative', { ascending: true });

    if (error) {
      console.error('[ProductDepartmentKPIs] Error getting KPIs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error:', error);
    return [];
  }
};

/**
 * Get a single Product Department KPI by ID
 * @param {string} id - KPI record ID
 * @returns {Promise<Object|null>} KPI record or null
 */
export const getProductDepartmentKPIById = async (id) => {
  if (!supabase) {
    console.warn('[ProductDepartmentKPIs] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('product_department_kpis')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('[ProductDepartmentKPIs] Error getting KPI:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error:', error);
    return null;
  }
};

/**
 * Create a new Product Department KPI record
 * @param {Object} kpiData - KPI data
 * @param {string} userId - User ID creating the record
 * @returns {Promise<Object|null>} Created record or null
 */
export const createProductDepartmentKPI = async (kpiData, userId) => {
  if (!supabase) {
    console.warn('[ProductDepartmentKPIs] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('product_department_kpis')
      .insert({
        ...kpiData,
        created_by_id: userId,
        updated_by_id: userId
      })
      .select()
      .single();

    if (error) {
      console.error('[ProductDepartmentKPIs] Error creating KPI:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error:', error);
    return null;
  }
};

/**
 * Update a Product Department KPI record
 * @param {string} id - KPI record ID
 * @param {Object} kpiData - Updated KPI data
 * @param {string} userId - User ID updating the record
 * @returns {Promise<Object|null>} Updated record or null
 */
export const updateProductDepartmentKPI = async (id, kpiData, userId) => {
  if (!supabase) {
    console.warn('[ProductDepartmentKPIs] Supabase not configured');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('product_department_kpis')
      .update({
        ...kpiData,
        updated_by_id: userId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[ProductDepartmentKPIs] Error updating KPI:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error:', error);
    return null;
  }
};

/**
 * Delete a Product Department KPI record
 * @param {string} id - KPI record ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteProductDepartmentKPI = async (id) => {
  if (!supabase) {
    console.warn('[ProductDepartmentKPIs] Supabase not configured');
    return false;
  }

  try {
    const { error } = await supabase
      .from('product_department_kpis')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[ProductDepartmentKPIs] Error deleting KPI:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error:', error);
    return false;
  }
};

/**
 * Batch update Product Department KPIs
 * @param {Array} updates - Array of {id, data} objects
 * @param {string} userId - User ID making the updates
 * @returns {Promise<boolean>} Success status
 */
export const batchUpdateProductDepartmentKPIs = async (updates, userId) => {
  if (!supabase || !updates || updates.length === 0) {
    return false;
  }

  try {
    // Update each record individually (Supabase doesn't support batch updates easily)
    const promises = updates.map(({ id, data }) =>
      updateProductDepartmentKPI(id, data, userId)
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r !== null).length;

    return successCount === updates.length;
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error in batch update:', error);
    return false;
  }
};

/**
 * Get last update timestamp from product_department_kpis table
 * @returns {Promise<string|null>} Last update timestamp or null
 */
export const getLastUpdateTimestamp = async () => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('product_department_kpis')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.updated_at;
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error getting last update timestamp:', error);
    return null;
  }
};

/**
 * Get Product Roadmap initiatives from product_department_kpis table
 * Maps database fields to ProductRoadmapView expected format
 * @returns {Promise<Array>} Array of initiatives in ProductRoadmap format
 */
export const getProductRoadmapInitiatives = async () => {
  if (!supabase) {
    console.warn('[ProductDepartmentKPIs] Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('product_department_kpis')
      .select('*')
      .order('initiative', { ascending: true });

    if (error) {
      console.error('[ProductDepartmentKPIs] Error getting initiatives:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Map database fields to ProductRoadmapView expected format
    return data.map(item => ({
      initiative: item.initiative || '',
      effort: item.effort_in_days ? String(item.effort_in_days) : '',
      completion: item.completion_percentage || 0,
      status: item.delivery_status || '',
      startDate: item.start_date || '',
      expectedDate: item.expected_date || '',
      endDate: item.end_date || '',
      team: item.team || '',
      quarter: item.delivery_quarter || '',
      ba: item.ba || '',
      designer: item.designer || '',
      reporter: item.reporter || '',
      gwowGate1Status: item.gwow_gate_1_status || '',
      shReviewDate: item.sh_review_date || ''
    }));
  } catch (error) {
    console.error('[ProductDepartmentKPIs] Error mapping initiatives:', error);
    return [];
  }
};
