/**
 * Service for calculating Development Quality KPIs from Supabase
 * Calculates Change Failure Rate, Net Bug Flow, and Rework Rate
 */

import { supabase } from '../utils/supabaseApi.js';
import {
  calculateChangeFailureRateScore,
  calculateNetBugFlowScore,
  calculateReworkRateScore,
  calculateDevelopmentQualityScore
} from '../utils/kpiCalculations';
import { mockQualityKPIData } from '../data/kpiMockData';

/**
 * Calculates Change Failure Rate from deployments table
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @returns {Promise<Object>} Change Failure Rate data
 */
const calculateChangeFailureRateFromDeployments = async (startDate, endDate) => {
  if (!supabase) {
    return null;
  }

  try {
    // Query deployments for the period (production only)
    const { data: deployments, error } = await supabase
      .from('deployments')
      .select('id, deploy_date, status, environment')
      .eq('environment', 'production')
      .gte('deploy_date', startDate.toISOString())
      .lte('deploy_date', endDate.toISOString())
      .order('deploy_date', { ascending: false });

    if (error) {
      console.warn('[QUALITY_KPI] Error getting deployments:', error);
      return null;
    }

    if (!deployments || deployments.length === 0) {
      return null;
    }

    const totalDeploys = deployments.length;
    const failedDeploys = deployments.filter(d => d.status === 'failure' || d.status === 'rollback').length;
    const percentage = totalDeploys > 0 ? (failedDeploys / totalDeploys) * 100 : 0;
    const score = calculateChangeFailureRateScore(percentage);

    return {
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      score,
      totalDeploys,
      failedDeploys
    };
  } catch (error) {
    console.error('[QUALITY_KPI] Error calculating Change Failure Rate:', error);
    return null;
  }
};

/**
 * Calculates Net Bug Flow from issues table
 * @param {Date} startDate - Start date for the period
 * @param {Date} endDate - End date for the period
 * @returns {Promise<Object>} Net Bug Flow data
 */
const calculateNetBugFlowFromIssues = async (startDate, endDate) => {
  if (!supabase) {
    return null;
  }

  try {
    // Query bugs created and resolved in the period (using real Jira data)
    // First check if issue_type is populated
    const { data: sampleIssue, error: sampleError } = await supabase
      .from('issues')
      .select('issue_type')
      .limit(1)
      .single();

    if (sampleError || !sampleIssue || !sampleIssue.issue_type) {
      console.warn('[QUALITY_KPI] issue_type not populated in issues table - cannot calculate Net Bug Flow from real data');
      console.warn('[QUALITY_KPI] Sample error:', sampleError);
      console.warn('[QUALITY_KPI] Sample issue:', sampleIssue);
      return null;
    }

    // Query bugs created and resolved in the period (real Jira data)
    const { data: bugs, error } = await supabase
      .from('issues')
      .select('id, issue_type, created_date, resolved_date, current_status')
      .eq('issue_type', 'Bug')
      .gte('created_date', startDate.toISOString())
      .lte('created_date', endDate.toISOString());

    if (error) {
      console.warn('[QUALITY_KPI] Error getting bugs:', error);
      return null;
    }

    if (!bugs || bugs.length === 0) {
      return null;
    }

    // Count bugs created and resolved in the period
    const bugsCreated = bugs.filter(bug => {
      const created = bug.created_date ? new Date(bug.created_date) : null;
      return created && created >= startDate && created <= endDate;
    }).length;

    const bugsResolved = bugs.filter(bug => {
      const resolved = bug.resolved_date ? new Date(bug.resolved_date) : null;
      return resolved && resolved >= startDate && resolved <= endDate;
    }).length;

    const value = bugsCreated > 0 ? bugsResolved / bugsCreated : (bugsResolved > 0 ? 1.0 : 0);
    const score = calculateNetBugFlowScore(value);

    console.log(`[QUALITY_KPI] Net Bug Flow calculated from real data: ${bugsCreated} created, ${bugsResolved} resolved, ratio: ${value.toFixed(2)}`);

    return {
      value: Math.round(value * 100) / 100, // Round to 2 decimals
      score,
      bugsCreated,
      bugsResolved
    };
  } catch (error) {
    console.error('[QUALITY_KPI] Error calculating Net Bug Flow:', error);
    return null;
  }
};

/**
 * Calculates Rework Rate using the calculate_rework_rate function
 * @param {string} sprintId - Sprint ID (optional)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Rework Rate data
 */
const calculateReworkRateFromHistory = async (sprintId = null, startDate = null, endDate = null) => {
  if (!supabase) {
    return null;
  }

  try {
    // Use the calculate_rework_rate function from Supabase
    const { data, error } = await supabase.rpc('calculate_rework_rate', {
      p_sprint_id: sprintId,
      p_start_date: startDate ? startDate.toISOString().split('T')[0] : null,
      p_end_date: endDate ? endDate.toISOString().split('T')[0] : null
    });

    if (error) {
      console.warn('[QUALITY_KPI] Error calculating rework rate:', error);
      // Fallback: try to calculate manually if function doesn't exist
      return await calculateReworkRateManually(sprintId, startDate, endDate);
    }

    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    const score = calculateReworkRateScore(result.rework_rate_percentage);

    return {
      percentage: Math.round(result.rework_rate_percentage * 10) / 10,
      score,
      reworkedTickets: result.reworked_issues,
      totalTickets: result.total_issues
    };
  } catch (error) {
    console.error('[QUALITY_KPI] Error calculating Rework Rate:', error);
    return null;
  }
};

/**
 * Fallback: Calculate Rework Rate manually from issues
 * @param {string} sprintId - Sprint ID (optional)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Rework Rate data
 */
const calculateReworkRateManually = async (sprintId = null, startDate = null, endDate = null) => {
  // This is a simplified calculation - ideally use the Supabase function
  // For now, return null to use mock data
  return null;
};

/**
 * Gets Development Quality KPI data from Supabase
 * @param {Object} options - Options for data retrieval
 * @returns {Promise<Object>} Development Quality KPI data
 */
export const getQualityKPIData = async (options = {}) => {
  const { 
    projectKey = 'OBD', 
    useMockData = false,
    sprintId = null,
    startDate = null,
    endDate = null
  } = options;

  // If explicitly requested, use mock data (for testing only)
  if (useMockData) {
    console.log('[QUALITY_KPI] Using mock data (explicitly requested)');
    return mockQualityKPIData;
  }

  if (!supabase) {
    console.warn('[QUALITY_KPI] Supabase not configured - no data available');
    return null;
  }

  try {
    // Determine date range
    const now = new Date();
    const defaultStartDate = startDate || new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const defaultEndDate = endDate || now;

    // Calculate Change Failure Rate
    let changeFailureRate = await calculateChangeFailureRateFromDeployments(defaultStartDate, defaultEndDate);
    if (!changeFailureRate) {
      console.warn('[QUALITY_KPI] ⚠️ Could not calculate Change Failure Rate from deployments table');
      console.warn('[QUALITY_KPI] This is expected if deployments table is empty or not connected to CI/CD');
    } else {
      console.log('[QUALITY_KPI] ✅ Using REAL data for Change Failure Rate');
    }

    // Calculate Net Bug Flow
    let netBugFlow = await calculateNetBugFlowFromIssues(defaultStartDate, defaultEndDate);
    if (!netBugFlow) {
      console.warn('[QUALITY_KPI] ⚠️ Could not calculate Net Bug Flow from issues table');
      console.warn('[QUALITY_KPI] Possible reasons: issue_type not populated, no bugs in period, or data not synced from Jira');
    } else {
      console.log('[QUALITY_KPI] ✅ Using REAL data for Net Bug Flow');
    }

    // Calculate Rework Rate
    let reworkRate = await calculateReworkRateFromHistory(sprintId, defaultStartDate, defaultEndDate);
    if (!reworkRate) {
      console.warn('[QUALITY_KPI] ⚠️ Could not calculate Rework Rate from issue history');
      console.warn('[QUALITY_KPI] Possible reasons: calculate_rework_rate function not exists, status_by_sprint not populated, or no rework detected');
    } else {
      console.log('[QUALITY_KPI] ✅ Using REAL data for Rework Rate');
    }

    // If we don't have at least one real metric, return null (no data available)
    if (!changeFailureRate && !netBugFlow && !reworkRate) {
      console.warn('[QUALITY_KPI] ❌ No real data available for any metric - returning null');
      return null;
    }

    // Use default scores for missing metrics (0 score = no impact on final score)
    const cfrScore = changeFailureRate?.score || 0;
    const nbfScore = netBugFlow?.score || 0;
    const rrScore = reworkRate?.score || 0;

    // Calculate Development Quality Score
    // Note: If a metric is missing, its weight is effectively 0
    const developmentQualityScore = calculateDevelopmentQualityScore(
      cfrScore,
      nbfScore,
      rrScore
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
      const weekCFR = await calculateChangeFailureRateFromDeployments(weekStart, weekEnd);
      const weekNBF = await calculateNetBugFlowFromIssues(weekStart, weekEnd);
      const weekRR = await calculateReworkRateFromHistory(null, weekStart, weekEnd);

      // Use current period data if week data not available
      const weekCFRScore = weekCFR?.score || cfrScore;
      const weekNBFScore = weekNBF?.score || nbfScore;
      const weekRRScore = weekRR?.score || rrScore;

      const weekScore = calculateDevelopmentQualityScore(
        weekCFRScore,
        weekNBFScore,
        weekRRScore
      );

      trends.push({
        week: `Wk ${8 - i}`,
        qualityScore: weekScore,
        changeFailure: weekCFR?.percentage || changeFailureRate?.percentage || null,
        bugFlow: weekNBF?.value || netBugFlow?.value || null,
        reworkRate: weekRR?.percentage || reworkRate?.percentage || null
      });
    }

    return {
      developmentQualityScore,
      changeFailureRate: changeFailureRate || null,
      netBugFlow: netBugFlow || null,
      reworkRate: reworkRate || null,
      trends: trends.slice(0, 8)
    };
  } catch (error) {
    console.error('[QUALITY_KPI] Error calculating Development Quality KPIs:', error);
    console.warn('[QUALITY_KPI] No data available due to error');
    return null;
  }
};

