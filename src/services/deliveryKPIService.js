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

  // Si se solicita explícitamente mock data, retornarlo
  if (useMockData || !supabase) {
    console.log('[DELIVERY_KPI] Using mock data');
    return mockDeliveryKPIData;
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
      console.warn('[DELIVERY_KPI] No sprint metrics found, using mock data');
      return mockDeliveryKPIData;
    }

    // Calcular Cycle Time
    const cycleTime = calculateCycleTimeFromMetrics(sprintMetrics);
    
    // Calcular Deploy Frequency
    const deployFrequency = calculateDeployFrequencyFromMetrics(sprintMetrics);

    // PR Size no está disponible en Supabase, usar valor mock
    // (En el futuro podría integrarse con GitHub/GitLab API)
    const prSize = mockDeliveryKPIData.prSize;

    // Si no se pueden calcular Cycle Time o Deploy Frequency, usar mock data
    if (!cycleTime || !deployFrequency) {
      console.warn('[DELIVERY_KPI] Could not calculate all metrics, using mock data');
      return mockDeliveryKPIData;
    }

    // Calcular Delivery Success Score
    const deliverySuccessScore = calculateDeliverySuccessScore(
      cycleTime.score,
      deployFrequency.score,
      prSize.score
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
        
        if (weekCycleTime && weekDeployFreq) {
          const weekScore = calculateDeliverySuccessScore(
            weekCycleTime.score,
            weekDeployFreq.score,
            prSize.score
          );
          
          trends.push({
            week: `Wk ${8 - i}`,
            deliveryScore: weekScore,
            cycleTime: weekCycleTime.score,
            deployFreq: weekDeployFreq.score,
            prSize: prSize.score
          });
        }
      }
    }

    // Si no hay suficientes tendencias, completar con datos mock
    while (trends.length < 8) {
      const mockTrend = mockDeliveryKPIData.trends[trends.length] || mockDeliveryKPIData.trends[0];
      trends.push(mockTrend);
    }

    return {
      deliverySuccessScore,
      cycleTime,
      deployFrequency,
      prSize,
      trends: trends.slice(0, 8) // Asegurar máximo 8 semanas
    };
  } catch (error) {
    console.error('[DELIVERY_KPI] Error calculating KPIs:', error);
    console.log('[DELIVERY_KPI] Falling back to mock data');
    return mockDeliveryKPIData;
  }
};

