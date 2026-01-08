/**
 * Service for managing eNPS Survey Answers
 * Handles saving and retrieving answers to survey questions
 */

import { supabase } from '../utils/supabaseApi.js';

/**
 * Save answers for a survey response
 * @param {string} responseId - Response ID from enps_responses
 * @param {Array<Object>} answers - Array of answers {questionId, answerValue, answerNumber, answerJson}
 * @returns {Promise<Array>} Created answers
 */
export const saveSurveyAnswers = async (responseId, answers) => {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  if (!responseId || !answers || answers.length === 0) {
    throw new Error('Response ID and answers are required');
  }

  try {
    // Prepare answers for insertion
    const answersToInsert = answers.map(answer => ({
      response_id: responseId,
      question_id: answer.questionId,
      answer_value: answer.answerValue || null,
      answer_number: answer.answerNumber || null,
      answer_json: answer.answerJson || null
    }));

    // Insert answers (use upsert to handle updates)
    const { data, error } = await supabase
      .from('enps_survey_answers')
      .upsert(answersToInsert, {
        onConflict: 'response_id,question_id'
      })
      .select();

    if (error) {
      console.error('[ENPS_ANSWERS] Error saving answers:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[ENPS_ANSWERS] Exception saving answers:', error);
    throw error;
  }
};

/**
 * Get answers for a survey response
 * @param {string} responseId - Response ID
 * @returns {Promise<Array>} Answers for the response
 */
export const getResponseAnswers = async (responseId) => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('enps_survey_answers')
      .select(`
        *,
        question:enps_survey_questions(*)
      `)
      .eq('response_id', responseId);

    if (error) {
      console.error('[ENPS_ANSWERS] Error fetching answers:', error);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error('[ENPS_ANSWERS] Exception fetching answers:', error);
    return null;
  }
};

/**
 * Get answer for a specific question in a response
 * @param {string} responseId - Response ID
 * @param {string} questionId - Question ID
 * @returns {Promise<Object|null>} Answer or null
 */
export const getAnswerForQuestion = async (responseId, questionId) => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('enps_survey_answers')
      .select('*')
      .eq('response_id', responseId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[ENPS_ANSWERS] Error fetching answer:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[ENPS_ANSWERS] Exception fetching answer:', error);
    return null;
  }
};

