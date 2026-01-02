/**
 * Funciones de cálculo para KPIs basadas en el documento Delivery OKRS Plan
 */

import {
  CYCLE_TIME_SCORING,
  DEPLOY_FREQUENCY_SCORING,
  PR_SIZE_SCORING,
  DELIVERY_SUCCESS_WEIGHTS,
  SCORE_LEVELS
} from '../config/kpiConfig';

/**
 * Calcula el Delivery Success Score (0-100)
 * @param {number} cycleTimeScore - Score de Cycle Time (0-100)
 * @param {number} deployFreqScore - Score de Deploy Frequency (0-100)
 * @param {number} prSizeScore - Score de PR Size (0-100)
 * @returns {number} Delivery Success Score (0-100)
 */
export const calculateDeliverySuccessScore = (cycleTimeScore, deployFreqScore, prSizeScore) => {
  const score = (
    cycleTimeScore * DELIVERY_SUCCESS_WEIGHTS.CYCLE_TIME +
    deployFreqScore * DELIVERY_SUCCESS_WEIGHTS.DEPLOY_FREQUENCY +
    prSizeScore * DELIVERY_SUCCESS_WEIGHTS.PR_SIZE
  );
  
  return Math.round(score);
};

/**
 * Calcula el score de Cycle Time basado en horas
 * @param {number} hours - Horas de Cycle Time
 * @returns {number} Score (0-100)
 */
export const calculateCycleTimeScore = (hours) => {
  if (hours <= CYCLE_TIME_SCORING.ELITE.max) {
    return CYCLE_TIME_SCORING.ELITE.score;
  }
  
  if (hours >= CYCLE_TIME_SCORING.GOOD.min && hours <= CYCLE_TIME_SCORING.GOOD.max) {
    return CYCLE_TIME_SCORING.GOOD.score;
  }
  
  if (hours >= CYCLE_TIME_SCORING.FAIR.min && hours <= CYCLE_TIME_SCORING.FAIR.max) {
    return CYCLE_TIME_SCORING.FAIR.score;
  }
  
  if (hours >= CYCLE_TIME_SCORING.NEEDS_FOCUS.min && hours <= CYCLE_TIME_SCORING.NEEDS_FOCUS.max) {
    return CYCLE_TIME_SCORING.NEEDS_FOCUS.score;
  }
  
  return CYCLE_TIME_SCORING.POOR.score;
};

/**
 * Calcula el score de Deploy Frequency basado en deploys por día
 * @param {number} deploysPerDay - Número de deploys por día
 * @returns {number} Score (0-100)
 */
export const calculateDeployFrequencyScore = (deploysPerDay) => {
  if (deploysPerDay >= DEPLOY_FREQUENCY_SCORING.ELITE.min) {
    return DEPLOY_FREQUENCY_SCORING.ELITE.score;
  }
  
  if (deploysPerDay >= DEPLOY_FREQUENCY_SCORING.GOOD.min && 
      deploysPerDay < DEPLOY_FREQUENCY_SCORING.GOOD.max) {
    return DEPLOY_FREQUENCY_SCORING.GOOD.score;
  }
  
  if (deploysPerDay >= DEPLOY_FREQUENCY_SCORING.FAIR.min && 
      deploysPerDay < DEPLOY_FREQUENCY_SCORING.FAIR.max) {
    return DEPLOY_FREQUENCY_SCORING.FAIR.score;
  }
  
  if (deploysPerDay >= DEPLOY_FREQUENCY_SCORING.NEEDS_FOCUS.min && 
      deploysPerDay < DEPLOY_FREQUENCY_SCORING.NEEDS_FOCUS.max) {
    return DEPLOY_FREQUENCY_SCORING.NEEDS_FOCUS.score;
  }
  
  return DEPLOY_FREQUENCY_SCORING.POOR.score;
};

/**
 * Calcula el score de PR Size basado en líneas de código
 * @param {number} linesChanged - Líneas de código cambiadas
 * @returns {number} Score (0-100)
 */
export const calculatePRSizeScore = (linesChanged) => {
  if (linesChanged >= PR_SIZE_SCORING.ELITE.min && linesChanged <= PR_SIZE_SCORING.ELITE.max) {
    return PR_SIZE_SCORING.ELITE.score;
  }
  
  if (linesChanged > PR_SIZE_SCORING.GOOD.min && linesChanged <= PR_SIZE_SCORING.GOOD.max) {
    return PR_SIZE_SCORING.GOOD.score;
  }
  
  if (linesChanged > PR_SIZE_SCORING.FAIR.min && linesChanged <= PR_SIZE_SCORING.FAIR.max) {
    return PR_SIZE_SCORING.FAIR.score;
  }
  
  if (linesChanged > PR_SIZE_SCORING.NEEDS_FOCUS.min && linesChanged <= PR_SIZE_SCORING.NEEDS_FOCUS.max) {
    return PR_SIZE_SCORING.NEEDS_FOCUS.score;
  }
  
  return PR_SIZE_SCORING.POOR.score;
};

/**
 * Obtiene el nivel de score basado en el valor
 * @param {number} score - Score (0-100)
 * @returns {Object} Objeto con label y color
 */
export const getScoreLevel = (score) => {
  if (score >= SCORE_LEVELS.ELITE.min) {
    return SCORE_LEVELS.ELITE;
  }
  
  if (score >= SCORE_LEVELS.GOOD.min && score <= SCORE_LEVELS.GOOD.max) {
    return SCORE_LEVELS.GOOD;
  }
  
  if (score >= SCORE_LEVELS.FAIR.min && score <= SCORE_LEVELS.FAIR.max) {
    return SCORE_LEVELS.FAIR;
  }
  
  return SCORE_LEVELS.POOR;
};

/**
 * Obtiene el color para el semáforo basado en el score
 * @param {number} score - Score (0-100)
 * @returns {string} Color ('emerald' | 'blue' | 'amber' | 'rose')
 */
export const getScoreColor = (score) => {
  return getScoreLevel(score).color;
};

