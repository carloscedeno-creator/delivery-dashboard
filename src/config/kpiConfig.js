/**
 * Configuración de KPIs basada en el documento Delivery OKRS Plan
 * Define targets, thresholds, pesos y rangos de scoring
 */

// Pesos de componentes para Delivery Success Score
export const DELIVERY_SUCCESS_WEIGHTS = {
  CYCLE_TIME: 0.40,      // 40%
  DEPLOY_FREQUENCY: 0.30, // 30%
  PR_SIZE: 0.30          // 30%
};

// Rangos de scoring para Cycle Time (en horas)
export const CYCLE_TIME_SCORING = {
  ELITE: { max: 48, score: 100 },
  GOOD: { min: 48, max: 72, score: 85 },
  FAIR: { min: 73, max: 96, score: 70 },
  NEEDS_FOCUS: { min: 97, max: 120, score: 50 },
  POOR: { min: 120, score: 25 }
};

// Targets para fases del Cycle Time (en horas)
export const CYCLE_TIME_PHASES = {
  CODING_TIME: { target: 4, alert: 8 },
  PICKUP_TIME: { target: 4, alert: 16 },
  REVIEW_TIME: { target: 14, alert: 24 },
  DEPLOY_TIME: { target: 24, alert: 48 }
};

// Rangos de scoring para Deploy Frequency (deploys por día)
export const DEPLOY_FREQUENCY_SCORING = {
  ELITE: { min: 1.5, score: 100 },
  GOOD: { min: 0.8, max: 1.5, score: 85 },
  FAIR: { min: 0.5, max: 0.8, score: 70 },
  NEEDS_FOCUS: { min: 0.2, max: 0.5, score: 50 },
  POOR: { max: 0.2, score: 25 }
};

// Rangos de scoring para PR Size (líneas de código)
export const PR_SIZE_SCORING = {
  ELITE: { min: 50, max: 100, score: 100 },
  GOOD: { min: 100, max: 155, score: 85 },
  FAIR: { min: 155, max: 228, score: 70 },
  NEEDS_FOCUS: { min: 228, max: 300, score: 50 },
  POOR: { min: 300, score: 25 }
};

// Niveles de score generales
export const SCORE_LEVELS = {
  ELITE: { min: 85, max: 100, label: 'Elite', color: 'emerald' },
  GOOD: { min: 75, max: 84, label: 'Good', color: 'blue' },
  FAIR: { min: 60, max: 74, label: 'Fair', color: 'amber' },
  POOR: { min: 0, max: 59, label: 'Poor', color: 'rose' }
};

// Targets Q1 2026
export const Q1_2026_TARGETS = {
  DELIVERY_SUCCESS: 75,
  DEVELOPMENT_QUALITY: 80,
  TEAM_HEALTH: 70,
  CYCLE_TIME_HOURS: 72,
  PICKUP_TIME_HOURS: 4,
  CHANGE_FAILURE_RATE: 4,
  PLANNING_ACCURACY: { min: 65, max: 80 },
  NET_BUG_FLOW: 1.0,
  PR_SIZE_LINES: { min: 100, max: 155 }
};

// Alertas y condiciones críticas
export const ALERT_CONDITIONS = {
  KPI_POOR: 60,                    // KPI < 60 requiere acción urgente
  DECLINE_WEEKS: 2,                 // Declinación por 2 semanas consecutivas
  IMPROVEMENT_THRESHOLD: 5,          // Mejora > 5 puntos para celebrar
  CYCLE_TIME_CRITICAL: 96,          // Cycle Time > 96h requiere atención
  PICKUP_TIME_CRITICAL: 8,          // Pickup Time > 8h requiere atención
  CODING_TIME_CRITICAL: 8,         // Coding Time > 8h (PR muy grande)
  DEPLOY_TIME_CRITICAL: 48         // Deploy Time > 48h (problemas CI/CD)
};

