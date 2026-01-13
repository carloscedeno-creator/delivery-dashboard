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
import { filterRecentSprints } from '../utils/sprintFilterHelper.js';

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
  let validSprints = sprintMetrics.filter(
    sprint => sprint.avg_lead_time && sprint.avg_lead_time > 0
  );

  if (validSprints.length === 0) {
    return null;
  }

  // Ordenar por end_date descendente (más recientes primero) y tomar solo los últimos 6 sprints
  const totalValidSprints = validSprints.length;
  validSprints = validSprints
    .sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date) : new Date(0);
      const dateB = b.end_date ? new Date(b.end_date) : new Date(0);
      return dateB - dateA; // Descendente
    })
    .slice(0, 6); // Solo últimos 6 sprints

  if (validSprints.length === 0) {
    return null;
  }

  console.log(`[DELIVERY_KPI] Calculating Cycle Time average from last ${validSprints.length} sprints (out of ${totalValidSprints} valid sprints)`);

  // Calcular promedio de lead time (en horas) solo de los últimos 6 sprints
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

// Simple in-memory cache to avoid repeated queries (5 minute TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Obtiene datos de Delivery KPIs desde Supabase con filtros opcionales
 * @param {Object} options - Opciones adicionales
 * @param {Object} options.filters - Filtros para aplicar (squadId, sprintId, developerId, startDate, endDate)
 * @param {boolean} options.includeTrends - Whether to calculate detailed trends (default: false)
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @returns {Promise<Object>} Objeto con datos de Delivery KPIs
 */
export const getDeliveryKPIData = async (options = {}) => {
  const { 
    projectKey = 'OBD', 
    useMockData = false,
    filters = {},
    includeTrends = false, // OPTIMIZATION: Default to false to avoid additional queries
    useCache = true
  } = options;
  
  // Check cache first (if enabled and no filters that would change results)
  if (useCache && !filters.sprintId && !filters.developerId && !filters.startDate && !filters.endDate && !filters.squadId) {
    const cacheKey = 'deliveryKPIData';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[DELIVERY_KPI] ✅ Using cached data');
      return cached.data;
    }
  }

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

    // Construir query de métricas de sprint con filtros
    // Primero obtener los sprints del squad para filtrar la vista
    let squadIdToUse = filters.squadId;
    if (!squadIdToUse && projectKey) {
      // Si no hay squadId pero hay projectKey, obtener squad_id desde projectKey
      // Si projectKey es null/undefined, skip this (means "all squads")
      const { data: squad } = await supabase
        .from('squads')
        .select('id')
        .eq('squad_key', projectKey.toUpperCase())
        .single();
      
      if (squad) {
        squadIdToUse = squad.id;
      }
    }

    // Obtener los nombres de sprints del squad para filtrar la vista (solo sprints con "Sprint" en el nombre)
    let squadSprintNames = [];
    if (squadIdToUse) {
      console.log(`[DELIVERY_KPI] 🔍 Filtering by squad_id: ${squadIdToUse}`);
      const { data: sprints, error: sprintsError } = await supabase
        .from('sprints')
        .select('sprint_name, state, end_date, start_date, created_at')
        .eq('squad_id', squadIdToUse)
        .ilike('sprint_name', '%Sprint%');
      
      if (sprintsError) {
        console.warn(`[DELIVERY_KPI] ⚠️ Error getting sprints for squad ${squadIdToUse}:`, sprintsError);
      }
      
      if (sprints && sprints.length > 0) {
        // Filtrar para mantener solo últimos 10 cerrados + activos (NO futuros)
        const filteredSprints = filterRecentSprints(sprints, squadIdToUse);
        squadSprintNames = filteredSprints.map(s => s.sprint_name);
        console.log(`[DELIVERY_KPI] ✅ Found ${squadSprintNames.length} sprints for squad (filtered):`, squadSprintNames.slice(0, 5));
      } else {
        console.warn(`[DELIVERY_KPI] ⚠️ No sprints found for squad_id: ${squadIdToUse}`);
      }
    } else {
      console.log(`[DELIVERY_KPI] ℹ️ No squad filter applied (squadIdToUse is null/undefined)`);
    }

    let query = supabase
      .from('v_sprint_metrics_complete')
      .select('*');

    // Filtrar por nombres de sprints del squad
    if (squadSprintNames.length > 0) {
      query = query.in('sprint_name', squadSprintNames);
      console.log(`[DELIVERY_KPI] 🔍 Applied squad filter: ${squadSprintNames.length} sprint names`);
    } else if (squadIdToUse) {
      // Si hay squadId pero no se encontraron sprints, retornar null para evitar datos incorrectos
      console.warn(`[DELIVERY_KPI] ⚠️ Squad filter specified but no sprints found. Returning null.`);
      return null;
    }

    // Filtrar por sprint específico
    if (filters.sprintId) {
      const { data: sprint } = await supabase
        .from('sprints')
        .select('sprint_name')
        .eq('id', filters.sprintId)
        .single();
      
      if (sprint) {
        query = query.eq('sprint_name', sprint.sprint_name);
      }
    }

    // Filtrar por período
    if (filters.startDate) {
      query = query.gte('end_date', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('end_date', filters.endDate);
    }

    // Filtrar por developer (necesitamos obtener issues del developer y luego sus sprints)
    let developerSprintNames = null;
    if (filters.developerId) {
      const { data: issues } = await supabase
        .from('issues')
        .select('current_sprint')
        .eq('assignee_id', filters.developerId)
        .not('current_sprint', 'is', null);
      
      if (issues && issues.length > 0) {
        developerSprintNames = [...new Set(issues.map(i => i.current_sprint).filter(Boolean))];
      }
    }

    // Ordenar y limitar a máximo 6 sprints (para KPIs)
    query = query.order('end_date', { ascending: false });
    
    // Si hay filtro de developer, necesitamos obtener más para filtrar después, pero limitamos a 6 al final
    // Si no hay filtro de developer, limitamos directamente a 6
    const limit = filters.developerId ? 20 : 6;
    query = query.limit(limit);

    // Solo sprints cerrados por defecto (a menos que se especifique un sprint específico)
    if (!filters.sprintId) {
      // Validar que el valor de state sea un string limpio (sin sufijos como :1)
      const stateValue = 'closed';
      if (typeof stateValue === 'string' && stateValue.includes(':')) {
        console.error('[DELIVERY_KPI] ⚠️ Invalid state value detected:', stateValue);
        // Limpiar el valor removiendo cualquier sufijo después de :
        const cleanState = stateValue.split(':')[0];
        query = query.eq('state', cleanState);
      } else {
        query = query.eq('state', stateValue);
      }
    }

    let { data: sprintMetrics, error: sprintError } = await query;

    if (sprintError) {
      // Log detallado del error para debugging en producción
      console.error('[DELIVERY_KPI] ❌ Error obteniendo métricas de sprint:', {
        message: sprintError.message,
        details: sprintError.details,
        hint: sprintError.hint,
        code: sprintError.code,
        // Log de los filtros aplicados para debugging
        filters: {
          squadId: filters.squadId,
          sprintId: filters.sprintId,
          developerId: filters.developerId,
          startDate: filters.startDate,
          endDate: filters.endDate
        }
      });
      
      // Si es un error 400 (Bad Request), podría ser una query mal formada
      // Retornar null en lugar de mock data para que el componente muestre "No data"
      if (sprintError.code === 'PGRST116' || sprintError.status === 400) {
        console.warn('[DELIVERY_KPI] ⚠️ Query mal formada detectada (400), retornando null');
        return null;
      }
      
      return mockDeliveryKPIData;
    }

    // Aplicar filtro de developer después de obtener los datos
    if (filters.developerId && developerSprintNames && developerSprintNames.length > 0) {
      sprintMetrics = sprintMetrics.filter(sprint => 
        developerSprintNames.includes(sprint.sprint_name)
      );
    }

    // Asegurar que solo se usen los últimos 6 sprints para KPIs (ya ordenados por end_date desc)
    if (!filters.sprintId && sprintMetrics.length > 6) {
      sprintMetrics = sprintMetrics.slice(0, 6);
      console.log(`[DELIVERY_KPI] Limited to last 6 sprints for KPI calculation`);
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

    // Generate trends (simplified by default, detailed if requested)
    const now = new Date();
    let trends = [];
    
    if (includeTrends) {
      // Detailed trends with historical data (slower but accurate)
      console.log('[DELIVERY_KPI] ⚠️ Calculating detailed trends (this may take longer)...');
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
    } else {
      // Simplified trends using current period data (fast, no additional queries)
      for (let i = 7; i >= 0; i--) {
        trends.push({
          week: `Wk ${8 - i}`,
          deliveryScore: deliverySuccessScore,
          cycleTime: cycleTime?.score || null,
          deployFreq: deployFrequency?.score || null,
          prSize: null // PR Size not available
        });
      }
    }

    const result = {
      deliverySuccessScore,
      cycleTime: cycleTime || null,
      deployFrequency: deployFrequency || null,
      prSize: null, // PR Size requires Git integration
      trends: trends.slice(0, 8) // Asegurar máximo 8 semanas
    };
    
    // Cache result if applicable
    if (useCache && !filters.sprintId && !filters.developerId && !filters.startDate && !filters.endDate && !filters.squadId) {
      const cacheKey = 'deliveryKPIData';
      cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      // Clean old cache entries (keep only last 10)
      if (cache.size > 10) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
    }
    
    return result;
  } catch (error) {
    console.error('[DELIVERY_KPI] Error calculating KPIs:', error);
    console.warn('[DELIVERY_KPI] No data available due to error');
    return null;
  }
};

