/**
 * Service for managing eNPS Survey Questions
 * Handles fetching questions for surveys
 */

import { supabase } from '../utils/supabaseApi.js';

/**
 * Get all questions for a survey, organized by category
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} Questions organized by category
 */
export const getSurveyQuestions = async (surveyId) => {
  if (!supabase) {
    console.error('[ENPS_QUESTIONS] Supabase not configured');
    return null;
  }

  try {
    console.log('[ENPS_QUESTIONS] Fetching questions for survey:', surveyId);
    const { data, error } = await supabase
      .from('enps_survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .order('category', { ascending: true })
      .order('question_order', { ascending: true });

    if (error) {
      console.error('[ENPS_QUESTIONS] Error fetching questions:', error);
      return null;
    }

    console.log('[ENPS_QUESTIONS] Raw data received:', data?.length || 0, 'questions');

    if (!data || data.length === 0) {
      console.log('[ENPS_QUESTIONS] No questions found for survey:', surveyId);
      return null;
    }

    // Organize questions by category
    const questionsByCategory = {};
    data.forEach(question => {
      if (!questionsByCategory[question.category]) {
        questionsByCategory[question.category] = [];
      }
      questionsByCategory[question.category].push(question);
    });

    // Define the correct order of categories
    const categoryOrder = [
      'IDENTIFICATION',
      'PROCESS MANAGEMENT',
      'ARCHITECTURE',
      'CULTURAL',
      'CONTINUOUS DELIVERY',
      'PRODUCT DEVELOPMENT',
      'TEAM CONTEXT',
      'PM METRICS',
      'DREAM TEAM FEEDBACK',
      'MORALE',
      'OPEN FEEDBACK'
    ];

    // Sort categories according to the defined order
    const sortedCategories = categoryOrder.filter(cat => questionsByCategory[cat]);

    const result = {
      questions: data,
      byCategory: questionsByCategory,
      categories: sortedCategories
    };

    console.log('[ENPS_QUESTIONS] Organized questions:', {
      total: data.length,
      categories: result.categories,
      questionsPerCategory: Object.keys(questionsByCategory).map(cat => ({
        category: cat,
        count: questionsByCategory[cat].length
      }))
    });

    return result;
  } catch (error) {
    console.error('[ENPS_QUESTIONS] Exception fetching questions:', error);
    return null;
  }
};

/**
 * Get questions for a specific category
 * @param {string} surveyId - Survey ID
 * @param {string} category - Category name
 * @returns {Promise<Array>} Questions for the category
 */
export const getQuestionsByCategory = async (surveyId, category) => {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('enps_survey_questions')
      .select('*')
      .eq('survey_id', surveyId)
      .eq('category', category)
      .order('question_order');

    if (error) {
      console.error('[ENPS_QUESTIONS] Error fetching questions by category:', error);
      return null;
    }

    return data || [];
  } catch (error) {
    console.error('[ENPS_QUESTIONS] Exception fetching questions by category:', error);
    return null;
  }
};

/**
 * Get the first question that should be shown (IDENTIFICATION category)
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>} First question
 */
export const getFirstQuestion = async (surveyId) => {
  const questions = await getQuestionsByCategory(surveyId, 'IDENTIFICATION');
  return questions && questions.length > 0 ? questions[0] : null;
};

