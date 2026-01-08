/**
 * Service for calculating Team Health KPIs from Supabase
 * Calculates eNPS, Planning Accuracy, and Capacity Accuracy
 */

import { supabase } from '../utils/supabaseApi.js';
import {
  calculateENPSScore,
  calculatePlanningAccuracyScore,
  calculateCapacityAccuracyScore,
  calculateTeamHealthScore
} from '../utils/kpiCalculations';
import { mockTeamHealthKPIData } from '../data/kpiMockData';

/**
 * Generates mock eNPS data for demonstration purposes
 * @returns {Object} Mock eNPS data with positive value
 */
const generateMockENPSData = () => {
  // Generate realistic mock data: 8 promoters, 2 passives, 1 detractor
  const promoters = 8;
  const passives = 2;
  const detractors = 1;
  const totalResponses = promoters + passives + detractors;
  const enpsValue = ((promoters - detractors) / totalResponses) * 100;
  const score = calculateENPSScore(enpsValue);

  return {
    value: enpsValue,
    score: score,
    promoters: promoters,
    passives: passives,
    detractors: detractors,
    totalResponses: totalResponses,
    isMock: true // Flag to indicate this is mock data
  };
};

/**
 * Calculates completed story points for multiple sprints in parallel, including "DEVELOPMENT DONE" status
 * Uses sprint IDs instead of names to avoid URL encoding issues
 * @param {Array<string>} sprintIds - Array of sprint IDs
 * @returns {Promise<Map<string, number>>} Map of sprint_id -> completed story points
 */
const calculateCompletedStoryPointsBatch = async (sprintIds) => {
  if (!supabase || !sprintIds || sprintIds.length === 0) {
    return new Map();
  }

  try {
    // Get sprint names first
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, sprint_name')
      .in('id', sprintIds);

    if (sprintsError || !sprints || sprints.length === 0) {
      console.warn(`[TEAM_HEALTH_KPI] Error fetching sprints for batch calculation:`, sprintsError);
      return new Map();
    }

    // Create map of sprint_id -> sprint_name (only sprints with "Sprint" in name)
    const sprintIdToName = new Map();
    const sprintNames = [];
    sprints.forEach(sprint => {
      if (sprint.sprint_name && sprint.sprint_name.includes('Sprint')) {
        sprintIdToName.set(sprint.id, sprint.sprint_name);
        sprintNames.push(sprint.sprint_name);
      }
    });

    if (sprintNames.length === 0) {
      return new Map();
    }

    // Query all issues for all sprints in one query
    const { data: allIssues, error: issuesError } = await supabase
      .from('issues')
      .select('current_story_points, current_status, current_sprint, status_by_sprint, issue_key')
      .in('current_sprint', sprintNames);

    if (issuesError) {
      console.warn(`[TEAM_HEALTH_KPI] Error fetching issues for sprints:`, issuesError);
      return new Map();
    }

    if (!allIssues || allIssues.length === 0) {
      return new Map();
    }

    // Group by sprint_id and filter completed issues
    const completedSPBySprintId = new Map();
    
    // Initialize map with zeros
    sprintIds.forEach(sprintId => {
      completedSPBySprintId.set(sprintId, 0);
    });

    // Create reverse map: sprint_name -> sprint_id
    const sprintNameToId = new Map();
    sprintIdToName.forEach((name, id) => {
      sprintNameToId.set(name, id);
    });

    // Process issues and sum story points for completed ones
    // Use historical status at sprint end when available (following Google Sheets logic)
    allIssues.forEach(issue => {
      if (!issue.current_sprint) return;

      const sprintId = sprintNameToId.get(issue.current_sprint);
      if (!sprintId) return;

      const sprintName = issue.current_sprint;
      let statusForCompletion = (issue.current_status || '').trim().toUpperCase();

      // Use historical status if available (Google Sheets approach)
      if (issue.status_by_sprint && typeof issue.status_by_sprint === 'object') {
        const historicalStatus = issue.status_by_sprint[sprintName];
        if (historicalStatus) {
          statusForCompletion = historicalStatus.trim().toUpperCase();
          console.log(`[TEAM_HEALTH_KPI] Using historical status for ${issue.issue_key} in ${sprintName}: "${statusForCompletion}"`);
        }
      } else if (typeof issue.status_by_sprint === 'string') {
        try {
          const statusHistory = JSON.parse(issue.status_by_sprint);
          const historicalStatus = statusHistory[sprintName];
          if (historicalStatus) {
            statusForCompletion = historicalStatus.trim().toUpperCase();
            console.log(`[TEAM_HEALTH_KPI] Using parsed historical status for ${issue.issue_key} in ${sprintName}: "${statusForCompletion}"`);
          }
        } catch (e) {
          console.warn(`[TEAM_HEALTH_KPI] Error parsing status_by_sprint for ${issue.issue_key}:`, e.message);
        }
      }

      const isCompleted = statusForCompletion === 'DONE' ||
                         statusForCompletion === 'DEVELOPMENT DONE' ||
                         statusForCompletion.includes('DEVELOPMENT DONE') ||
                         statusForCompletion.includes('DEV DONE') ||
                         (statusForCompletion.includes('DONE') && !statusForCompletion.includes('TO DO') && !statusForCompletion.includes('TODO')) ||
                         statusForCompletion === 'CLOSED' ||
                         statusForCompletion === 'RESOLVED' ||
                         statusForCompletion === 'COMPLETED';

      if (isCompleted) {
        const currentSP = completedSPBySprintId.get(sprintId) || 0;
        completedSPBySprintId.set(sprintId, currentSP + (issue.current_story_points || 0));
        console.log(`[TEAM_HEALTH_KPI] Issue ${issue.issue_key} counted as completed in ${sprintName}: ${issue.current_story_points} SP`);
      }
    });

    return completedSPBySprintId;
  } catch (error) {
    console.error(`[TEAM_HEALTH_KPI] Error calculating completed story points batch:`, error);
    return new Map();
  }
};

/**
 * Calculates completed story points for a single sprint, including "DEVELOPMENT DONE" status
 * @param {string} sprintId - Sprint ID
 * @returns {Promise<number>} Total completed story points
 */
const calculateCompletedStoryPoints = async (sprintId) => {
  if (!supabase || !sprintId) {
    return 0;
  }

  try {
    // Use batch function for single sprint (more efficient)
    const completedSPMap = await calculateCompletedStoryPointsBatch([sprintId]);
    const completedSP = completedSPMap.get(sprintId) || 0;

    return completedSP;
  } catch (error) {
    console.error(`[TEAM_HEALTH_KPI] Error calculating completed story points for sprint ${sprintId}:`, error);
    return 0;
  }
};

/**
 * Calculates eNPS from enps_responses table
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @param {string} surveyId - Optional survey ID to filter by specific survey
 * @returns {Promise<Object>} eNPS data
 */
const calculateENPSFromResponses = async (startDate, endDate, surveyId = null) => {
  if (!supabase) {
    return null;
  }

  try {
    // If surveyId is provided, filter responses by survey_id
    if (surveyId) {
      const { data: responses, error: responsesError } = await supabase
        .from('enps_responses')
        .select('nps_score')
        .eq('survey_id', surveyId)
        .gte('survey_date', startDate.toISOString().split('T')[0])
        .lte('survey_date', endDate.toISOString().split('T')[0]);

      if (responsesError) {
        console.warn('[TEAM_HEALTH_KPI] Error getting survey responses:', responsesError);
        return null;
      }

      if (!responses || responses.length === 0) {
        return null;
      }

      // Log actual response values for debugging
      const responseScores = responses.map(r => r.nps_score);
      const sortedScores = [...responseScores].sort((a, b) => a - b);
      const averageScore = responseScores.reduce((sum, score) => sum + score, 0) / responseScores.length;
      
      console.log('[TEAM_HEALTH_KPI] 📊 eNPS Response Analysis:');
      console.log('  Total Responses:', responses.length);
      console.log('  Individual Scores:', sortedScores.join(', '));
      console.log('  Average Score:', averageScore.toFixed(2));
      console.log('  Score Distribution:', {
        '9-10 (Promoters)': responseScores.filter(s => s >= 9).length,
        '7-8 (Passives)': responseScores.filter(s => s >= 7 && s < 9).length,
        '0-6 (Detractors)': responseScores.filter(s => s <= 6).length
      });
      console.log('  Detailed Breakdown:', {
        promoters: responseScores.filter(s => s >= 9),
        passives: responseScores.filter(s => s >= 7 && s < 9),
        detractors: responseScores.filter(s => s <= 6)
      });

      // Calculate eNPS manually
      const promoters = responses.filter(r => r.nps_score >= 9).length;
      const passives = responses.filter(r => r.nps_score >= 7 && r.nps_score < 9).length;
      const detractors = responses.filter(r => r.nps_score <= 6).length;
      const totalResponses = responses.length;
      
      const enpsValue = totalResponses > 0 
        ? ((promoters - detractors) / totalResponses) * 100 
        : 0;
      
      console.log('[TEAM_HEALTH_KPI] 📊 eNPS Calculation:', {
        promoters,
        passives,
        detractors,
        totalResponses,
        enpsValue: enpsValue.toFixed(2),
        calculation: `(${promoters} - ${detractors}) / ${totalResponses} × 100 = ${enpsValue.toFixed(2)}`
      });

      const score = calculateENPSScore(enpsValue);

      return {
        value: enpsValue,
        score,
        promoters,
        passives,
        detractors,
        totalResponses
      };
    }

    // Use the calculate_enps function from Supabase (for backward compatibility)
    const { data, error } = await supabase.rpc('calculate_enps', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    });

    if (error) {
      console.warn('[TEAM_HEALTH_KPI] Error calculating eNPS:', error);
      return null;
    }

    if (!data || data.length === 0 || data[0].total_responses === 0) {
      return null;
    }

    const result = data[0];
    const score = calculateENPSScore(result.enps_value);

    return {
      value: result.enps_value,
      score,
      promoters: result.promoters,
      passives: result.passives,
      detractors: result.detractors,
      totalResponses: result.total_responses
    };
  } catch (error) {
    console.error('[TEAM_HEALTH_KPI] Error calculating eNPS:', error);
    return null;
  }
};

/**
 * Calculates Planning Accuracy from sprint_metrics
 * Calculates average Planning Accuracy from the last 6 sprints
 * @param {string} sprintId - Sprint ID (optional, uses average of last 6 sprints if not provided)
 * @param {string} squadId - Squad ID (optional, filters by squad if provided)
 * @returns {Promise<Object>} Planning Accuracy data
 */
/**
 * Obtiene datos del burndown para un sprint si están disponibles
 * Esto nos da datos históricos precisos del progreso del sprint
 */
const getBurndownDataForSprint = async (sprintId) => {
  try {
    const { getSprintBurndownData } = await import('../utils/sprintBurndownApi.js');
    return await getSprintBurndownData(sprintId);
  } catch (error) {
    console.debug(`[TEAM_HEALTH_KPI] No burndown data available for sprint ${sprintId}:`, error.message);
    return null;
  }
};

const calculatePlanningAccuracyFromMetrics = async (sprintId = null, squadId = null) => {
  if (!supabase) {
    return null;
  }

  try {
    let query = supabase
      .from('sprint_metrics')
      .select(`
        *,
        sprints!inner(
          id,
          sprint_name,
          planned_story_points,
          start_date,
          end_date,
          squad_id
        )
      `)
      .order('calculated_at', { ascending: false });

    // Filter by squad if specified
    if (squadId) {
      query = query.eq('sprints.squad_id', squadId);
    }

    // IMPORTANT: Only consider sprints with "Sprint" in the name (exclude "Backlog" and other non-sprint values)
    query = query.ilike('sprints.sprint_name', '%Sprint%');

    // If specific sprint requested, use only that sprint
    if (sprintId) {
      query = query.eq('sprint_id', sprintId).limit(1);
    } else {
      // Otherwise, get last 6 sprints for average calculation
      query = query.limit(6);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[TEAM_HEALTH_KPI] Error getting sprint metrics:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    // If specific sprint requested, calculate for that sprint only
    if (sprintId && data.length === 1) {
      const metric = data[0];
      const sprint = metric.sprints;

      // Prefer Google-Sheets style calculations using sprint snapshot data in issues.status_by_sprint
      // This fixes closed sprints where issues may no longer have current_sprint = sprint_name
      const sprintName = sprint?.sprint_name;
      // IMPORTANT: Only consider sprints with "Sprint" in the name
      if (!sprintName || !sprintName.includes('Sprint')) {
        console.warn(`[TEAM_HEALTH_KPI] Sprint name "${sprintName}" does not contain "Sprint", skipping`);
        return null;
      }
      const squadIdForSprint = sprint?.squad_id || squadId;

      const parseStatusBySprint = (value) => {
        if (!value) return {};
        if (typeof value === 'object') return value;
        if (typeof value === 'string') {
          try { return JSON.parse(value); } catch { return {}; }
        }
        return {};
      };

      const isCompletedStatus = (status) => {
        if (!status) return false;
        const s = String(status).trim().toUpperCase();
        return s === 'DONE' ||
          s === 'DEVELOPMENT DONE' ||
          s.includes('DEVELOPMENT DONE') ||
          s.includes('DEV DONE') ||
          (s.includes('DONE') && !s.includes('TO DO') && !s.includes('TODO')) ||
          s === 'CLOSED' ||
          s === 'RESOLVED' ||
          s === 'COMPLETED';
      };

      // PRIORITY 1: Try to use burndown data if available (most accurate historical data)
      let burndownData = null;
      try {
        burndownData = await getBurndownDataForSprint(sprintId);
        if (burndownData && burndownData.totalCompleted !== undefined && burndownData.totalPlanned !== undefined) {
          console.log(`[TEAM_HEALTH_KPI] ✅ Using burndown data for Planning Accuracy (source: ${burndownData.dataSource || 'unknown'})`);
        }
      } catch (error) {
        console.debug(`[TEAM_HEALTH_KPI] Burndown data not available, using fallback calculation`);
      }

      // BEST source of truth: issue_sprints table (membership survives even if Sprint field later gets corrupted)
      // It also stores status_at_sprint_close which matches the "foto" concept.
      // PRIORITY: Always use issue_sprints for Planning Accuracy as it's more direct and accurate
      // Get sprint close date to filter out tickets removed before closure
      let sprintCloseDate = null;
      if (sprint) {
        sprintCloseDate = sprint.complete_date || sprint.end_date || null;
      } else if (sprintId) {
        // Fetch sprint to get close date
        const { data: sprintData } = await supabase
          .from('sprints')
          .select('complete_date, end_date')
          .eq('id', sprintId)
          .maybeSingle();
        if (sprintData) {
          sprintCloseDate = sprintData.complete_date || sprintData.end_date || null;
        }
      }
      
      // Initialize with burndown data as fallback, but prefer issue_sprints
      let plannedSP = burndownData?.totalPlanned || sprint?.planned_story_points || metric.total_story_points || 0;
      let completedSP = burndownData?.totalCompleted || metric.completed_story_points || 0;
      let calculatedFromIssueSprints = false;
      
      // Always try to calculate from issue_sprints first (most accurate for Planning Accuracy)
      try {
        const { data: issueSprintRows, error: issueSprintError } = await supabase
          .from('issue_sprints')
          .select('issue_id, sprint_id, status_at_sprint_close, story_points_at_start, story_points_at_close')
          .eq('sprint_id', sprintId)
          .limit(10000);

        if (!issueSprintError && issueSprintRows && issueSprintRows.length > 0) {
          const issueIds = issueSprintRows.map(r => r.issue_id).filter(Boolean);

          const { data: issues, error: issuesError } = await supabase
            .from('issues')
            .select('id, issue_key, current_story_points, current_status, story_points_by_sprint')
            .in('id', issueIds);

          if (!issuesError && issues && issues.length > 0) {
            const issuesById = new Map(issues.map(i => [i.id, i]));

            // PLANNING ACCURACY = (SP Cerrados / SP Totales al Final del Sprint) * 100
            // SP Totales al Final = suma de story_points_at_close de TODOS los tickets que estaban en el sprint al cierre
            // SP Cerrados = suma de story_points_at_close solo de los tickets completados
            // IMPORTANT: Solo incluir tickets que estaban en el sprint al momento del cierre
            // (status_at_sprint_close IS NOT NULL ya filtra esto)
            
            // Total SP al final del sprint = suma de story_points_at_close de todos los tickets
            plannedSP = issueSprintRows.reduce((sum, row) => {
              // Si status_at_sprint_close es null, el ticket fue removido antes del cierre, excluirlo
              if (!row.status_at_sprint_close && sprintCloseDate) {
                return sum;
              }
              
              // Usar story_points_at_close (SP al final del sprint)
              const spAtClose = Number(row.story_points_at_close) || 0;
              return sum + spAtClose;
            }, 0);

            // Completed SP = suma de story_points_at_close solo de los tickets completados
            completedSP = issueSprintRows.reduce((sum, row) => {
              // Si status_at_sprint_close es null, el ticket fue removido antes del cierre, excluirlo
              if (!row.status_at_sprint_close && sprintCloseDate) {
                return sum;
              }
              
              const statusAtClose = row.status_at_sprint_close;
              const isCompleted = isCompletedStatus(statusAtClose);
              if (!isCompleted) return sum;
              
              // Usar story_points_at_close para los completados
              const spAtClose = Number(row.story_points_at_close) || 0;
              return sum + spAtClose;
            }, 0);

            calculatedFromIssueSprints = true;
            console.log(`[TEAM_HEALTH_KPI] Planning Accuracy (sprint ${sprintName || sprintId}) from issue_sprints: Total SP at Close=${plannedSP}, Completed SP=${completedSP}, Links=${issueSprintRows.length}, Issues=${issues.length}`);
          }
        }
      } catch (e) {
        console.warn('[TEAM_HEALTH_KPI] Failed to calculate Planning Accuracy via issue_sprints (falling back to burndown):', e?.message || e);
        // If issue_sprints calculation failed, use burndown data if available
        if (burndownData && burndownData.totalCompleted !== undefined) {
          plannedSP = burndownData.totalPlanned || plannedSP;
          completedSP = burndownData.totalCompleted || completedSP;
          console.log(`[TEAM_HEALTH_KPI] Planning Accuracy (sprint ${sprintName || sprintId}) from burndown (fallback): Planned=${plannedSP}, Completed=${completedSP}`);
        }
      }

      // Only use issues snapshot fallback if we didn't successfully calculate from issue_sprints
      if (!calculatedFromIssueSprints && sprintName && squadIdForSprint) {
        const { data: squadIssues, error: squadIssuesError } = await supabase
          .from('issues')
          .select('id, issue_key, squad_id, current_sprint, current_story_points, current_status, status_by_sprint')
          .eq('squad_id', squadIdForSprint)
          .not('current_story_points', 'is', null)
          .gt('current_story_points', 0);

        if (!squadIssuesError && squadIssues) {
          const issuesInSprint = squadIssues.filter((issue) => {
            if (issue.current_sprint === sprintName) return true;
            const statusMap = parseStatusBySprint(issue.status_by_sprint);
            return Object.prototype.hasOwnProperty.call(statusMap, sprintName);
          });

          plannedSP = issuesInSprint.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
          completedSP = issuesInSprint.reduce((sum, i) => {
            const statusMap = parseStatusBySprint(i.status_by_sprint);
            const statusAtEnd = statusMap[sprintName] || i.current_status;
            return isCompletedStatus(statusAtEnd) ? sum + (i.current_story_points || 0) : sum;
          }, 0);

          console.log(`[TEAM_HEALTH_KPI] Planning Accuracy (sprint ${sprintName}) from issues snapshot (fallback): Planned=${plannedSP}, Completed=${completedSP}, Issues=${issuesInSprint.length}`);
        } else if (squadIssuesError) {
          console.warn('[TEAM_HEALTH_KPI] Could not fetch squad issues for Planning Accuracy:', squadIssuesError);
        }
      }

      // PLANNING ACCURACY = (SP Cerrados / SP Totales al Final del Sprint) * 100
      // No usamos carry over para el cálculo, solo para información adicional
      let carryOverCount = 0;
      
      // Get previous sprint to calculate carry over (solo para información, no para el cálculo)
      if (sprintName && squadIdForSprint) {
        const { data: previousSprintData } = await supabase
          .from('sprints')
          .select('id, sprint_name, end_date')
          .eq('squad_id', squadIdForSprint)
          .ilike('sprint_name', '%Sprint%')
          .lte('end_date', sprint.start_date || sprint.end_date || '9999-12-31')
          .order('end_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (previousSprintData) {
          // Carry Over = cantidad de tickets NO completados del sprint anterior
          const { data: previousSprintIssues, error: prevSprintError } = await supabase
            .from('issue_sprints')
            .select('status_at_sprint_close')
            .eq('sprint_id', previousSprintData.id)
            .not('status_at_sprint_close', 'is', null);
          
          if (!prevSprintError && previousSprintIssues) {
            const isCompletedStatusForCarryOver = (status) => {
              if (!status) return false;
              const s = String(status).trim().toUpperCase();
              return s === 'DONE' ||
                     s.includes('DEVELOPMENT DONE') ||
                     s.includes('DEV DONE') ||
                     s === 'CLOSED' ||
                     s === 'RESOLVED' ||
                     s === 'COMPLETED';
            };
            
            // Carry over = tickets NO completados (cantidad, no SP)
            carryOverCount = previousSprintIssues.filter(isp => 
              !isCompletedStatusForCarryOver(isp.status_at_sprint_close)
            ).length;
            
            console.log(`[TEAM_HEALTH_KPI] Carry over from ${previousSprintData.sprint_name}: ${carryOverCount} tickets NOT completed`);
          }
        }
      }
      
      // Planning Accuracy = (SP Cerrados / SP Totales al Final) * 100
      const percentage = plannedSP > 0 ? (completedSP / plannedSP) * 100 : (completedSP > 0 ? 100 : 0);
      const score = calculatePlanningAccuracyScore(percentage);

      console.log(`[TEAM_HEALTH_KPI] Planning Accuracy calculation: Total SP at Close=${plannedSP}, Completed SP=${completedSP}, Percentage=${percentage.toFixed(2)}%, Carry Over Tickets=${carryOverCount}`);

      return {
        percentage: Math.round(percentage * 10) / 10,
        score,
        plannedSP: plannedSP, // SP totales al final del sprint
        completedSP,
        carryOverSP: 0, // Carry over no se usa en el cálculo, solo carryOverCount para información
        carryOverCount,
        addedSP: 0 // Not used in Planning Accuracy
      };
    }

    // Calculate average from last 6 sprints
    // Try to enhance with burndown data if available
    const enhancedMetrics = await Promise.all(data.map(async (metric) => {
      const sprint = metric.sprints;
      let plannedSP = sprint?.planned_story_points || metric.total_story_points || 0;
      let completedSP = metric.completed_story_points || 0;
      
      // Try to get burndown data for more accurate metrics
      if (sprint?.id) {
        try {
          const burndown = await getBurndownDataForSprint(sprint.id);
          if (burndown && burndown.totalCompleted !== undefined && burndown.totalPlanned !== undefined) {
            plannedSP = burndown.totalPlanned;
            completedSP = burndown.totalCompleted;
          }
        } catch (error) {
          // Silently fall back to metric data
        }
      }
      
      return {
        ...metric,
        enhancedPlannedSP: plannedSP,
        enhancedCompletedSP: completedSP
      };
    }));
    
    const validMetrics = enhancedMetrics.filter(metric => {
      const plannedSP = metric.enhancedPlannedSP || metric.sprints?.planned_story_points || metric.total_story_points || 0;
      const completedSP = metric.enhancedCompletedSP || metric.completed_story_points || 0;
      const effectivePlannedSP = plannedSP > 0 ? plannedSP : metric.total_story_points || 0;
      return effectivePlannedSP > 0; // Only include sprints with valid planned SP
    });

    if (validMetrics.length === 0) {
      return null;
    }

    // Calculate average Planning Accuracy from last 6 sprints
    // Get sprint IDs for batch calculation (to include DEVELOPMENT DONE)
    const sprintIds = validMetrics.map(metric => metric.sprints?.id).filter(Boolean);
    
    // Get sprint names for planned SP calculation (same as Project Metrics logic)
    const sprintIdToName = new Map();
    const sprintNames = [];
    validMetrics.forEach(metric => {
      const sprint = metric.sprints;
      // IMPORTANT: Only consider sprints with "Sprint" in the name (exclude "Backlog" and other non-sprint values)
      if (sprint?.id && sprint?.sprint_name && sprint.sprint_name.includes('Sprint')) {
        sprintIdToName.set(sprint.id, sprint.sprint_name);
        if (!sprintNames.includes(sprint.sprint_name)) {
          sprintNames.push(sprint.sprint_name);
        }
      }
    });
    
    // Create reverse map: sprint_name -> sprint_id
    const sprintNameToId = new Map();
    sprintIdToName.forEach((name, id) => {
      sprintNameToId.set(name, id);
    });
    
    // Calculate completed SP for all sprints in parallel (ensures DEVELOPMENT DONE is included)
    const completedSPMap = sprintIds.length > 0 
      ? await calculateCompletedStoryPointsBatch(sprintIds)
      : new Map();
    
    console.log(`[TEAM_HEALTH_KPI] Calculated completed SP for ${sprintIds.length} sprints in batch (including DEVELOPMENT DONE)`);

    // PLANNING ACCURACY = (SP Cerrados / SP Totales al Final del Sprint) * 100
    // Para cada sprint, calcular desde issue_sprints usando story_points_at_close
    let totalCompletedSP = 0;
    let totalSPAtClose = 0;
    const percentages = [];
    
    const isCompletedStatusForBatch = (status) => {
      if (!status) return false;
      const s = String(status).trim().toUpperCase();
      return s === 'DONE' ||
             s.includes('DEVELOPMENT DONE') ||
             s.includes('DEV DONE') ||
             s === 'CLOSED' ||
             s === 'RESOLVED' ||
             s === 'COMPLETED';
    };

    // Calculate Planning Accuracy for each sprint using issue_sprints
    for (const metric of validMetrics) {
      const sprint = metric.sprints;
      const sprintId = sprint?.id;
      const sprintName = sprint?.sprint_name;
      
      if (!sprintId || !sprintName || !sprintName.includes('Sprint')) {
        continue; // Skip invalid sprints
      }

      // Get issue_sprints data for this sprint
      const { data: issueSprintRows, error: issueSprintError } = await supabase
        .from('issue_sprints')
        .select('status_at_sprint_close, story_points_at_close')
        .eq('sprint_id', sprintId)
        .not('status_at_sprint_close', 'is', null)
        .limit(10000);

      if (issueSprintError || !issueSprintRows || issueSprintRows.length === 0) {
        console.warn(`[TEAM_HEALTH_KPI] No issue_sprints data for sprint ${sprintName}, skipping`);
        continue;
      }

      // Total SP al final = suma de story_points_at_close de todos los tickets
      const sprintTotalSPAtClose = issueSprintRows.reduce((sum, row) => {
        return sum + (Number(row.story_points_at_close) || 0);
      }, 0);

      // Completed SP = suma de story_points_at_close solo de los completados
      const sprintCompletedSP = issueSprintRows.reduce((sum, row) => {
        const isCompleted = isCompletedStatusForBatch(row.status_at_sprint_close);
        if (!isCompleted) return sum;
        return sum + (Number(row.story_points_at_close) || 0);
      }, 0);

      // Planning Accuracy = (SP Cerrados / SP Totales al Final) * 100
      const sprintPercentage = sprintTotalSPAtClose > 0 
        ? (sprintCompletedSP / sprintTotalSPAtClose) * 100 
        : (sprintCompletedSP > 0 ? 100 : 0);
      
      if (sprintTotalSPAtClose > 0) {
        totalCompletedSP += sprintCompletedSP;
        totalSPAtClose += sprintTotalSPAtClose;
        percentages.push(sprintPercentage);
        
        console.log(`[TEAM_HEALTH_KPI] Sprint ${sprintName}: Total SP at Close=${sprintTotalSPAtClose}, Completed SP=${sprintCompletedSP}, Percentage=${sprintPercentage.toFixed(2)}%`);
      }
    }

    if (percentages.length === 0 || totalSPAtClose === 0) {
      if (totalCompletedSP === 0) {
        return null;
      }
      // If we have completed SP but no total SP, return 100%
      return {
        percentage: 100,
        score: calculatePlanningAccuracyScore(100),
        plannedSP: 0,
        completedSP: totalCompletedSP,
        carryOverSP: 0,
        addedSP: 0
      };
    }

    // Calculate overall percentage using total completed SP / total SP at close
    const totalPercentage = (totalCompletedSP / totalSPAtClose) * 100;
    const score = calculatePlanningAccuracyScore(totalPercentage);

    console.log(`[TEAM_HEALTH_KPI] Planning Accuracy calculated from last ${validMetrics.length} sprints (average: ${totalPercentage.toFixed(2)}%)`);
    console.log(`  Total Completed SP: ${totalCompletedSP}`);
    console.log(`  Total SP at Close: ${totalSPAtClose}`);
    console.log(`  Individual sprint percentages:`, percentages.map(p => p.toFixed(2)).join(', '));

    return {
      percentage: Math.round(totalPercentage * 10) / 10,
      score,
      plannedSP: totalSPAtClose, // SP totales al final del sprint (planificado)
      completedSP: totalCompletedSP,
      carryOverSP: 0, // Carry over no se usa en el cálculo, solo para información
      addedSP: 0 // Not used in Planning Accuracy
    };
  } catch (error) {
    console.error('[TEAM_HEALTH_KPI] Error calculating Planning Accuracy:', error);
    return null;
  }
};

/**
 * Calculates Capacity Accuracy based on issues with SP in "To Do", "Blocked", or "Reopen"
 * states at sprint start, considering carryover
 * @param {string} sprintId - Sprint ID (optional, uses most recent if not provided)
 * @param {string} squadId - Squad ID (optional, filters by squad if provided)
 * @returns {Promise<Object>} Capacity Accuracy data
 */
const calculateCapacityAccuracyFromMetrics = async (sprintId = null, squadId = null) => {
  console.log('[TEAM_HEALTH_KPI] 🔍 calculateCapacityAccuracyFromMetrics called with sprintId:', sprintId);
  if (!supabase) {
    console.error('[TEAM_HEALTH_KPI] ❌ Supabase not initialized');
    return null;
  }

  try {
    // Import SP to hours converter
    const { convertSPToHours } = await import('../utils/spToHoursConverter');
    console.log('[TEAM_HEALTH_KPI] ✅ SP to hours converter imported');

    // Strategy: Try to find the most appropriate sprint for capacity calculation
    let sprint = null;
    let sprintName = null;
    let sprintStartDate = null;
    let sprintEndDate = null;

    // PRIORITY: Try to use burndown data if available (most accurate historical data)
    let burndownData = null;
    if (sprintId) {
      try {
        burndownData = await getBurndownDataForSprint(sprintId);
        if (burndownData && burndownData.totalCompleted !== undefined) {
          console.log(`[TEAM_HEALTH_KPI] ✅ Using burndown data for Capacity Accuracy (source: ${burndownData.dataSource || 'unknown'})`);
        }
      } catch (error) {
        console.debug(`[TEAM_HEALTH_KPI] Burndown data not available for Capacity Accuracy, using fallback`);
      }
    }

    // 1. If specific sprint requested, use it
    if (sprintId) {
      const { data: specificSprint, error: specificError } = await supabase
        .from('sprints')
        .select('id, sprint_name, planned_capacity_hours, planned_story_points, start_date, end_date, squad_id')
        .eq('id', sprintId)
        .single();

      if (!specificError && specificSprint) {
        // IMPORTANT: Only consider sprints with "Sprint" in the name
        if (!specificSprint.sprint_name || !specificSprint.sprint_name.includes('Sprint')) {
          console.warn(`[TEAM_HEALTH_KPI] Sprint name "${specificSprint.sprint_name}" does not contain "Sprint", skipping`);
          return null;
        }
        sprint = specificSprint;
        sprintName = specificSprint.sprint_name;
        sprintStartDate = specificSprint.start_date ? new Date(specificSprint.start_date) : null;
        sprintEndDate = specificSprint.end_date ? new Date(specificSprint.end_date) : null;
        console.log('[TEAM_HEALTH_KPI] ✅ Using specific sprint:', sprintName);
      }
    }

    // 2. If no specific sprint, try to find the most recent sprint for the squad
    if (!sprint && squadId) {
      const { data: squadSprints, error: squadError } = await supabase
        .from('sprints')
        .select('id, sprint_name, planned_capacity_hours, planned_story_points, start_date, end_date, squad_id')
        .eq('squad_id', squadId)
        .ilike('sprint_name', '%Sprint%')
        .order('end_date', { ascending: false })
        .limit(1);

      if (!squadError && squadSprints && squadSprints.length > 0) {
        // IMPORTANT: Only consider sprints with "Sprint" in the name (already filtered in query, but double-check)
        const validSprint = squadSprints.find(s => s.sprint_name && s.sprint_name.includes('Sprint'));
        if (!validSprint) {
          console.warn('[TEAM_HEALTH_KPI] No valid sprints found (must contain "Sprint" in name)');
          return null;
        }
        sprint = validSprint;
        sprintName = sprint.sprint_name;
        sprintStartDate = sprint.start_date ? new Date(sprint.start_date) : null;
        sprintEndDate = sprint.end_date ? new Date(sprint.end_date) : null;
        console.log('[TEAM_HEALTH_KPI] ✅ Using most recent sprint for squad:', sprintName);
      }
    }

    // 3. If still no sprint found, we can still calculate capacity using current issues
    // This is valid - capacity can be calculated without a specific sprint context
    if (!sprint) {
      console.log('[TEAM_HEALTH_KPI] ℹ️ No sprint found, calculating capacity using current issues only');
      // sprintName remains null, which means we'll get all current issues for the squad
    }
    if (sprint) {
      console.log('[TEAM_HEALTH_KPI] ✅ Found sprint:', {
        id: sprint.id,
        name: sprintName,
        start: sprint.start_date,
        end: sprint.end_date,
        squadId: sprint.squad_id
      });
    } else {
      console.log('[TEAM_HEALTH_KPI] ℹ️ Calculating capacity without specific sprint context');
    }

    // Get squad sprint capacity (capacity available and goal)
    // Use maybeSingle() instead of single() to avoid 404 errors when no record exists
    let squadCapacity = null;
    let capacityError = null;

    // Only query if we have both sprint_id and squad_id
    const squadIdForCapacity = sprint?.squad_id || squadId;
    if (sprint?.id && squadIdForCapacity) {
      const capacityResult = await supabase
        .from('squad_sprint_capacity')
        .select('capacity_goal_sp, capacity_available_sp')
        .eq('sprint_id', sprint.id)
        .eq('squad_id', sprint.squad_id)
        .maybeSingle();
      
      squadCapacity = capacityResult.data;
      capacityError = capacityResult.error;
    }

    // Calculate available capacity (90% of capacity_available_sp or capacity_goal_sp)
    let availableCapacitySP = null;
    let availableCapacityHours = null;
    
    // Only log error if it's not a "not found" error (PGRST116, PGRST205, or 404)
    // PGRST116 = no rows found, PGRST205 = table not found
    // Suppress expected 404 errors silently
    if (capacityError && capacityError.code !== 'PGRST116' && capacityError.code !== 'PGRST205' && capacityError.code !== '42703') {
      console.warn('[TEAM_HEALTH_KPI] Error fetching squad sprint capacity:', capacityError);
    } else if (capacityError && capacityError.code === 'PGRST205') {
      // Table doesn't exist - this is expected if migrations haven't been run
      console.debug('[TEAM_HEALTH_KPI] squad_sprint_capacity table not found (PGRST205) - skipping capacity lookup');
    }
    
    if (!capacityError && squadCapacity) {
      // Use capacity_available_sp if available, otherwise capacity_goal_sp
      availableCapacitySP = squadCapacity.capacity_available_sp || squadCapacity.capacity_goal_sp;
      if (availableCapacitySP) {
        // Convert to hours using SP converter (sum of individual SP conversions)
        // Since we have total SP, we need to estimate average SP per ticket
        // For simplicity, we'll use a weighted average conversion
        // Better approach: convert each SP value individually if we had the distribution
        // For now, use average: assume mix of 1, 2, 3, 5 SP tickets
        // Average conversion: (4 + 8 + 16 + 32) / 4 = 15 hours per SP (rough estimate)
        // More accurate: use 6.4 hours per SP for values > 5, but for planning we'll use conservative estimate
        const totalSP = availableCapacitySP;
        // Estimate: convert assuming average ticket size of 3 SP (16 hours / 3 SP = ~5.3 hours/SP)
        // But to be safe, use the higher conversion rate
        availableCapacityHours = 0;
        // Simulate conversion: assume tickets are distributed
        // For now, use a conservative estimate: 5 hours per SP average
        // This will be refined when we have actual ticket distribution
        availableCapacityHours = totalSP * 5; // Conservative estimate
        // Apply 90% limit (capacity should be planned at max 90% of available)
        availableCapacityHours = availableCapacityHours * 0.9;
        console.log(`[TEAM_HEALTH_KPI] Available capacity: ${availableCapacitySP} SP = ${availableCapacityHours}h (90% limit applied)`);
      }
    }

    // Get previous sprint to detect carryover (only if we have a sprint with valid dates)
    let previousSprint = null;
    if (sprint && sprint.start_date) {
      const { data: previousSprints, error: prevSprintError } = await supabase
        .from('sprints')
        .select('id, sprint_name, end_date')
        .eq('squad_id', sprint.squad_id)
        .lte('end_date', sprint.start_date)
        .not('end_date', 'is', null)
        .order('end_date', { ascending: false })
        .limit(1);

      if (!prevSprintError && previousSprints && previousSprints.length > 0) {
        previousSprint = previousSprints[0];
      }
    }

    // If a specific sprint is provided, use issue_sprints as the source of truth for membership.
    // This survives cases where Jira's Sprint field was overwritten / trace lost.
    if (sprintId) {
      const { data: sprintRow, error: sprintRowError } = await supabase
        .from('sprints')
        .select('id, sprint_name, start_date, end_date, squad_id')
        .eq('id', sprintId)
        .single();

      if (sprintRowError || !sprintRow) {
        console.warn('[TEAM_HEALTH_KPI] Could not load sprint for Capacity Accuracy:', sprintRowError);
      } else {
        sprintName = sprintRow.sprint_name;
        sprintStartDate = sprintRow.start_date ? new Date(sprintRow.start_date) : null;
        sprintEndDate = sprintRow.end_date ? new Date(sprintRow.end_date) : null;
        sprint = { ...sprintRow }; // keep existing shape used below
      }

      const { data: issueSprintRows, error: issueSprintError } = await supabase
        .from('issue_sprints')
        .select('issue_id, sprint_id, status_at_sprint_close, story_points_at_start, story_points_at_close')
        .eq('sprint_id', sprintId)
        .limit(10000);

      if (!issueSprintError && issueSprintRows && issueSprintRows.length > 0) {
        const issueIds = issueSprintRows.map(r => r.issue_id).filter(Boolean);
        const { data: issues, error: issuesError } = await supabase
          .from('issues')
          .select('id, issue_key, current_story_points, current_status, story_points_by_sprint')
          .in('id', issueIds);

        if (!issuesError && issues && issues.length > 0) {
          const issuesById = new Map(issues.map(i => [i.id, i]));
          const parseJsonMap = (value) => {
            if (!value) return {};
            if (typeof value === 'object') return value;
            if (typeof value === 'string') {
              try { return JSON.parse(value); } catch { return {}; }
            }
            return {};
          };

          const isDoneLike = (status) => {
            if (!status) return false;
            const s = String(status).trim().toUpperCase();
            return s === 'DONE' ||
              s === 'DEVELOPMENT DONE' ||
              s.includes('DEVELOPMENT DONE') ||
              s.includes('DEV DONE') ||
              (s.includes('DONE') && !s.includes('TO DO') && !s.includes('TODO')) ||
              s === 'CLOSED' ||
              s === 'RESOLVED' ||
              s === 'COMPLETED';
          };

          // Get sprint close date to filter out tickets removed before closure
          let sprintCloseDate = null;
          if (sprint) {
            sprintCloseDate = sprint.complete_date || sprint.end_date || null;
          } else if (sprintId) {
            const { data: sprintData } = await supabase
              .from('sprints')
              .select('complete_date, end_date')
              .eq('id', sprintId)
              .maybeSingle();
            if (sprintData) {
              sprintCloseDate = sprintData.complete_date || sprintData.end_date || null;
            }
          }

          // Total SP al final del sprint (usar story_points_at_close)
          // IMPORTANT: Only include tickets that were actually in the sprint at closure
          const totalSPAtClose = issueSprintRows.reduce((sum, row) => {
            // If status_at_sprint_close is null and sprint has closed, the ticket was likely removed before sprint close
            // Skip it
            if (!row.status_at_sprint_close && sprintCloseDate) {
              return sum;
            }
            
            // Usar story_points_at_close (SP al final del sprint)
            const sp = Number(row.story_points_at_close) || 0;
            return sum + sp;
          }, 0);

          // Delivered SP = SP completados al final del sprint
          // PRIORITY: Use burndown data if available (most accurate historical data)
          let deliveredSP = 0;
          if (burndownData && burndownData.totalCompleted !== undefined) {
            deliveredSP = burndownData.totalCompleted;
            console.log(`[TEAM_HEALTH_KPI] ✅ Using burndown data for delivered SP: ${deliveredSP} SP`);
          } else {
            // Fallback: Calculate from issue_sprints
            // Use story_points_at_close (SP al final del sprint) for completed tickets
            // IMPORTANT: Only include tickets that were actually in the sprint at closure
            deliveredSP = issueSprintRows.reduce((sum, row) => {
              // If status_at_sprint_close is null and sprint has closed, the ticket was likely removed before sprint close
              // Skip it
              if (!row.status_at_sprint_close && sprintCloseDate) {
                return sum;
              }
              
              const isCompleted = isDoneLike(row.status_at_sprint_close);
              if (!isCompleted) return sum;
              
              // Use story_points_at_close (SP al final del sprint) for completed tickets
              const sp = Number(row.story_points_at_close) || 0;
              return sum + sp;
            }, 0);
          }

          // Total horas al final del sprint (usar story_points_at_close)
          const totalHoursAtClose = issueSprintRows.reduce((sum, row) => {
            // If status_at_sprint_close is null and sprint has closed, the ticket was likely removed before sprint close
            // Skip it
            if (!row.status_at_sprint_close && sprintCloseDate) {
              return sum;
            }
            
            // Usar story_points_at_close (SP al final del sprint)
            const sp = Number(row.story_points_at_close) || 0;
            return sum + convertSPToHours(sp);
          }, 0);

          // Delivered hours: Convert delivered SP to hours
          // PRIORITY: Use burndown data if available (most accurate historical data)
          let deliveredHours = 0;
          if (burndownData && burndownData.totalCompleted !== undefined) {
            // Convert delivered SP from burndown to hours
            // We need to estimate hours from total SP
            // For simplicity, use average conversion: 5 hours per SP (conservative estimate)
            deliveredHours = burndownData.totalCompleted * 5;
            console.log(`[TEAM_HEALTH_KPI] ✅ Using burndown data for delivered hours: ${deliveredHours}h (from ${burndownData.totalCompleted} SP)`);
          } else {
            // Fallback: Calculate from issue_sprints
            deliveredHours = issueSprintRows.reduce((sum, row) => {
              // If status_at_sprint_close is null and sprint has closed, the ticket was likely removed before sprint close
              // Skip it
              if (!row.status_at_sprint_close && sprintCloseDate) {
                return sum;
              }
              
              const isCompleted = isDoneLike(row.status_at_sprint_close);
              if (!isCompleted) return sum;
              
              // Use story_points_at_close (SP al final del sprint) for completed tickets
              const sp = Number(row.story_points_at_close) || 0;
              return sum + convertSPToHours(sp);
            }, 0);
          }

          // CAPACITY ACCURACY = SP Completados vs Capacidad Planificada (from squad_sprint_capacity)
          // Get planned capacity from squad_sprint_capacity table (PM enters this data)
          let plannedCapacitySP = null;
          let plannedCapacityHours = null;
          
          const squadIdForCapacity = sprint?.squad_id || squadId;
          if (sprintId && squadIdForCapacity) {
            const { data: squadCapacityData, error: capacityError } = await supabase
              .from('squad_sprint_capacity')
              .select('capacity_goal_sp, capacity_available_sp')
              .eq('sprint_id', sprintId)
              .eq('squad_id', squadIdForCapacity)
              .maybeSingle();
            
            if (!capacityError && squadCapacityData) {
              // Use capacity_goal_sp if available, otherwise capacity_available_sp
              plannedCapacitySP = squadCapacityData.capacity_goal_sp || squadCapacityData.capacity_available_sp || null;
              
              if (plannedCapacitySP) {
                // Convert SP to hours using the converter
                plannedCapacityHours = convertSPToHours(plannedCapacitySP);
                console.log(`[TEAM_HEALTH_KPI] Using planned capacity from squad_sprint_capacity: ${plannedCapacitySP} SP = ${plannedCapacityHours}h`);
              }
            } else if (capacityError && capacityError.code !== 'PGRST116' && capacityError.code !== 'PGRST205') {
              console.warn('[TEAM_HEALTH_KPI] Error fetching planned capacity:', capacityError);
            }
          }
          
          // If no planned capacity from squad_sprint_capacity, fall back to calculated total hours at close
          // But log a warning that PM should enter capacity data
          if (!plannedCapacityHours || plannedCapacityHours === 0) {
            console.warn(`[TEAM_HEALTH_KPI] ⚠️ No planned capacity found in squad_sprint_capacity for sprint ${sprintName || sprintId}. PM should enter capacity data in Team Capacity section. Falling back to calculated total hours at close.`);
            plannedCapacityHours = totalHoursAtClose;
            plannedCapacitySP = totalSPAtClose;
          }
          
          // Capacity Accuracy = Delivered SP / Planned Capacity
          const ratio = plannedCapacityHours > 0 ? deliveredHours / plannedCapacityHours : 0;
          const score = calculateCapacityAccuracyScore(ratio);

          console.log(`[TEAM_HEALTH_KPI] Capacity Accuracy (sprint ${sprintName || sprintId}): Delivered=${deliveredSP} SP (${deliveredHours}h) vs Planned Capacity=${plannedCapacitySP} SP (${plannedCapacityHours}h), Ratio=${ratio.toFixed(2)}`);

          return {
            value: Math.round(ratio * 100) / 100,
            score,
            plannedCapacity: Math.round(plannedCapacityHours),
            actualCapacity: Math.round(deliveredHours),
            plannedSP: plannedCapacitySP,
            completedSP: deliveredSP,
            carryoverSP: 0,
            carryoverCapacity: 0,
            issuesPlanned: issueSprintRows.filter(r => r.status_at_sprint_close || !sprintCloseDate).length, // Only tickets that reached sprint end
            issuesCompleted: issueSprintRows.filter(r => isDoneLike(r.status_at_sprint_close)).length
          };
        }
      }
      // If issue_sprints is empty, fall through to legacy logic below
      console.warn('[TEAM_HEALTH_KPI] issue_sprints had no rows for sprint; falling back to legacy capacity logic');
    }

    // Get issues based on available context - following Google Sheets logic
    let { data: sprintIssues, error: issuesError } = await (async () => {
      // Strategy: Get issues that were ever in this sprint (current_sprint contains sprint name)
      // OR issues from the squad if no specific sprint context
      if (squadId) {
        console.log('[TEAM_HEALTH_KPI] Getting issues for squad capacity calculation:', squadId);

        // Get all issues for the squad that have story points
        const { data: squadIssues, error: squadError } = await supabase
          .from('issues')
          .select('id, current_story_points, current_status, current_sprint, status_by_sprint, created_date, squad_id, issue_key')
          .eq('squad_id', squadId)
          .not('current_story_points', 'is', null)
          .gt('current_story_points', 0);

        if (squadError) {
          console.warn('[TEAM_HEALTH_KPI] Error getting squad issues:', squadError);
          return { data: null, error: squadError };
        }

        // If we have a specific sprint, filter to issues that were in that sprint.
        // IMPORTANT: Closed sprints often won't have current_sprint = sprintName anymore.
        // Use status_by_sprint keys as the source of truth (same "foto" concept as the Google Sheet).
        if (sprintName && squadIssues) {
          const parseStatusBySprint = (value) => {
            if (!value) return {};
            if (typeof value === 'object') return value;
            if (typeof value === 'string') {
              try { return JSON.parse(value); } catch { return {}; }
            }
            return {};
          };

          const filteredIssues = squadIssues.filter((issue) => {
            if (issue.current_sprint === sprintName) return true;
            const statusMap = parseStatusBySprint(issue.status_by_sprint);
            return Object.prototype.hasOwnProperty.call(statusMap, sprintName);
          });
          console.log(`[TEAM_HEALTH_KPI] Filtered ${filteredIssues.length} issues for sprint "${sprintName}" from ${squadIssues.length} squad issues`);
          return { data: filteredIssues, error: null };
        }

        // No specific sprint, return all squad issues for capacity calculation
        return { data: squadIssues, error: null };
      }

      // Fallback: should not happen with proper filtering
      console.warn('[TEAM_HEALTH_KPI] No squad context available for capacity calculation');
      return { data: null, error: null };
    })();

    if (issuesError) {
      console.warn('[TEAM_HEALTH_KPI] Error getting sprint issues:', issuesError);
      return null;
    }

    if (!sprintIssues || sprintIssues.length === 0) {
      console.warn('[TEAM_HEALTH_KPI] No issues found for capacity calculation');
      console.warn('[TEAM_HEALTH_KPI] Debug info:', {
        sprintName,
        squadId: squadId,
        hasSprint: !!sprint,
        sprintSquadId: sprint?.squad_id
      });
      return null;
    }

    console.log(`[TEAM_HEALTH_KPI] Found ${sprintIssues.length} issues for capacity calculation${sprintName ? ` (sprint: ${sprintName})` : ' (current capacity)'}`);

    // States to consider for capacity calculation
    // Match variations: "To Do", "TODO", "ToDo", "Blocked", "Reopen", "Re-open", etc.
    const capacityStates = ['To Do', 'Blocked', 'Reopen', 'TO DO', 'TODO', 'ToDo', 'to do'];
    const isCapacityState = (status) => {
      if (!status) return false;
      const statusUpper = status.toUpperCase().trim();
      // Check for exact matches or contains
      return capacityStates.some(state => {
        const stateUpper = state.toUpperCase();
        return statusUpper === stateUpper || 
               statusUpper.includes('TODO') ||
               statusUpper.includes('TO DO') ||
               statusUpper.includes('BLOCKED') ||
               statusUpper.includes('REOPEN') ||
               statusUpper.includes('RE-OPEN');
      });
    };

    // Debug: Log status distribution
    const statusDistribution = {};
    sprintIssues.forEach(issue => {
      const status = issue.current_status || 'Unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });
    console.log('[TEAM_HEALTH_KPI] Status distribution:', statusDistribution);

    // Calculate Planned Capacity: Issues with SP in capacity states at sprint start
    // We need to determine which issues were in capacity states (To Do, Blocked, Reopen) 
    // at the beginning of the sprint (start_date)
    const plannedIssues = sprintIssues.filter(issue => {
      const statusBySprint = issue.status_by_sprint || {};
      const createdDate = issue.created_date ? new Date(issue.created_date) : null;
      
      // Priority 1: Check status_by_sprint for this sprint (if available)
      // This should contain the status at sprint start
      const statusAtStart = statusBySprint[sprintName];
      if (statusAtStart) {
        const matches = isCapacityState(statusAtStart);
        if (matches) {
          console.log(`[TEAM_HEALTH_KPI] Issue ${issue.id} included via status_by_sprint: ${statusAtStart}`);
        }
        return matches;
      }
      
      // Priority 2: If we have sprint dates, check if issue was created before sprint start
      if (sprintStartDate && createdDate && createdDate < sprintStartDate) {
        if (isCapacityState(issue.current_status)) {
          console.log(`[TEAM_HEALTH_KPI] Issue ${issue.id} included (created before sprint, currently in capacity state): ${issue.current_status}`);
          return true;
        }
      }
      
      // Priority 3: If issue was created on or before sprint start date (within 2 days),
      // and is in capacity state, include it (likely planned for sprint)
      if (sprintStartDate && createdDate) {
        const daysDiff = (sprintStartDate - createdDate) / (1000 * 60 * 60 * 24);
        // Include if created up to 2 days before sprint start or on sprint start day
        if (daysDiff >= -2 && daysDiff <= 1 && isCapacityState(issue.current_status)) {
          console.log(`[TEAM_HEALTH_KPI] Issue ${issue.id} included (created near sprint start, in capacity state): ${issue.current_status}`);
          return true;
        }
      }
      
      // Priority 4: If no date info or no sprint dates, use current status
      // (fallback - less ideal but better than missing data)
      if (isCapacityState(issue.current_status)) {
        console.log(`[TEAM_HEALTH_KPI] Issue ${issue.id} included (currently in capacity state): ${issue.current_status}`);
        return true;
      }
      
      return false;
    });

    // Calculate Planned Capacity in hours
    let plannedSP = plannedIssues.reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);
    let plannedCapacity = plannedIssues.reduce((sum, issue) => {
      return sum + convertSPToHours(issue.current_story_points || 0);
    }, 0);

    console.log(`[TEAM_HEALTH_KPI] Planned issues breakdown:`, {
      totalIssues: sprintIssues.length,
      plannedIssues: plannedIssues.length,
      plannedSP,
      plannedCapacityHours: plannedCapacity,
      sampleIssues: plannedIssues.slice(0, 3).map(i => ({
        sp: i.current_story_points,
        status: i.current_status,
        created: i.created_date
      }))
    });

    // If no planned issues found, log detailed debug info
    if (plannedIssues.length === 0) {
      console.warn('[TEAM_HEALTH_KPI] ⚠️ No issues found in capacity states at sprint start');
      console.warn('[TEAM_HEALTH_KPI] Debug - Sample issues:', sprintIssues.slice(0, 5).map(i => ({
        id: i.id,
        sp: i.current_story_points,
        status: i.current_status,
        statusBySprint: i.status_by_sprint,
        created: i.created_date,
        sprintStart: sprintStartDate ? sprintStartDate.toISOString() : 'N/A'
      })));
    }

    // If we have available capacity from squad_sprint_capacity, use 90% of it as max planned
    // Planned Capacity should not exceed 90% of available capacity
    let finalPlannedCapacity = plannedCapacity;
    
    // Convert available capacity SP to hours using actual ticket distribution if possible
    if (availableCapacitySP && sprintIssues.length > 0) {
      // Calculate average conversion rate from actual issues
      const totalSPInSprint = sprintIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
      const totalHoursInSprint = sprintIssues.reduce((sum, i) => sum + convertSPToHours(i.current_story_points || 0), 0);
      const avgConversionRate = totalSPInSprint > 0 ? totalHoursInSprint / totalSPInSprint : 5;
      
      // Convert available capacity using average conversion rate
      availableCapacityHours = availableCapacitySP * avgConversionRate * 0.9; // 90% limit
      console.log(`[TEAM_HEALTH_KPI] Available capacity converted: ${availableCapacitySP} SP × ${avgConversionRate.toFixed(2)} hours/SP × 90% = ${availableCapacityHours.toFixed(0)}h`);
    }
    
    if (availableCapacityHours && plannedCapacity > availableCapacityHours) {
      console.log(`[TEAM_HEALTH_KPI] Planned capacity (${plannedCapacity}h) exceeds 90% limit (${availableCapacityHours}h), capping at 90%`);
      finalPlannedCapacity = availableCapacityHours;
    } else if (availableCapacityHours) {
      console.log(`[TEAM_HEALTH_KPI] Planned capacity (${plannedCapacity}h) is within 90% limit (${availableCapacityHours}h)`);
    }

    // If we have planned_capacity_hours set, use it as override (but still respect 90% limit)
    if (sprint.planned_capacity_hours) {
      finalPlannedCapacity = sprint.planned_capacity_hours;
      // Apply 90% limit if we have available capacity
      if (availableCapacityHours && finalPlannedCapacity > availableCapacityHours) {
        finalPlannedCapacity = availableCapacityHours;
        console.log('[TEAM_HEALTH_KPI] Using planned_capacity_hours but capping at 90% limit');
      } else {
        console.log('[TEAM_HEALTH_KPI] Using planned_capacity_hours from sprint as override');
      }
    }

    // If no planned issues found, try alternative approaches
    if (plannedIssues.length === 0) {
      console.warn('[TEAM_HEALTH_KPI] ⚠️ No issues found in capacity states. Trying alternative calculation...');
      
      // Alternative 1: Use all issues in sprint (if they have SP)
      const allIssuesWithSP = sprintIssues.filter(i => i.current_story_points && i.current_story_points > 0);
      if (allIssuesWithSP.length > 0) {
        console.log(`[TEAM_HEALTH_KPI] Trying alternative: using all ${allIssuesWithSP.length} issues with SP`);
        const altPlannedSP = allIssuesWithSP.reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);
        const altPlannedCapacity = allIssuesWithSP.reduce((sum, issue) => {
          return sum + convertSPToHours(issue.current_story_points || 0);
        }, 0);
        
        if (altPlannedCapacity > 0) {
          plannedSP = altPlannedSP;
          finalPlannedCapacity = altPlannedCapacity;
          console.log(`[TEAM_HEALTH_KPI] Using alternative calculation: ${altPlannedSP} SP = ${altPlannedCapacity}h`);
        }
      }
      
      // Alternative 2: Use available capacity as fallback
      if (finalPlannedCapacity === 0 && availableCapacityHours) {
        finalPlannedCapacity = availableCapacityHours;
        console.log('[TEAM_HEALTH_KPI] Using 90% of available capacity as fallback');
      }
      
      // If still no data, return null with detailed error
      if (finalPlannedCapacity === 0) {
        console.error('[TEAM_HEALTH_KPI] ❌ Cannot calculate Capacity Accuracy - missing data:');
        console.error(`  Issues in sprint: ${sprintIssues.length}`);
        console.error(`  Issues with SP: ${allIssuesWithSP.length}`);
        console.error(`  Issues in capacity states: ${plannedIssues.length}`);
        console.error(`  Available capacity SP: ${availableCapacitySP || 'NOT SET'}`);
        console.error(`  Sprint: ${sprintName} (${sprint.start_date} to ${sprint.end_date})`);
        console.error(`  Sample issues:`, sprintIssues.slice(0, 3).map(i => ({
          id: i.id,
          sp: i.current_story_points,
          status: i.current_status,
          created: i.created_date,
          statusBySprint: Object.keys(i.status_by_sprint || {})
        })));
        return null;
      }
    }

    if (!finalPlannedCapacity || finalPlannedCapacity === 0) {
      console.warn('[TEAM_HEALTH_KPI] Cannot calculate Capacity Accuracy - planned capacity is zero or missing');
      console.warn(`  Planned capacity: ${finalPlannedCapacity}`);
      console.warn(`  Issues in sprint: ${sprintIssues.length}`);
      console.warn(`  Issues in capacity states: ${plannedIssues.length}`);
      console.warn(`  Total SP planned: ${plannedSP}`);
      return null;
    }

    // Detect carryover: Issues that were in previous sprint and still in capacity states
    let carryoverSP = 0;
    let carryoverCapacity = 0;
    
    if (previousSprint && plannedIssues.length > 0) {
      const carryoverIssues = plannedIssues.filter(issue => {
        const statusBySprint = issue.status_by_sprint || {};
        const prevSprintStatus = statusBySprint[previousSprint.sprint_name];
        
        // If issue was in previous sprint and still in capacity state, it's carryover
        if (prevSprintStatus && isCapacityState(prevSprintStatus)) {
          return true;
        }
        
        // Also check if created before previous sprint end
        if (issue.created_date) {
          const createdDate = new Date(issue.created_date);
          const prevSprintEndDate = new Date(previousSprint.end_date);
          if (createdDate < prevSprintEndDate) {
            return isCapacityState(issue.current_status);
          }
        }
        
        return false;
      });

      carryoverSP = carryoverIssues.reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);
      carryoverCapacity = carryoverIssues.reduce((sum, issue) => {
        return sum + convertSPToHours(issue.current_story_points || 0);
      }, 0);
    }

    // Calculate Actual Capacity = Issues completed at sprint end (velocity)
    // Following Google Sheets logic: take snapshot at sprint end date
    const sprintEndDateSnapshot = sprintEndDate ? new Date(sprintEndDate) : (sprint.end_date ? new Date(sprint.end_date) : null);

    let actualCapacity = 0;
    let completedSPAtEnd = 0;
    let completedIssuesAtEnd = 0;

    if (sprintEndDateSnapshot) {
      // Calculate what was actually completed by sprint end (velocity)
      // This follows the Google Sheets approach of taking a "foto" at completeDate
      sprintIssues.forEach(issue => {
        const storyPoints = issue.current_story_points || 0;

        // Check if issue was completed by sprint end using historical status
        if (issue.status_by_sprint && sprintName) {
          try {
            const statusHistory = typeof issue.status_by_sprint === 'string'
              ? JSON.parse(issue.status_by_sprint)
              : issue.status_by_sprint;

            // Check status at sprint end (Google Sheets uses completeDate/endDate)
            const statusAtEnd = statusHistory[sprintName];
            if (statusAtEnd) {
              const statusUpper = statusAtEnd.toUpperCase().trim();
              const isCompletedAtEnd = ['DONE', 'DEVELOPMENT DONE', 'RESOLVED', 'CLOSED', 'COMPLETED'].includes(statusUpper);

              if (isCompletedAtEnd) {
                actualCapacity += convertSPToHours(storyPoints);
                completedSPAtEnd += storyPoints;
                completedIssuesAtEnd++;
                console.log(`[TEAM_HEALTH_KPI] Issue ${issue.issue_key} completed by sprint end: ${storyPoints} SP = ${convertSPToHours(storyPoints)}h`);
              }
            }
          } catch (e) {
            console.warn(`[TEAM_HEALTH_KPI] Error parsing status history for ${issue.issue_key}:`, e.message);
          }
        } else {
          // Fallback: use current status if no historical data
          const currentStatus = (issue.current_status || '').toUpperCase().trim();
          const isCompleted = ['DONE', 'DEVELOPMENT DONE', 'RESOLVED', 'CLOSED', 'COMPLETED'].includes(currentStatus);

          if (isCompleted) {
            actualCapacity += convertSPToHours(storyPoints);
            completedSPAtEnd += storyPoints;
            completedIssuesAtEnd++;
          }
        }
      });

      console.log(`[TEAM_HEALTH_KPI] Sprint end snapshot: ${completedIssuesAtEnd} issues completed, ${completedSPAtEnd} SP = ${actualCapacity}h`);
    } else {
      // No sprint end date available, use planned capacity as fallback
      console.warn('[TEAM_HEALTH_KPI] No sprint end date available, using planned capacity as actual capacity');
      actualCapacity = finalPlannedCapacity;
    }

    // Capacity Accuracy = Actual Delivered / Planned (ratio)
    // This measures how much of the planned capacity was actually utilized
    const ratio = finalPlannedCapacity > 0 ? actualCapacity / finalPlannedCapacity : 0;
    const score = calculateCapacityAccuracyScore(ratio);

    console.log(`[TEAM_HEALTH_KPI] ✅ Capacity Accuracy calculated: ${ratio.toFixed(2)} (Planned: ${finalPlannedCapacity}h, Delivered: ${actualCapacity}h)`);
    console.log(`[TEAM_HEALTH_KPI]   Sprint: ${sprintName}`);
    console.log(`[TEAM_HEALTH_KPI]   Issues planned: ${plannedIssues.length} (${plannedSP} SP)`);
    console.log(`[TEAM_HEALTH_KPI]   Issues completed by end: ${completedIssuesAtEnd} (${completedSPAtEnd} SP)`);
    if (carryoverCapacity > 0) {
      console.log(`[TEAM_HEALTH_KPI]   Carryover: ${carryoverSP} SP (${carryoverCapacity}h)`);
    }

    return {
      value: Math.round(ratio * 100) / 100, // Round to 2 decimals
      score,
      plannedCapacity: Math.round(finalPlannedCapacity),
      actualCapacity: Math.round(actualCapacity),
      plannedSP,
      completedSP: completedSPAtEnd,
      carryoverSP,
      carryoverCapacity: Math.round(carryoverCapacity),
      issuesPlanned: plannedIssues.length,
      issuesCompleted: completedIssuesAtEnd
    };
  } catch (error) {
    console.error('[TEAM_HEALTH_KPI] Error calculating Capacity Accuracy:', error);
    return null;
  }
};

// Simple in-memory cache to avoid repeated queries (5 minute TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Gets Team Health KPI data from Supabase
 * @param {Object} options - Options for data retrieval
 * @param {boolean} options.includeTrends - Whether to calculate detailed trends (default: false, uses simplified trends)
 * @param {boolean} options.useCache - Whether to use cache (default: true)
 * @returns {Promise<Object>} Team Health KPI data
 */
export const getTeamHealthKPIData = async (options = {}) => {
  const {
    projectKey = 'OBD',
    useMockData = false,
    sprintId = null,
    startDate = null,
    endDate = null,
    filters = {},
    includeTrends = false, // OPTIMIZATION: Default to false to avoid 24+ queries
    useCache = true
  } = options;
  
  // Check cache first (if enabled and no filters that would change results)
  if (useCache && !sprintId && !startDate && !endDate && !filters.squadId && Object.keys(filters).length === 0) {
    const cacheKey = 'teamHealthKPIData';
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[TEAM_HEALTH_KPI] ✅ Using cached data');
      return cached.data;
    }
  }

  // Extract filters
  const filterSprintId = filters.sprintId || sprintId;
  const filterStartDate = filters.startDate ? new Date(filters.startDate) : startDate;
  const filterEndDate = filters.endDate ? new Date(filters.endDate) : endDate;
  const filterSquadId = filters.squadId;

  // If explicitly requested, use mock data (for testing only)
  if (useMockData) {
    console.log('[TEAM_HEALTH_KPI] Using mock data (explicitly requested)');
    return mockTeamHealthKPIData;
  }

  if (!supabase) {
    console.warn('[TEAM_HEALTH_KPI] Supabase not configured - no data available');
    return null;
  }

  // Define current date for use throughout the function
  const now = new Date();

  try {
    // Get active survey for eNPS calculation (or use filters if surveyId provided)
    let surveyIdForENPS = null;
    if (filters.surveyId) {
      surveyIdForENPS = filters.surveyId;
    } else {
      // Try to get active survey
      try {
        const { getActiveSurvey } = await import('./enpsSurveyManagementService');
        const activeSurvey = await getActiveSurvey();
        if (activeSurvey) {
          surveyIdForENPS = activeSurvey.id;
        }
      } catch (importError) {
        console.warn('[TEAM_HEALTH_KPI] Could not get active survey:', importError);
      }
    }

    // Determine date range for eNPS (use filters if provided, or survey dates if survey is active)
    let defaultStartDate, defaultEndDate;
    
    if (surveyIdForENPS) {
      // Use survey dates if we have a survey
      try {
        const { getSurveyById } = await import('./enpsSurveyManagementService');
        const survey = await getSurveyById(surveyIdForENPS);
        if (survey) {
          defaultStartDate = new Date(survey.start_date);
          defaultEndDate = survey.end_date ? new Date(survey.end_date) : new Date();
        } else {
          const now = new Date();
          defaultStartDate = filterStartDate || new Date(now.getFullYear(), now.getMonth() - 3, 1);
          defaultEndDate = filterEndDate || now;
        }
      } catch (err) {
        const now = new Date();
        defaultStartDate = filterStartDate || new Date(now.getFullYear(), now.getMonth() - 3, 1);
        defaultEndDate = filterEndDate || now;
      }
    } else {
      const now = new Date();
      defaultStartDate = filterStartDate || new Date(now.getFullYear(), now.getMonth() - 3, 1);
      defaultEndDate = filterEndDate || now;
    }

    // OPTIMIZATION: Calculate all 3 main metrics in parallel for faster loading
    console.log('[TEAM_HEALTH_KPI] 🔍 Calculating all metrics in parallel...');
    
    const [enpsResult, planningAccuracyResult, capacityAccuracyResult] = await Promise.all([
      // Calculate eNPS
      (async () => {
        console.log('[TEAM_HEALTH_KPI] 🔍 Calculating eNPS with:', {
          startDate: defaultStartDate.toISOString().split('T')[0],
          endDate: defaultEndDate.toISOString().split('T')[0],
          surveyId: surveyIdForENPS
        });
        let enps = await calculateENPSFromResponses(defaultStartDate, defaultEndDate, surveyIdForENPS);
        
        // Use mock data if eNPS is 0 or very low (for better visualization)
        if (!enps || enps.value === 0 || (enps.value < 10 && enps.totalResponses < 10)) {
          if (!enps) {
            console.warn('[TEAM_HEALTH_KPI] ⚠️ Could not calculate eNPS from enps_responses table');
          } else {
            console.log('[TEAM_HEALTH_KPI] ℹ️ eNPS value is 0 or very low, using mock data');
          }
          enps = generateMockENPSData();
          console.log('[TEAM_HEALTH_KPI] 📊 Using MOCK data for eNPS');
        } else {
          console.log('[TEAM_HEALTH_KPI] ✅ Using REAL data for eNPS');
        }
        return enps;
      })(),
      
      // Calculate Planning Accuracy
      (async () => {
        const planningAccuracy = await calculatePlanningAccuracyFromMetrics(filterSprintId, filterSquadId);
        if (!planningAccuracy) {
          console.warn('[TEAM_HEALTH_KPI] ⚠️ Could not calculate Planning Accuracy');
        } else {
          console.log('[TEAM_HEALTH_KPI] ✅ Using REAL data for Planning Accuracy');
          console.log(`[TEAM_HEALTH_KPI] Planning Accuracy: ${planningAccuracy.percentage}%`);
        }
        return planningAccuracy;
      })(),

      // Calculate Capacity Accuracy
      (async () => {
        const capacityAccuracy = await calculateCapacityAccuracyFromMetrics(filterSprintId, filterSquadId);
        if (!capacityAccuracy) {
          console.warn('[TEAM_HEALTH_KPI] ⚠️ Could not calculate Capacity Accuracy');
        } else {
          console.log('[TEAM_HEALTH_KPI] ✅ Using REAL data for Capacity Accuracy');
          console.log(`[TEAM_HEALTH_KPI] Capacity Accuracy: ${capacityAccuracy.value}`);
        }
        return capacityAccuracy;
      })()
    ]);
    
    const enps = enpsResult;
    const planningAccuracy = planningAccuracyResult;
    const capacityAccuracy = capacityAccuracyResult;

    // If we don't have at least one real metric, return null (no data available)
    if (!enps && !planningAccuracy && !capacityAccuracy) {
      console.warn('[TEAM_HEALTH_KPI] ❌ No real data available for any metric - returning null');
      return null;
    }

    // Use default scores for missing metrics (0 score = no impact on final score)
    const enpsScore = enps?.score || 0;
    const planningScore = planningAccuracy?.score || 0;
    const capacityScore = capacityAccuracy?.score || 0;

    // Calculate Team Health Score
    // Note: If a metric is missing, its weight is effectively 0
    const teamHealthScore = calculateTeamHealthScore(
      enpsScore,
      planningScore,
      capacityScore
    );

    // Generate trends (simplified by default, detailed if requested)
    let trends = [];
    if (includeTrends) {
      // Detailed trends with historical data (24+ queries - slower but accurate)
      console.log('[TEAM_HEALTH_KPI] ⚠️ Calculating detailed trends (this may take longer)...');
      for (let i = 7; i >= 0; i--) {
        const weekDate = new Date(now);
        weekDate.setDate(weekDate.getDate() - (i * 7));
        const weekStart = new Date(weekDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        // Calculate metrics for this week
        const weekENPS = await calculateENPSFromResponses(weekStart, weekEnd, surveyIdForENPS);
        const weekPlanning = await calculatePlanningAccuracyFromMetrics();
        const weekCapacity = await calculateCapacityAccuracyFromMetrics();

        const weekENPSScore = weekENPS?.score || enpsScore;
        const weekPlanningScore = weekPlanning?.score || planningScore;
        const weekCapacityScore = weekCapacity?.score || capacityScore;

        const weekScore = calculateTeamHealthScore(
          weekENPSScore,
          weekPlanningScore,
          weekCapacityScore
        );

        trends.push({
          week: `Wk ${8 - i}`,
          healthScore: weekScore,
          enps: weekENPS?.value || enps?.value || null,
          planningAcc: weekPlanning?.percentage || planningAccuracy?.percentage || null,
          capacityAcc: weekCapacity?.value || capacityAccuracy?.value || null
        });
      }
    } else {
      // Simplified trends using current period data (fast, no additional queries)
      for (let i = 7; i >= 0; i--) {
        trends.push({
          week: `Wk ${8 - i}`,
          healthScore: teamHealthScore,
          enps: enps?.value || null,
          planningAcc: planningAccuracy?.percentage || null,
          capacityAcc: capacityAccuracy?.value || null
        });
      }
    }

    const result = {
      teamHealthScore,
      enps: enps || null,
      planningAccuracy: planningAccuracy || null,
      capacityAccuracy: capacityAccuracy || null,
      trends: trends.slice(0, 8)
    };
    
    // Cache result if applicable
    if (useCache && !sprintId && !startDate && !endDate && Object.keys(filters).length === 0) {
      const cacheKey = 'teamHealthKPIData';
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
    
    console.log('[TEAM_HEALTH_KPI] 📊 Final result being returned:', {
      teamHealthScore: result.teamHealthScore,
      hasEnps: !!result.enps,
      enpsValue: result.enps?.value,
      hasPlanningAccuracy: !!result.planningAccuracy,
      hasCapacityAccuracy: !!result.capacityAccuracy,
      trendsCount: result.trends.length,
      fromCache: false
    });
    
    return result;
  } catch (error) {
    console.error('[TEAM_HEALTH_KPI] Error calculating Team Health KPIs:', error);
    console.warn('[TEAM_HEALTH_KPI] No data available due to error');
    return null;
  }
};

