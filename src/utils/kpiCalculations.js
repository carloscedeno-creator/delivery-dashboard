/**
 * Funciones de cálculo para KPIs basadas en el documento Delivery OKRS Plan
 */

import {
  CYCLE_TIME_SCORING,
  DEPLOY_FREQUENCY_SCORING,
  PR_SIZE_SCORING,
  CHANGE_FAILURE_RATE_SCORING,
  NET_BUG_FLOW_SCORING,
  REWORK_RATE_SCORING,
  ENPS_SCORING,
  PLANNING_ACCURACY_SCORING,
  CAPACITY_ACCURACY_SCORING,
  DELIVERY_SUCCESS_WEIGHTS,
  DEVELOPMENT_QUALITY_WEIGHTS,
  TEAM_HEALTH_WEIGHTS,
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

/**
 * Calcula el Development Quality Score (0-100)
 * @param {number} changeFailureRateScore - Score de Change Failure Rate (0-100)
 * @param {number} netBugFlowScore - Score de Net Bug Flow (0-100)
 * @param {number} reworkRateScore - Score de Rework Rate (0-100)
 * @returns {number} Development Quality Score (0-100)
 */
export const calculateDevelopmentQualityScore = (
  changeFailureRateScore,
  netBugFlowScore,
  reworkRateScore
) => {
  const score = (
    changeFailureRateScore * DEVELOPMENT_QUALITY_WEIGHTS.CHANGE_FAILURE_RATE +
    netBugFlowScore * DEVELOPMENT_QUALITY_WEIGHTS.NET_BUG_FLOW +
    reworkRateScore * DEVELOPMENT_QUALITY_WEIGHTS.REWORK_RATE
  );
  
  return Math.round(score);
};

/**
 * Calcula el Team Health Score (0-100)
 * @param {number} enpsScore - Score de eNPS (0-100)
 * @param {number} planningAccuracyScore - Score de Planning Accuracy (0-100)
 * @param {number} capacityAccuracyScore - Score de Capacity Accuracy (0-100)
 * @returns {number} Team Health Score (0-100)
 */
export const calculateTeamHealthScore = (
  enpsScore,
  planningAccuracyScore,
  capacityAccuracyScore
) => {
  const score = (
    enpsScore * TEAM_HEALTH_WEIGHTS.ENPS +
    planningAccuracyScore * TEAM_HEALTH_WEIGHTS.PLANNING_ACCURACY +
    capacityAccuracyScore * TEAM_HEALTH_WEIGHTS.CAPACITY_ACCURACY
  );
  
  return Math.round(score);
};

/**
 * Calcula el score de Change Failure Rate basado en porcentaje
 * @param {number} percentage - Change Failure Rate como porcentaje (0-100)
 * @returns {number} Score (0-100)
 */
export const calculateChangeFailureRateScore = (percentage) => {
  if (percentage <= CHANGE_FAILURE_RATE_SCORING.ELITE.max) {
    return CHANGE_FAILURE_RATE_SCORING.ELITE.score;
  }
  
  if (percentage >= CHANGE_FAILURE_RATE_SCORING.GOOD.min && 
      percentage <= CHANGE_FAILURE_RATE_SCORING.GOOD.max) {
    return CHANGE_FAILURE_RATE_SCORING.GOOD.score;
  }
  
  if (percentage > CHANGE_FAILURE_RATE_SCORING.FAIR.min && 
      percentage <= CHANGE_FAILURE_RATE_SCORING.FAIR.max) {
    return CHANGE_FAILURE_RATE_SCORING.FAIR.score;
  }
  
  if (percentage > CHANGE_FAILURE_RATE_SCORING.NEEDS_FOCUS.min && 
      percentage <= CHANGE_FAILURE_RATE_SCORING.NEEDS_FOCUS.max) {
    return CHANGE_FAILURE_RATE_SCORING.NEEDS_FOCUS.score;
  }
  
  return CHANGE_FAILURE_RATE_SCORING.POOR.score;
};

/**
 * Calcula el score de Net Bug Flow basado en ratio (bugs resolved / bugs created)
 * @param {number} ratio - Net Bug Flow ratio
 * @returns {number} Score (0-100)
 */
export const calculateNetBugFlowScore = (ratio) => {
  if (ratio >= NET_BUG_FLOW_SCORING.ELITE.min) {
    return NET_BUG_FLOW_SCORING.ELITE.score;
  }
  
  if (ratio >= NET_BUG_FLOW_SCORING.GOOD.min && ratio < NET_BUG_FLOW_SCORING.GOOD.max) {
    return NET_BUG_FLOW_SCORING.GOOD.score;
  }
  
  if (ratio >= NET_BUG_FLOW_SCORING.FAIR.min && ratio < NET_BUG_FLOW_SCORING.FAIR.max) {
    return NET_BUG_FLOW_SCORING.FAIR.score;
  }
  
  if (ratio >= NET_BUG_FLOW_SCORING.NEEDS_FOCUS.min && 
      ratio < NET_BUG_FLOW_SCORING.NEEDS_FOCUS.max) {
    return NET_BUG_FLOW_SCORING.NEEDS_FOCUS.score;
  }
  
  return NET_BUG_FLOW_SCORING.POOR.score;
};

/**
 * Calcula el score de Rework Rate basado en porcentaje
 * @param {number} percentage - Rework Rate como porcentaje (0-100)
 * @returns {number} Score (0-100)
 */
export const calculateReworkRateScore = (percentage) => {
  if (percentage <= REWORK_RATE_SCORING.ELITE.max) {
    return REWORK_RATE_SCORING.ELITE.score;
  }
  
  if (percentage > REWORK_RATE_SCORING.GOOD.min && 
      percentage <= REWORK_RATE_SCORING.GOOD.max) {
    return REWORK_RATE_SCORING.GOOD.score;
  }
  
  if (percentage > REWORK_RATE_SCORING.FAIR.min && 
      percentage <= REWORK_RATE_SCORING.FAIR.max) {
    return REWORK_RATE_SCORING.FAIR.score;
  }
  
  if (percentage > REWORK_RATE_SCORING.NEEDS_FOCUS.min && 
      percentage <= REWORK_RATE_SCORING.NEEDS_FOCUS.max) {
    return REWORK_RATE_SCORING.NEEDS_FOCUS.score;
  }
  
  return REWORK_RATE_SCORING.POOR.score;
};

/**
 * Calcula el score de eNPS basado en el valor
 * @param {number} enps - Employee Net Promoter Score
 * @returns {number} Score (0-100)
 */
export const calculateENPSScore = (enps) => {
  if (enps >= ENPS_SCORING.ELITE.min) {
    return ENPS_SCORING.ELITE.score;
  }
  
  if (enps >= ENPS_SCORING.GOOD.min && enps < ENPS_SCORING.GOOD.max) {
    return ENPS_SCORING.GOOD.score;
  }
  
  if (enps >= ENPS_SCORING.FAIR.min && enps < ENPS_SCORING.FAIR.max) {
    return ENPS_SCORING.FAIR.score;
  }
  
  if (enps >= ENPS_SCORING.NEEDS_FOCUS.min && enps < ENPS_SCORING.NEEDS_FOCUS.max) {
    return ENPS_SCORING.NEEDS_FOCUS.score;
  }
  
  return ENPS_SCORING.POOR.score;
};

/**
 * Calcula el score de Planning Accuracy basado en porcentaje
 * @param {number} percentage - Planning Accuracy como porcentaje (0-100)
 * @returns {number} Score (0-100)
 */
export const calculatePlanningAccuracyScore = (percentage) => {
  if (percentage >= PLANNING_ACCURACY_SCORING.ELITE.min) {
    return PLANNING_ACCURACY_SCORING.ELITE.score;
  }
  
  if (percentage >= PLANNING_ACCURACY_SCORING.GOOD.min && 
      percentage < PLANNING_ACCURACY_SCORING.GOOD.max) {
    return PLANNING_ACCURACY_SCORING.GOOD.score;
  }
  
  if (percentage >= PLANNING_ACCURACY_SCORING.FAIR.min && 
      percentage < PLANNING_ACCURACY_SCORING.FAIR.max) {
    return PLANNING_ACCURACY_SCORING.FAIR.score;
  }
  
  if (percentage >= PLANNING_ACCURACY_SCORING.NEEDS_FOCUS.min && 
      percentage < PLANNING_ACCURACY_SCORING.NEEDS_FOCUS.max) {
    return PLANNING_ACCURACY_SCORING.NEEDS_FOCUS.score;
  }
  
  return PLANNING_ACCURACY_SCORING.POOR.score;
};

/**
 * Calcula el score de Capacity Accuracy basado en ratio (actual / planned)
 * @param {number} ratio - Capacity Accuracy ratio (ej: 0.95 = 95%, 1.15 = 115%)
 * @returns {number} Score (0-100)
 */
export const calculateCapacityAccuracyScore = (ratio) => {
  // Elite: 95-105% (perfect planning)
  if (ratio >= CAPACITY_ACCURACY_SCORING.ELITE.min && 
      ratio <= CAPACITY_ACCURACY_SCORING.ELITE.max) {
    return CAPACITY_ACCURACY_SCORING.ELITE.score;
  }
  
  // Good: 85-95% (slight underutilization) o 105-115% (slight overcommitment)
  if ((ratio >= CAPACITY_ACCURACY_SCORING.GOOD.min && ratio < CAPACITY_ACCURACY_SCORING.ELITE.min) ||
      (ratio > CAPACITY_ACCURACY_SCORING.ELITE.max && ratio <= CAPACITY_ACCURACY_SCORING.GOOD_OVER.max)) {
    return CAPACITY_ACCURACY_SCORING.GOOD.score;
  }
  
  // Fair: 75-85% o 115-125%
  if ((ratio >= CAPACITY_ACCURACY_SCORING.FAIR.min && ratio < CAPACITY_ACCURACY_SCORING.GOOD.min) ||
      (ratio > CAPACITY_ACCURACY_SCORING.GOOD_OVER.max && ratio <= CAPACITY_ACCURACY_SCORING.FAIR_OVER.max)) {
    return CAPACITY_ACCURACY_SCORING.FAIR.score;
  }
  
  // Needs Focus: 65-75% o 125-135%
  if ((ratio >= CAPACITY_ACCURACY_SCORING.NEEDS_FOCUS.min && ratio < CAPACITY_ACCURACY_SCORING.FAIR.min) ||
      (ratio > CAPACITY_ACCURACY_SCORING.FAIR_OVER.max && ratio <= CAPACITY_ACCURACY_SCORING.NEEDS_FOCUS_OVER.max)) {
    return CAPACITY_ACCURACY_SCORING.NEEDS_FOCUS.score;
  }
  
  // Poor: < 65% (underutilization) o > 135% (severe overcommitment/burnout risk)
  return CAPACITY_ACCURACY_SCORING.POOR.score;
};

