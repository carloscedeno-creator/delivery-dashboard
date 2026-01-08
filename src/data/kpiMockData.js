/**
 * Datos mock para desarrollo y testing de KPIs
 * Basado en el documento Delivery OKRS Plan
 */

// Datos mock para Delivery KPIs
export const mockDeliveryKPIData = {
  // Score principal
  deliverySuccessScore: 78,
  
  // Métricas componentes
  cycleTime: {
    hours: 68,
    score: 85,
    breakdown: {
      codingTime: 3.5,    // horas
      pickupTime: 3.2,    // horas
      reviewTime: 12.5,  // horas
      deployTime: 18.8    // horas
    }
  },
  
  deployFrequency: {
    deploysPerDay: 1.2,
    score: 85,
    totalDeploys: 24,
    workingDays: 20
  },
  
  prSize: {
    averageLines: 125,
    score: 85,
    totalPRs: 45,
    distribution: [
      { range: '50-100', count: 12 },
      { range: '100-155', count: 20 },
      { range: '155-228', count: 10 },
      { range: '228+', count: 3 }
    ]
  },
  
  // Tendencias (últimas 8 semanas)
  trends: [
    { week: 'Wk 1', deliveryScore: 72, cycleTime: 85, deployFreq: 80, prSize: 75 },
    { week: 'Wk 2', deliveryScore: 74, cycleTime: 85, deployFreq: 82, prSize: 78 },
    { week: 'Wk 3', deliveryScore: 73, cycleTime: 83, deployFreq: 81, prSize: 80 },
    { week: 'Wk 4', deliveryScore: 75, cycleTime: 84, deployFreq: 83, prSize: 82 },
    { week: 'Wk 5', deliveryScore: 76, cycleTime: 85, deployFreq: 84, prSize: 83 },
    { week: 'Wk 6', deliveryScore: 77, cycleTime: 85, deployFreq: 85, prSize: 84 },
    { week: 'Wk 7', deliveryScore: 78, cycleTime: 85, deployFreq: 85, prSize: 85 },
    { week: 'Wk 8', deliveryScore: 78, cycleTime: 85, deployFreq: 85, prSize: 85 }
  ]
};

// Datos mock para escenario "Good"
export const mockGoodScenario = {
  deliverySuccessScore: 82,
  cycleTime: { hours: 65, score: 85 },
  deployFrequency: { deploysPerDay: 1.3, score: 85 },
  prSize: { averageLines: 120, score: 85 }
};

// Datos mock para escenario "Fair" (necesita mejora)
export const mockFairScenario = {
  deliverySuccessScore: 68,
  cycleTime: { hours: 88, score: 70 },
  deployFrequency: { deploysPerDay: 0.6, score: 70 },
  prSize: { averageLines: 180, score: 70 }
};

// Datos mock para escenario "Poor" (requiere atención urgente)
export const mockPoorScenario = {
  deliverySuccessScore: 55,
  cycleTime: { hours: 110, score: 50 },
  deployFrequency: { deploysPerDay: 0.3, score: 50 },
  prSize: { averageLines: 250, score: 50 }
};

// Datos mock para Quality KPIs
export const mockQualityKPIData = {
  developmentQualityScore: 82, // Will be calculated
  changeFailureRate: {
    percentage: 3.2,
    totalDeploys: 150,
    failedDeploys: 5
  },
  netBugFlow: {
    value: 1.05, // Ratio: bugs resolved / bugs created (target: ≥ 1.0)
    bugsCreated: 25,
    bugsResolved: 26
  },
  reworkRate: {
    percentage: 3.5, // Percentage of work that needs to be redone (target: < 5%)
    totalTasks: 200,
    reworkedTasks: 7
  },
  trends: [
    { week: 'Wk 1', qualityScore: 78, changeFailure: 4.0, planningAcc: 68, bugFlow: 0.9 },
    { week: 'Wk 2', qualityScore: 79, changeFailure: 3.8, planningAcc: 70, bugFlow: 0.85 },
    { week: 'Wk 3', qualityScore: 80, changeFailure: 3.5, planningAcc: 71, bugFlow: 0.82 },
    { week: 'Wk 4', qualityScore: 81, changeFailure: 3.3, planningAcc: 72, bugFlow: 0.80 },
    { week: 'Wk 5', qualityScore: 81, changeFailure: 3.2, planningAcc: 72, bugFlow: 0.80 },
    { week: 'Wk 6', qualityScore: 82, changeFailure: 3.2, planningAcc: 72, bugFlow: 0.80 },
    { week: 'Wk 7', qualityScore: 82, changeFailure: 3.2, planningAcc: 72, bugFlow: 0.80 },
    { week: 'Wk 8', qualityScore: 82, changeFailure: 3.2, planningAcc: 72, bugFlow: 0.80 }
  ]
};

// Datos mock para Team Health KPIs
export const mockTeamHealthKPIData = {
  teamHealthScore: 75, // Will be calculated
  enps: {
    value: 42, // Employee Net Promoter Score (target: > 40)
    surveyResponses: 18,
    promoters: 10,
    detractors: 4,
    passives: 4
  },
  planningAccuracy: {
    percentage: 72, // Percentage of planned work completed (target: 65-80%)
    plannedSP: 200,
    completedSP: 144,
    addedSP: 20
  },
  capacityAccuracy: {
    ratio: 0.95, // Actual capacity / Planned capacity (target: 0.85-1.15 to avoid burnout)
    actualHours: 380,
    plannedHours: 400
  },
  trends: [
    { week: 'Wk 1', healthScore: 72, completion: 85, velocity: 42, satisfaction: 4.0 },
    { week: 'Wk 2', healthScore: 73, completion: 86, velocity: 43, satisfaction: 4.1 },
    { week: 'Wk 3', healthScore: 74, completion: 87, velocity: 44, satisfaction: 4.15 },
    { week: 'Wk 4', healthScore: 74, completion: 87, velocity: 45, satisfaction: 4.2 },
    { week: 'Wk 5', healthScore: 75, completion: 88, velocity: 45, satisfaction: 4.2 },
    { week: 'Wk 6', healthScore: 75, completion: 88, velocity: 46, satisfaction: 4.2 },
    { week: 'Wk 7', healthScore: 75, completion: 88, velocity: 46, satisfaction: 4.2 },
    { week: 'Wk 8', healthScore: 75, completion: 88, velocity: 46, satisfaction: 4.2 }
  ]
};

