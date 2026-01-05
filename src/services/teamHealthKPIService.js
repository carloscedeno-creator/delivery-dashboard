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

      // Calculate eNPS manually
      const promoters = responses.filter(r => r.nps_score >= 9).length;
      const passives = responses.filter(r => r.nps_score >= 7 && r.nps_score < 9).length;
      const detractors = responses.filter(r => r.nps_score <= 6).length;
      const totalResponses = responses.length;
      
      const enpsValue = totalResponses > 0 
        ? ((promoters - detractors) / totalResponses) * 100 
        : 0;

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
 * @returns {Promise<Object>} Planning Accuracy data
 */
const calculatePlanningAccuracyFromMetrics = async (sprintId = null) => {
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
          planned_story_points,
          start_date,
          end_date
        )
      `)
      .order('calculated_at', { ascending: false });

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

      const plannedSP = sprint?.planned_story_points || metric.total_story_points || 0;
      const completedSP = metric.completed_story_points || 0;
      const addedSP = metric.added_story_points || 0;

      const effectivePlannedSP = plannedSP > 0 ? plannedSP : metric.total_story_points || 0;
      const percentage = effectivePlannedSP > 0 ? (completedSP / effectivePlannedSP) * 100 : 0;
      const score = calculatePlanningAccuracyScore(percentage);

      return {
        percentage: Math.round(percentage * 10) / 10,
        score,
        plannedSP,
        completedSP,
        addedSP
      };
    }

    // Calculate average from last 6 sprints
    const validMetrics = data.filter(metric => {
      const sprint = metric.sprints;
      const plannedSP = sprint?.planned_story_points || metric.total_story_points || 0;
      const completedSP = metric.completed_story_points || 0;
      const effectivePlannedSP = plannedSP > 0 ? plannedSP : metric.total_story_points || 0;
      return effectivePlannedSP > 0; // Only include sprints with valid planned SP
    });

    if (validMetrics.length === 0) {
      return null;
    }

    // Calculate average Planning Accuracy from last 6 sprints
    let totalPlannedSP = 0;
    let totalCompletedSP = 0;
    let totalAddedSP = 0;
    const percentages = [];

    validMetrics.forEach(metric => {
      const sprint = metric.sprints;
      const plannedSP = sprint?.planned_story_points || metric.total_story_points || 0;
      const completedSP = metric.completed_story_points || 0;
      const addedSP = metric.added_story_points || 0;
      
      const effectivePlannedSP = plannedSP > 0 ? plannedSP : metric.total_story_points || 0;
      
      if (effectivePlannedSP > 0) {
        totalPlannedSP += effectivePlannedSP;
        totalCompletedSP += completedSP;
        totalAddedSP += addedSP;
        
        const sprintPercentage = (completedSP / effectivePlannedSP) * 100;
        percentages.push(sprintPercentage);
      }
    });

    if (percentages.length === 0) {
      return null;
    }

    // Calculate average percentage (average of individual sprint percentages, not total)
    const avgPercentage = percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const score = calculatePlanningAccuracyScore(avgPercentage);

    console.log(`[TEAM_HEALTH_KPI] Planning Accuracy calculated from last ${validMetrics.length} sprints (average: ${avgPercentage.toFixed(1)}%)`);

    return {
      percentage: Math.round(avgPercentage * 10) / 10,
      score,
      plannedSP: Math.round(totalPlannedSP / validMetrics.length), // Average planned SP
      completedSP: Math.round(totalCompletedSP / validMetrics.length), // Average completed SP
      addedSP: Math.round(totalAddedSP / validMetrics.length) // Average added SP
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
 * @returns {Promise<Object>} Capacity Accuracy data
 */
const calculateCapacityAccuracyFromMetrics = async (sprintId = null) => {
  console.log('[TEAM_HEALTH_KPI] 🔍 calculateCapacityAccuracyFromMetrics called with sprintId:', sprintId);
  if (!supabase) {
    console.error('[TEAM_HEALTH_KPI] ❌ Supabase not initialized');
    return null;
  }

  try {
    // Import SP to hours converter
    const { convertSPToHours } = await import('../utils/spToHoursConverter');
    console.log('[TEAM_HEALTH_KPI] ✅ SP to hours converter imported');

    // Get sprint with dates
    let sprintQuery = supabase
      .from('sprints')
      .select('id, sprint_name, planned_capacity_hours, planned_story_points, start_date, end_date, squad_id')
      .order('end_date', { ascending: false })
      .limit(1);

    if (sprintId) {
      sprintQuery = sprintQuery.eq('id', sprintId);
    }

    const { data: sprints, error: sprintError } = await sprintQuery;
    console.log('[TEAM_HEALTH_KPI] Sprint query result:', { 
      sprintId, 
      foundSprints: sprints?.length || 0, 
      error: sprintError?.message || null 
    });

    if (sprintError || !sprints || sprints.length === 0) {
      console.warn('[TEAM_HEALTH_KPI] ❌ Error getting sprint:', sprintError);
      console.warn('[TEAM_HEALTH_KPI] Sprint query details:', { sprintId, error: sprintError });
      return null;
    }

    let sprint = sprints[0];
    
    // If sprint has null dates, try to find a sprint with valid dates
    if (!sprint.start_date || !sprint.end_date) {
      console.warn('[TEAM_HEALTH_KPI] ⚠️ Sprint has null dates, searching for sprint with valid dates...');
      console.warn('[TEAM_HEALTH_KPI] Sprint details:', { 
        id: sprint.id, 
        name: sprint.sprint_name, 
        start: sprint.start_date, 
        end: sprint.end_date 
      });
      
      // Try to find a sprint with valid dates (same squad if available)
      const squadIdFilter = sprint.squad_id ? { eq: sprint.squad_id } : {};
      let validSprintQuery = supabase
        .from('sprints')
        .select('id, sprint_name, planned_capacity_hours, planned_story_points, start_date, end_date, squad_id')
        .not('start_date', 'is', null)
        .not('end_date', 'is', null)
        .order('end_date', { ascending: false })
        .limit(1);
      
      if (sprint.squad_id) {
        validSprintQuery = validSprintQuery.eq('squad_id', sprint.squad_id);
      }
      
      const { data: validSprints, error: validSprintError } = await validSprintQuery;
      
      if (!validSprintError && validSprints && validSprints.length > 0) {
        sprint = validSprints[0];
        console.log('[TEAM_HEALTH_KPI] ✅ Found sprint with valid dates:', sprint.sprint_name);
      } else {
        console.warn('[TEAM_HEALTH_KPI] ⚠️ No sprints with valid dates found, will calculate without date filtering');
        // Continue with original sprint but use current date logic
      }
    }
    
    // If still no dates, we'll calculate using current issues only (no date filtering)
    const sprintStartDate = sprint.start_date ? new Date(sprint.start_date) : null;
    const sprintEndDate = sprint.end_date ? new Date(sprint.end_date) : null;
    const sprintName = sprint.sprint_name;
    console.log('[TEAM_HEALTH_KPI] ✅ Found sprint:', { 
      id: sprint.id, 
      name: sprintName, 
      start: sprint.start_date, 
      end: sprint.end_date,
      squadId: sprint.squad_id 
    });

    // Get squad sprint capacity (capacity available and goal)
    const { data: squadCapacity, error: capacityError } = await supabase
      .from('squad_sprint_capacity')
      .select('capacity_goal_sp, capacity_available_sp')
      .eq('sprint_id', sprint.id)
      .eq('squad_id', sprint.squad_id)
      .limit(1)
      .single();

    // Calculate available capacity (90% of capacity_available_sp or capacity_goal_sp)
    let availableCapacitySP = null;
    let availableCapacityHours = null;
    
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

    // Get previous sprint to detect carryover (only if we have valid dates)
    let previousSprint = null;
    if (sprint.start_date) {
      const { data: previousSprints, error: prevSprintError } = await supabase
        .from('sprints')
        .select('id, sprint_name, end_date')
        .eq('squad_id', sprint.squad_id)
        .lt('end_date', sprint.start_date)
        .not('end_date', 'is', null)
        .order('end_date', { ascending: false })
        .limit(1);
      
      if (!prevSprintError && previousSprints && previousSprints.length > 0) {
        previousSprint = previousSprints[0];
      }
    }

    // Get all issues that were in this sprint (by current_sprint)
    // Also try to get issues by squad_id if current_sprint doesn't match
    let { data: sprintIssues, error: issuesError } = await supabase
      .from('issues')
      .select('id, current_story_points, current_status, current_sprint, status_by_sprint, created_date, squad_id')
      .eq('current_sprint', sprintName)
      .not('current_story_points', 'is', null)
      .gt('current_story_points', 0);

    // If no issues found by current_sprint, try to get by squad and date range (only if we have dates)
    if ((!sprintIssues || sprintIssues.length === 0) && sprint.squad_id && sprintStartDate && sprintEndDate) {
      console.log('[TEAM_HEALTH_KPI] No issues found by current_sprint, trying by squad and date range...');
      const { data: squadIssues, error: squadIssuesError } = await supabase
        .from('issues')
        .select('id, current_story_points, current_status, current_sprint, status_by_sprint, created_date, squad_id')
        .eq('squad_id', sprint.squad_id)
        .not('current_story_points', 'is', null)
        .gt('current_story_points', 0)
        .gte('created_date', sprintStartDate.toISOString().split('T')[0])
        .lte('created_date', sprintEndDate.toISOString().split('T')[0]);
      
      if (!squadIssuesError && squadIssues && squadIssues.length > 0) {
        sprintIssues = squadIssues;
        console.log(`[TEAM_HEALTH_KPI] Found ${sprintIssues.length} issues by squad and date range`);
      }
    }

    if (issuesError) {
      console.warn('[TEAM_HEALTH_KPI] Error getting sprint issues:', issuesError);
      return null;
    }

    if (!sprintIssues || sprintIssues.length === 0) {
      console.warn('[TEAM_HEALTH_KPI] No issues found for sprint:', sprintName);
      console.warn('[TEAM_HEALTH_KPI] Debug info:', {
        sprintName,
        squadId: sprint.squad_id,
        startDate: sprint.start_date,
        endDate: sprint.end_date
      });
      return null;
    }

    console.log(`[TEAM_HEALTH_KPI] Found ${sprintIssues.length} issues for sprint ${sprintName}`);

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

    // Actual Capacity = Planned Capacity (what was planned at sprint start)
    // This represents the capacity that was committed/planned for the sprint
    const actualCapacity = finalPlannedCapacity;

    // Capacity Accuracy = Actual / Planned (ratio)
    const ratio = actualCapacity / finalPlannedCapacity;
    const score = calculateCapacityAccuracyScore(ratio);

    console.log(`[TEAM_HEALTH_KPI] ✅ Capacity Accuracy calculated: ${ratio.toFixed(2)} (Planned: ${finalPlannedCapacity}h, Actual: ${actualCapacity}h)`);
    console.log(`[TEAM_HEALTH_KPI]   Sprint: ${sprintName}`);
    console.log(`[TEAM_HEALTH_KPI]   Issues in capacity states: ${plannedIssues.length}`);
    console.log(`[TEAM_HEALTH_KPI]   Total SP: ${plannedSP}`);
    if (carryoverCapacity > 0) {
      console.log(`[TEAM_HEALTH_KPI]   Carryover: ${carryoverSP} SP (${carryoverCapacity}h)`);
    }

    return {
      value: Math.round(ratio * 100) / 100, // Round to 2 decimals
      score,
      plannedCapacity: Math.round(finalPlannedCapacity),
      actualCapacity: Math.round(actualCapacity),
      plannedSP,
      carryoverSP,
      carryoverCapacity: Math.round(carryoverCapacity),
      issuesCount: plannedIssues.length
    };
  } catch (error) {
    console.error('[TEAM_HEALTH_KPI] Error calculating Capacity Accuracy:', error);
    return null;
  }
};

/**
 * Gets Team Health KPI data from Supabase
 * @param {Object} options - Options for data retrieval
 * @returns {Promise<Object>} Team Health KPI data
 */
export const getTeamHealthKPIData = async (options = {}) => {
  const {
    projectKey = 'OBD',
    useMockData = false,
    sprintId = null,
    startDate = null,
    endDate = null,
    filters = {}
  } = options;

  // Extract filters
  const filterSprintId = filters.sprintId || sprintId;
  const filterStartDate = filters.startDate ? new Date(filters.startDate) : startDate;
  const filterEndDate = filters.endDate ? new Date(filters.endDate) : endDate;

  // If explicitly requested, use mock data (for testing only)
  if (useMockData) {
    console.log('[TEAM_HEALTH_KPI] Using mock data (explicitly requested)');
    return mockTeamHealthKPIData;
  }

  if (!supabase) {
    console.warn('[TEAM_HEALTH_KPI] Supabase not configured - no data available');
    return null;
  }

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

    // Calculate eNPS (with surveyId if available)
    let enps = await calculateENPSFromResponses(defaultStartDate, defaultEndDate, surveyIdForENPS);
    if (!enps) {
      console.warn('[TEAM_HEALTH_KPI] ⚠️ Could not calculate eNPS from enps_responses table');
      console.warn('[TEAM_HEALTH_KPI] This is expected if enps_responses table is empty or not connected to survey UI');
    } else {
      console.log('[TEAM_HEALTH_KPI] ✅ Using REAL data for eNPS');
    }

    // Calculate Planning Accuracy (use filter sprintId if provided)
    let planningAccuracy = await calculatePlanningAccuracyFromMetrics(filterSprintId);
    if (!planningAccuracy) {
      console.warn('[TEAM_HEALTH_KPI] ⚠️ Could not calculate Planning Accuracy from sprint_metrics');
      console.warn('[TEAM_HEALTH_KPI] Possible reasons: no sprint_metrics, no total_story_points/completed_story_points, or data not synced from Jira');
    } else {
      console.log('[TEAM_HEALTH_KPI] ✅ Using REAL data for Planning Accuracy');
      console.log(`[TEAM_HEALTH_KPI] Planning Accuracy: ${planningAccuracy.percentage}% (Planned: ${planningAccuracy.plannedSP}, Completed: ${planningAccuracy.completedSP})`);
    }

    // Calculate Capacity Accuracy (use filter sprintId if provided)
    console.log('[TEAM_HEALTH_KPI] Calling calculateCapacityAccuracyFromMetrics with sprintId:', filterSprintId);
    let capacityAccuracy = await calculateCapacityAccuracyFromMetrics(filterSprintId);
    console.log('[TEAM_HEALTH_KPI] Capacity Accuracy result:', capacityAccuracy);
    if (!capacityAccuracy) {
      console.warn('[TEAM_HEALTH_KPI] ⚠️ Could not calculate Capacity Accuracy from metrics');
      console.warn('[TEAM_HEALTH_KPI] Possible reasons: no planned_capacity_hours, no workload_sp, or data not synced from Jira');
    } else {
      console.log('[TEAM_HEALTH_KPI] ✅ Using REAL data for Capacity Accuracy');
      console.log(`[TEAM_HEALTH_KPI] Capacity Accuracy: ${capacityAccuracy.value} (Planned: ${capacityAccuracy.plannedCapacity}h, Actual: ${capacityAccuracy.actualCapacity}h)`);
    }

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

    // Generate trends (last 8 weeks)
    const trends = [];
    for (let i = 7; i >= 0; i--) {
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - (i * 7));
      const weekStart = new Date(weekDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Calculate metrics for this week (use null if not available)
      const weekENPS = await calculateENPSFromResponses(weekStart, weekEnd, surveyIdForENPS);
      const weekPlanning = await calculatePlanningAccuracyFromMetrics();
      const weekCapacity = await calculateCapacityAccuracyFromMetrics();

      // Use current period data if week data not available
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

    return {
      teamHealthScore,
      enps: enps || null,
      planningAccuracy: planningAccuracy || null,
      capacityAccuracy: capacityAccuracy || null,
      trends: trends.slice(0, 8)
    };
  } catch (error) {
    console.error('[TEAM_HEALTH_KPI] Error calculating Team Health KPIs:', error);
    console.warn('[TEAM_HEALTH_KPI] No data available due to error');
    return null;
  }
};

