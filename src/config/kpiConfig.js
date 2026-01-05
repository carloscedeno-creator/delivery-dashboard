/**
 * Configuración de KPIs basada en el documento Delivery OKRS Plan
 * Define targets, thresholds, pesos y rangos de scoring
 * Updated: Q1 2026 according to Delivery OKRS Plan document
 */

// Pesos de componentes para Delivery Success Score
export const DELIVERY_SUCCESS_WEIGHTS = {
  CYCLE_TIME: 0.40,      // 40%
  DEPLOY_FREQUENCY: 0.30, // 30%
  PR_SIZE: 0.30          // 30%
};

// Pesos de componentes para Development Quality Score
export const DEVELOPMENT_QUALITY_WEIGHTS = {
  CHANGE_FAILURE_RATE: 0.50,  // 50%
  NET_BUG_FLOW: 0.30,          // 30%
  REWORK_RATE: 0.20            // 20%
};

// Pesos de componentes para Team Health Score
export const TEAM_HEALTH_WEIGHTS = {
  ENPS: 0.40,                  // 40%
  PLANNING_ACCURACY: 0.30,     // 30%
  CAPACITY_ACCURACY: 0.30      // 30%
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

// Rangos de scoring para Change Failure Rate (porcentaje)
export const CHANGE_FAILURE_RATE_SCORING = {
  ELITE: { max: 1, score: 100 },           // < 1% = Elite
  GOOD: { min: 1, max: 4, score: 85 },     // 1-4% = Good (Target)
  FAIR: { min: 4, max: 6, score: 70 },     // 4-6% = Fair
  NEEDS_FOCUS: { min: 6, max: 10, score: 50 }, // 6-10% = Needs Focus
  POOR: { min: 10, score: 25 }            // > 10% = Poor
};

// Rangos de scoring para Net Bug Flow (ratio: bugs resolved / bugs created)
export const NET_BUG_FLOW_SCORING = {
  ELITE: { min: 1.2, score: 100 },        // Ratio ≥ 1.2 = Elite
  GOOD: { min: 1.0, max: 1.2, score: 85 }, // Ratio 1.0-1.2 = Good (Target)
  FAIR: { min: 0.9, max: 1.0, score: 70 }, // Ratio 0.9-1.0 = Fair
  NEEDS_FOCUS: { min: 0.7, max: 0.9, score: 50 }, // Ratio 0.7-0.9 = Needs Focus
  POOR: { max: 0.7, score: 25 }           // Ratio < 0.7 = Poor
};

// Rangos de scoring para Rework Rate (porcentaje)
export const REWORK_RATE_SCORING = {
  ELITE: { max: 2, score: 100 },          // < 2% = Elite
  GOOD: { min: 2, max: 5, score: 85 },   // 2-5% = Good (Target: < 5%)
  FAIR: { min: 5, max: 8, score: 70 },    // 5-8% = Fair
  NEEDS_FOCUS: { min: 8, max: 12, score: 50 }, // 8-12% = Needs Focus
  POOR: { min: 12, score: 25 }           // > 12% = Poor
};

// Rangos de scoring para eNPS (Employee Net Promoter Score)
export const ENPS_SCORING = {
  ELITE: { min: 50, score: 100 },        // ≥ 50 = Elite
  GOOD: { min: 40, max: 50, score: 85 }, // 40-50 = Good (Target: > 40)
  FAIR: { min: 30, max: 40, score: 70 }, // 30-40 = Fair
  NEEDS_FOCUS: { min: 20, max: 30, score: 50 }, // 20-30 = Needs Focus
  POOR: { max: 20, score: 25 }          // < 20 = Poor
};

// Rangos de scoring para Planning Accuracy (porcentaje)
export const PLANNING_ACCURACY_SCORING = {
  ELITE: { min: 80, score: 100 },        // ≥ 80% = Elite
  GOOD: { min: 65, max: 80, score: 85 }, // 65-80% = Good (Target range)
  FAIR: { min: 60, max: 65, score: 70 }, // 60-65% = Fair
  NEEDS_FOCUS: { min: 50, max: 60, score: 50 }, // 50-60% = Needs Focus
  POOR: { max: 50, score: 25 }          // < 50% = Poor
};

// Rangos de scoring para Capacity Accuracy (porcentaje: actual / planned)
export const CAPACITY_ACCURACY_SCORING = {
  ELITE: { min: 0.95, max: 1.05, score: 100 }, // 95-105% = Elite (perfect planning)
  GOOD: { min: 0.85, max: 0.95, score: 85 },   // 85-95% = Good
  GOOD_OVER: { min: 1.05, max: 1.15, score: 85 }, // 105-115% = Good (slight overcommitment)
  FAIR: { min: 0.75, max: 0.85, score: 70 },    // 75-85% = Fair
  FAIR_OVER: { min: 1.15, max: 1.25, score: 70 }, // 115-125% = Fair (overcommitment)
  NEEDS_FOCUS: { min: 0.65, max: 0.75, score: 50 }, // 65-75% = Needs Focus
  NEEDS_FOCUS_OVER: { min: 1.25, max: 1.35, score: 50 }, // 125-135% = Needs Focus
  POOR: { max: 0.65, score: 25 },              // < 65% = Poor (underutilization)
  POOR_OVER: { min: 1.35, score: 25 }         // > 135% = Poor (severe overcommitment/burnout risk)
};

// Niveles de score generales
export const SCORE_LEVELS = {
  ELITE: { min: 85, max: 100, label: 'Elite', color: 'emerald' },
  GOOD: { min: 75, max: 84, label: 'Good', color: 'blue' },
  FAIR: { min: 60, max: 74, label: 'Fair', color: 'amber' },
  POOR: { min: 0, max: 59, label: 'Poor', color: 'rose' }
};

// Targets Q1 2026 (según Delivery OKRS Plan)
export const Q1_2026_TARGETS = {
  // Main KPIs (scores 0-100)
  DELIVERY_SUCCESS: 75,        // Target: > 75/100
  DEVELOPMENT_QUALITY: 80,      // Target: > 80/100
  TEAM_HEALTH: 70,              // Target: > 70/100
  
  // Component metrics
  CYCLE_TIME_HOURS: 72,         // Target: < 72 hours (Good range)
  PICKUP_TIME_HOURS: 4,         // Target: < 4 hours
  REVIEW_TIME_HOURS: 14,        // Target: < 14 hours
  DEPLOY_TIME_HOURS: 24,        // Target: < 24 hours
  CHANGE_FAILURE_RATE: 4,       // Target: < 4%
  NET_BUG_FLOW: 1.0,            // Target: Ratio ≥ 1.0 (Positive)
  REWORK_RATE: 5,               // Target: < 5%
  PLANNING_ACCURACY: { min: 65, max: 80 }, // Target: 65-80%
  CAPACITY_ACCURACY: { min: 0.85, max: 1.15 }, // Target: 85-115% (avoid burnout)
  ENPS: 40,                     // Target: > 40
  PR_SIZE_LINES: { min: 100, max: 155 }, // Target: 100-155 lines (Good range)
  DEPLOY_FREQUENCY_PER_DAY: 0.8 // Target: 0.8-1.5 deploys/day (Good range)
};

// Alertas y condiciones críticas (según Delivery OKRS Plan)
export const ALERT_CONDITIONS = {
  // KPI Score thresholds
  KPI_POOR: 60,                    // KPI < 60 requiere acción urgente
  DECLINE_WEEKS: 2,                 // Declinación por 2 semanas consecutivas requiere monitoreo
  IMPROVEMENT_THRESHOLD: 5,          // Mejora > 5 puntos para celebrar
  
  // Cycle Time alerts
  CYCLE_TIME_CRITICAL: 96,          // Cycle Time > 96h requiere atención (Phase 2 target)
  PICKUP_TIME_CRITICAL: 8,          // Pickup Time > 8h requiere atención (Phase 2 target)
  PICKUP_TIME_ALERT: 16,            // Pickup Time > 16h = problema de colaboración
  CODING_TIME_CRITICAL: 8,          // Coding Time > 8h = PR muy grande (máximo 200 líneas)
  REVIEW_TIME_CRITICAL: 24,         // Review Time > 24h = PRs muy complejos o pocos reviewers
  DEPLOY_TIME_CRITICAL: 48,         // Deploy Time > 48h = problemas CI/CD o pipeline lento
  
  // Quality alerts
  CHANGE_FAILURE_RATE_CRITICAL: 6,  // CFR > 6% requiere atención (Phase 2 target)
  CHANGE_FAILURE_RATE_FREEZE: 4,    // CFR > 4% = considerar congelar nuevas features
  
  // Planning alerts
  PLANNING_ACCURACY_MIN: 60,        // Planning Accuracy < 60% requiere atención (Phase 2 target)
  
  // Team Health alerts
  ENPS_MIN: 30,                     // eNPS < 30 requiere atención
  CAPACITY_BURNOUT_RISK: 1.15,      // Capacity > 115% = riesgo de burnout
  CAPACITY_UNDERUTILIZATION: 0.85    // Capacity < 85% = subutilización
};

