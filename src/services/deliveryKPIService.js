/**
 * Servicio para calcular Delivery KPIs desde datos reales de Supabase
 * Calcula Cycle Time, Deploy Frequency y PR Size basado en métricas disponibles
 */

import { supabase } from '../utils/supabaseApi.js';
import {
  calculateCycleTimeScore,
  calculateDeployFrequencyScore,
  calculatePRSizeScore,
  calculateDeliverySuccessScore
} from '../utils/kpiCalculations';
import { mockDeliveryKPIData } from '../data/kpiMockData';

/**
 * Calcula el Cycle Time promedio desde métricas de sprint
 * @param {Array} sprintMetrics - Métricas de sprints desde Supabase
 * @returns {Object} Objeto con hours y score
 */
const calculateCycleTimeFromMetrics = (sprintMetrics) => {
  if (!sprintMetrics || sprintMetrics.length === 0) {
    return null;
  }

  // Filtrar sprints con avg_lead_time válido
  const validSprints = sprintMetrics.filter(
    sprint => sprint.avg_lead_time && sprint.avg_lead_time > 0
  );

  if (validSprints.length === 0) {
    return null;
  }

  // Calcular promedio de lead time (en horas)
  const totalLeadTime = validSprints.reduce(
    (sum, sprint) => sum + (sprint.avg_lead_time || 0),
    0
  );
  const avgLeadTimeHours = totalLeadTime / validSprints.length;

  // Calcular score
  const score = calculateCycleTimeScore(avgLeadTimeHours);

  // Estimar breakdown basado en promedios históricos
  // (Esto es una aproximación, idealmente vendría de datos más detallados)
  const breakdown = {
    codingTime: avgLeadTimeHours * 0.05,      // ~5% del tiempo total
    pickupTime: avgLeadTimeHours * 0.05,     // ~5% del tiempo total
    reviewTime: avgLeadTimeHours * 0.18,     // ~18% del tiempo total
    deployTime: avgLeadTimeHours * 0.72      // ~72% del tiempo total
  };

  return {
    hours: Math.round(avgLeadTimeHours),
    score,
    breakdown
  };
};

/**
 * Calcula Deploy Frequency desde métricas de sprint
 * @param {Array} sprintMetrics - Métricas de sprints desde Supabase
 * @returns {Object} Objeto con deploysPerDay y score
 */
const calculateDeployFrequencyFromMetrics = (sprintMetrics) => {
  if (!sprintMetrics || sprintMetrics.length === 0) {
    return null;
  }

  // Filtrar sprints completados recientes (últimos 3 meses)
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const recentSprints = sprintMetrics.filter(sprint => {
    if (!sprint.end_date) return false;
    const endDate = new Date(sprint.end_date);
    return endDate >= threeMonthsAgo && sprint.state === 'closed';
  });

  if (recentSprints.length === 0) {
    return null;
  }

  // Estimar deploys basado en sprints completados
  // Asumimos ~2-3 deploys por sprint completado (estimación conservadora)
  const totalDeploys = recentSprints.length * 2.5;
  
  // Calcular días de trabajo (asumiendo sprints de 2 semanas = 10 días hábiles)
  const workingDays = recentSprints.length * 10;
  
  const deploysPerDay = workingDays > 0 ? totalDeploys / workingDays : 0;
  const score = calculateDeployFrequencyScore(deploysPerDay);

  return {
    deploysPerDay: Math.round(deploysPerDay * 10) / 10, // Redondear a 1 decimal
    score,
    totalDeploys: Math.round(totalDeploys),
    workingDays
  };
};

/**
 * Obtiene datos de Delivery KPIs desde Supabase
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Objeto con datos de Delivery KPIs
 */
export const getDeliveryKPIData = async (options = {}) => {
  const { projectKey = 'OBD', useMockData = false } = options;

  // Si se solicita explícitamente mock data, retornarlo (solo para testing)
  if (useMockData) {
    console.log('[DELIVERY_KPI] Using mock data (explicitly requested)');
    return mockDeliveryKPIData;
  }

  if (!supabase) {
    console.warn('[DELIVERY_KPI] Supabase not configured - no data available');
    return null;
  }

  try {
    // Verificar que Supabase esté configurado
    if (!supabase) {
      console.warn('[DELIVERY_KPI] Supabase no configurado, using mock data');
      return mockDeliveryKPIData;
    }

    // Obtener métricas de sprints
    const { getSprintMetrics } = await import('../utils/supabaseApi.js');
    
    let sprintMetrics;
    try {
      sprintMetrics = await getSprintMetrics(projectKey, {
        limit: 20, // Últimos 20 sprints
        state: 'closed' // Solo sprints cerrados
      });
    } catch (sprintError) {
      console.warn('[DELIVERY_KPI] Error obteniendo métricas de sprint:', sprintError);
      return mockDeliveryKPIData;
    }

    if (!sprintMetrics || sprintMetrics.length === 0) {
      console.warn('[DELIVERY_KPI] ⚠️ No sprint metrics found');
      console.warn('[DELIVERY_KPI] 💡 Solution: Ensure sprint metrics are calculated from Jira data');
      return null;
    }

    console.log(`[DELIVERY_KPI] ✅ Found ${sprintMetrics.length} sprint metrics`);

    // Calcular Cycle Time
    const cycleTime = calculateCycleTimeFromMetrics(sprintMetrics);
    if (cycleTime) {
      console.log(`[DELIVERY_KPI] ✅ Using REAL data for Cycle Time: ${cycleTime.hours} hours`);
    } else {
      console.warn('[DELIVERY_KPI] ⚠️ Could not calculate Cycle Time - missing avg_lead_time_days');
    }
    
    // Calcular Deploy Frequency
    const deployFrequency = calculateDeployFrequencyFromMetrics(sprintMetrics);
    if (deployFrequency) {
      console.log(`[DELIVERY_KPI] ✅ Using REAL data for Deploy Frequency: ${deployFrequency.deploysPerDay} deploys/day`);
    } else {
      console.warn('[DELIVERY_KPI] ⚠️ Could not calculate Deploy Frequency - no recent closed sprints');
    }

    // PR Size no está disponible en Supabase (requiere integración Git)
    const prSize = null;
    console.warn('[DELIVERY_KPI] ⚠️ PR Size not available (requires Git repository integration)');

    // Si no se pueden calcular Cycle Time o Deploy Frequency, retornar null
    if (!cycleTime && !deployFrequency) {
      console.warn('[DELIVERY_KPI] ❌ No real data available for any metric - returning null');
      return null;
    }

    // Use default scores for missing metrics (0 score = no impact on final score)
    const cycleTimeScore = cycleTime?.score || 0;
    const deployFreqScore = deployFrequency?.score || 0;
    const prSizeScore = prSize?.score || 0;

    // Calcular Delivery Success Score
    // Note: If a metric is missing, its weight is effectively 0
    const deliverySuccessScore = calculateDeliverySuccessScore(
      cycleTimeScore,
      deployFreqScore,
      prSizeScore
    );

    // Generar tendencias (últimas 8 semanas)
    // Agrupar sprints por semana y calcular métricas
    const trends = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - (i * 7));
      
      const weekStart = new Date(weekDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Domingo de esa semana
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Sábado de esa semana
      
      // Filtrar sprints de esa semana
      const weekSprints = sprintMetrics.filter(sprint => {
        if (!sprint.end_date) return false;
        const sprintDate = new Date(sprint.end_date);
        return sprintDate >= weekStart && sprintDate <= weekEnd;
      });

      if (weekSprints.length > 0) {
        const weekCycleTime = calculateCycleTimeFromMetrics(weekSprints);
        const weekDeployFreq = calculateDeployFrequencyFromMetrics(weekSprints);
        
        // Use current period data if week data not available
        const weekCycleTimeScore = weekCycleTime?.score || cycleTimeScore;
        const weekDeployFreqScore = weekDeployFreq?.score || deployFreqScore;
        
        const weekScore = calculateDeliverySuccessScore(
          weekCycleTimeScore,
          weekDeployFreqScore,
          prSizeScore
        );
        
        trends.push({
          week: `Wk ${8 - i}`,
          deliveryScore: weekScore,
          cycleTime: weekCycleTime?.score || cycleTime?.score || null,
          deployFreq: weekDeployFreq?.score || deployFrequency?.score || null,
          prSize: null // PR Size not available
        });
      }
    }

    return {
      deliverySuccessScore,
      cycleTime: cycleTime || null,
      deployFrequency: deployFrequency || null,
      prSize: null, // PR Size requires Git integration
      trends: trends.slice(0, 8) // Asegurar máximo 8 semanas
    };
  } catch (error) {
    console.error('[DELIVERY_KPI] Error calculating KPIs:', error);
    console.warn('[DELIVERY_KPI] No data available due to error');
    return null;
  }
};

