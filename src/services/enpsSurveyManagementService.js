/**
 * Service for managing eNPS Surveys
 * Handles CRUD operations for enps_surveys table
 */

import { supabase } from '../utils/supabaseApi.js';

/**
 * Get all surveys
 * @param {Object} options - Query options
 * @param {boolean} options.includeInactive - Include inactive surveys
 * @returns {Promise<Array>} Array of surveys
 */
export const getAllSurveys = async (options = {}) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    let query = supabase
      .from('enps_surveys')
      .select('*')
      .order('created_at', { ascending: false });

    if (!options.includeInactive) {
      // By default, show all surveys (both active and inactive)
      // But we can filter if needed
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error getting surveys:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in getAllSurveys:', error);
    throw error;
  }
};

/**
 * Get active survey
 * @returns {Promise<Object|null>} Active survey or null
 */
export const getActiveSurvey = async () => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('enps_surveys')
      .select('*')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[ENPS_SURVEY_MGMT] Error getting active survey:', error);
      return null;
    }

    return data || null;
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in getActiveSurvey:', error);
    return null;
  }
};

/**
 * Get survey by ID
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object|null>} Survey or null
 */
export const getSurveyById = async (surveyId) => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('enps_surveys')
      .select('*')
      .eq('id', surveyId)
      .single();

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error getting survey:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in getSurveyById:', error);
    return null;
  }
};

/**
 * Create a new survey
 * @param {Object} surveyData - Survey data
 * @param {string} surveyData.survey_name - Survey name (e.g., "jan2026")
 * @param {string} surveyData.description - Optional description
 * @param {string} surveyData.start_date - Start date (YYYY-MM-DD)
 * @param {string} surveyData.end_date - Optional end date (YYYY-MM-DD)
 * @param {boolean} surveyData.is_active - Whether to activate this survey
 * @returns {Promise<Object>} Created survey
 */
export const createSurvey = async (surveyData) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { survey_name, description, start_date, end_date, is_active = false } = surveyData;

    // Validate required fields
    if (!survey_name || !start_date) {
      throw new Error('Survey name and start date are required');
    }

    // If activating, deactivate all other surveys first
    if (is_active) {
      await deactivateAllSurveys();
    }

    const { data, error } = await supabase
      .from('enps_surveys')
      .insert({
        survey_name: survey_name.trim(),
        description: description || null,
        start_date,
        end_date: end_date || null,
        is_active
      })
      .select()
      .single();

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error creating survey:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in createSurvey:', error);
    throw error;
  }
};

/**
 * Update a survey
 * @param {string} surveyId - Survey ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated survey
 */
export const updateSurvey = async (surveyId, updates) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    // If activating this survey, deactivate all others first
    if (updates.is_active === true) {
      await deactivateAllSurveys();
    }

    const { data, error } = await supabase
      .from('enps_surveys')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', surveyId)
      .select()
      .single();

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error updating survey:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in updateSurvey:', error);
    throw error;
  }
};

/**
 * Delete a survey
 * @param {string} surveyId - Survey ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteSurvey = async (surveyId) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabase
      .from('enps_surveys')
      .delete()
      .eq('id', surveyId);

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error deleting survey:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in deleteSurvey:', error);
    throw error;
  }
};

/**
 * Activate a survey (deactivates all others)
 * @param {string} surveyId - Survey ID to activate
 * @returns {Promise<Object>} Updated survey
 */
export const activateSurvey = async (surveyId) => {
  return await updateSurvey(surveyId, { is_active: true });
};

/**
 * Deactivate a survey
 * @param {string} surveyId - Survey ID to deactivate
 * @returns {Promise<Object>} Updated survey
 */
export const deactivateSurvey = async (surveyId) => {
  return await updateSurvey(surveyId, { is_active: false });
};

/**
 * Deactivate all surveys
 * @returns {Promise<boolean>} Success status
 */
export const deactivateAllSurveys = async () => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { error } = await supabase
      .from('enps_surveys')
      .update({ is_active: false })
      .eq('is_active', true);

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error deactivating all surveys:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in deactivateAllSurveys:', error);
    throw error;
  }
};

/**
 * Get survey results (responses count and statistics)
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} Survey results with statistics
 */
export const getSurveyResults = async (surveyId) => {
  if (!supabase) {
    return null;
  }

  try {
    // Get survey details
    const survey = await getSurveyById(surveyId);
    if (!survey) {
      return null;
    }

    // Get responses for this survey
    const { data: responses, error } = await supabase
      .from('enps_responses')
      .select('nps_score, comments, survey_date, respondent_id')
      .eq('survey_id', surveyId);

    if (error) {
      console.error('[ENPS_SURVEY_MGMT] Error getting survey results:', error);
      return null;
    }

    // Calculate statistics
    const totalResponses = responses?.length || 0;
    const promoters = responses?.filter(r => r.nps_score >= 9).length || 0;
    const passives = responses?.filter(r => r.nps_score >= 7 && r.nps_score < 9).length || 0;
    const detractors = responses?.filter(r => r.nps_score <= 6).length || 0;
    
    const enps = totalResponses > 0 
      ? ((promoters - detractors) / totalResponses) * 100 
      : 0;

    const avgScore = totalResponses > 0
      ? responses.reduce((sum, r) => sum + (r.nps_score || 0), 0) / totalResponses
      : 0;

    return {
      survey,
      totalResponses,
      promoters,
      passives,
      detractors,
      enps: Math.round(enps * 10) / 10, // Round to 1 decimal
      avgScore: Math.round(avgScore * 10) / 10,
      responses: responses || []
    };
  } catch (error) {
    console.error('[ENPS_SURVEY_MGMT] Error in getSurveyResults:', error);
    return null;
  }
};

