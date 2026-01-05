/**
 * Service for managing eNPS Survey responses
 * Handles submitting survey responses to the enps_responses table
 */

import { supabase } from '../utils/supabaseApi.js';

/**
 * Submit an eNPS survey response
 * @param {Object} responseData - Response data
 * @param {number} responseData.npsScore - NPS score (0-10)
 * @param {string} responseData.comments - Optional comments
 * @param {string} responseData.surveyPeriod - Survey period ('weekly', 'monthly', 'quarterly', 'ad-hoc')
 * @param {string} responseData.respondentId - Developer ID (optional, will use current user if not provided)
 * @param {string} responseData.surveyId - Survey ID (optional, will use active survey if not provided)
 * @param {string} responseData.squadId - Squad ID (required)
 * @returns {Promise<Object>} Created response object
 */
export const submitENPSResponse = async (responseData) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  try {
    const { npsScore, comments, surveyPeriod = 'weekly', respondentId = null, surveyId = null, squadId = null } = responseData;
    
    // Validate squadId
    if (!squadId) {
      throw new Error('Squad ID is required');
    }

    // Validate npsScore
    if (npsScore === null || npsScore === undefined || npsScore < 0 || npsScore > 10) {
      throw new Error('NPS score must be between 0 and 10');
    }

    // Get active survey if surveyId not provided
    let finalSurveyId = surveyId;
    if (!finalSurveyId) {
      try {
        const { getActiveSurvey } = await import('./enpsSurveyManagementService');
        const activeSurvey = await getActiveSurvey();
        if (activeSurvey) {
          finalSurveyId = activeSurvey.id;
        } else {
          throw new Error('No active survey found. Please activate a survey first.');
        }
      } catch (importError) {
        console.warn('[ENPS_SURVEY] Could not get active survey:', importError);
        // Continue without survey_id for backward compatibility
      }
    }

    // Get current user if respondentId not provided
    let finalRespondentId = respondentId;
    if (!finalRespondentId) {
      // Try to get from authService (localStorage session)
      try {
        const { getCurrentUser } = await import('../utils/authService');
        const currentUser = getCurrentUser();
        
        if (currentUser && currentUser.email) {
          // Try to find developer by email
          const { data: developer, error: devError } = await supabase
            .from('developers')
            .select('id')
            .eq('email', currentUser.email.toLowerCase().trim())
            .single();
          
          if (!devError && developer) {
            finalRespondentId = developer.id;
          } else {
            // If not found by email, try by user ID (if developers table has user_id column)
            // Or use the user ID directly if it matches developer ID format
            console.warn('[ENPS_SURVEY] Developer not found by email, trying alternative methods');
          }
        }
      } catch (importError) {
        console.warn('[ENPS_SURVEY] Could not import authService:', importError);
      }
      
      // Fallback: Try Supabase auth
      if (!finalRespondentId) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email) {
            const { data: developer } = await supabase
              .from('developers')
              .select('id')
              .eq('email', user.email.toLowerCase().trim())
              .single();
            
            if (developer) {
              finalRespondentId = developer.id;
            }
          }
        } catch (authError) {
          console.warn('[ENPS_SURVEY] Could not get user from Supabase auth:', authError);
        }
      }
    }

    if (!finalRespondentId) {
      throw new Error('Respondent ID is required. Please ensure you are logged in as a developer or provide a developer ID.');
    }

    // Check if user already responded to this survey today for this squad
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('enps_responses')
      .select('id')
      .eq('respondent_id', finalRespondentId)
      .eq('survey_date', today)
      .eq('squad_id', squadId);
    
    if (finalSurveyId) {
      query = query.eq('survey_id', finalSurveyId);
    }
    
    const { data: existingResponse, error: checkError } = await query.single();

    if (existingResponse && !checkError) {
      // Update existing response
      const updateData = {
        nps_score: npsScore,
        comments: comments || null,
        survey_period: surveyPeriod,
        squad_id: squadId,
        updated_at: new Date().toISOString()
      };
      
      if (finalSurveyId) {
        updateData.survey_id = finalSurveyId;
      }
      
      const { data, error } = await supabase
        .from('enps_responses')
        .update(updateData)
        .eq('id', existingResponse.id)
        .select()
        .single();

      if (error) {
        console.error('[ENPS_SURVEY] Error updating response:', error);
        throw error;
      }

      return data;
    }

    // Create new response
    const insertData = {
      survey_date: today,
      respondent_id: finalRespondentId,
      nps_score: npsScore,
      comments: comments || null,
      survey_period: surveyPeriod,
      squad_id: squadId
    };
    
    if (finalSurveyId) {
      insertData.survey_id = finalSurveyId;
    }
    
    const { data, error } = await supabase
      .from('enps_responses')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('[ENPS_SURVEY] Error submitting response:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[ENPS_SURVEY] Error in submitENPSResponse:', error);
    throw error;
  }
};

/**
 * Get user's latest eNPS response
 * @param {string} respondentId - Developer ID (optional)
 * @param {string} surveyId - Survey ID to filter by (optional)
 * @returns {Promise<Object|null>} Latest response or null
 */
export const getLatestResponse = async (respondentId = null, surveyId = null) => {
  if (!supabase) {
    return null;
  }

  try {
    let query = supabase
      .from('enps_responses')
      .select('*')
      .order('survey_date', { ascending: false })
      .limit(1);

    if (respondentId) {
      query = query.eq('respondent_id', respondentId);
    } else {
      // Try to get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: developer } = await supabase
          .from('developers')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (developer) {
          query = query.eq('respondent_id', developer.id);
        }
      }
    }

    // Filter by survey if provided
    if (surveyId) {
      query = query.eq('survey_id', surveyId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[ENPS_SURVEY] Error getting latest response:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('[ENPS_SURVEY] Error in getLatestResponse:', error);
    return null;
  }
};

/**
 * Check if user has already responded today
 * @param {string} respondentId - Developer ID (optional)
 * @param {string} surveyId - Survey ID to check (optional, will use active survey if not provided)
 * @returns {Promise<boolean>} True if already responded today
 */
export const hasRespondedToday = async (respondentId = null, surveyId = null) => {
  // Get active survey if surveyId not provided
  let finalSurveyId = surveyId;
  if (!finalSurveyId) {
    try {
      const { getActiveSurvey } = await import('./enpsSurveyManagementService');
      const activeSurvey = await getActiveSurvey();
      if (activeSurvey) {
        finalSurveyId = activeSurvey.id;
      }
    } catch (importError) {
      console.warn('[ENPS_SURVEY] Could not get active survey:', importError);
    }
  }

  const latestResponse = await getLatestResponse(respondentId, finalSurveyId);
  if (!latestResponse) {
    return false;
  }

  const today = new Date().toISOString().split('T')[0];
  const responseDate = new Date(latestResponse.survey_date).toISOString().split('T')[0];
  
  return responseDate === today;
};

