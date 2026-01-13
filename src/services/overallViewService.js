/**
 * Service for Overall View Dashboard
 * Aggregates data from multiple sources to provide a unified overview
 */

import { supabase } from '../utils/supabaseApi.js';
import { getDeliveryKPIData } from './deliveryKPIService.js';
import { getQualityKPIData } from './qualityKPIService.js';
import { getTeamHealthKPIData } from './teamHealthKPIService.js';

/**
 * Get active sprints across all squads
 * @returns {Promise<Array>} Array of active sprints with squad info
 */
export const getActiveSprints = async () => {
  if (!supabase) {
    console.warn('[OVERALL_VIEW] Supabase not configured');
    return [];
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active sprints (state = 'active' or 'open')
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select(`
        id,
        sprint_name,
        start_date,
        end_date,
        state,
        squad_id,
        squads!inner(squad_name, squad_key)
      `)
      .in('state', ['active', 'open'])
      .ilike('sprint_name', '%Sprint%')
      .not('start_date', 'is', null)
      .not('end_date', 'is', null)
      .order('end_date', { ascending: true });

    if (sprintsError) {
      console.error('[OVERALL_VIEW] Error getting active sprints:', sprintsError);
      return [];
    }

    if (!sprints || sprints.length === 0) {
      return [];
    }

    // Enrich with capacity and metrics data
    const enrichedSprints = await Promise.all(
      sprints.map(async (sprint) => {
        // Get capacity data (use maybeSingle to handle missing records gracefully)
        // Note: sp_done does NOT exist in table - must use RPC function to calculate
        const { data: capacity, error: capacityError } = await supabase
          .from('squad_sprint_capacity')
          .select('capacity_goal_sp, capacity_available_sp')
          .eq('squad_id', sprint.squad_id)
          .eq('sprint_id', sprint.id)
          .maybeSingle();
        
        // Log error but don't fail - capacity data is optional
        if (capacityError && capacityError.code !== 'PGRST116') {
          console.warn(`[OVERALL_VIEW] Error fetching capacity for sprint ${sprint.id}:`, capacityError);
        }
        
        // Calculate sp_done using RPC function if capacity exists
        let spDone = 0;
        if (capacity && !capacityError) {
          try {
            const { data: spDoneData, error: rpcError } = await supabase
              .rpc('calculate_squad_sprint_sp_done', {
                p_squad_id: sprint.squad_id,
                p_sprint_id: sprint.id
              });
            
            if (!rpcError && spDoneData !== null && spDoneData !== undefined) {
              spDone = Number(spDoneData) || 0;
            }
          } catch (rpcErr) {
            // RPC function may not exist, use 0 as default
            console.debug(`[OVERALL_VIEW] RPC calculate_squad_sprint_sp_done not available for sprint ${sprint.id}, using 0`);
          }
        }
        
        // Add sp_done to capacity object (always set, even if 0)
        if (capacity) {
          capacity.sp_done = spDone;
        } else {
          // Create minimal capacity object if none exists
          capacity = { capacity_goal_sp: 0, capacity_available_sp: 0, sp_done: 0 };
        }

        // Calculate days remaining
        const endDate = new Date(sprint.end_date);
        const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        const daysRemainingFormatted = daysRemaining > 0 ? daysRemaining : 0;

        // Calculate progress percentage
        const goalSP = capacity?.capacity_goal_sp || 0;
        const doneSP = capacity?.sp_done || 0;
        const progress = goalSP > 0 ? Math.round((doneSP / goalSP) * 100) : 0;

        // Determine risk level
        let riskLevel = 'low';
        if (daysRemainingFormatted <= 3 && progress < 70) {
          riskLevel = 'high';
        } else if (daysRemainingFormatted <= 5 && progress < 80) {
          riskLevel = 'medium';
        } else if (progress < 70) {
          riskLevel = 'medium';
        }

        return {
          ...sprint,
          squad_name: sprint.squads?.squad_name || 'Unknown',
          squad_key: sprint.squads?.squad_key || '',
          capacity_goal_sp: goalSP,
          capacity_available_sp: capacity?.capacity_available_sp || 0,
          sp_done: doneSP,
          progress_percentage: progress,
          days_remaining: daysRemainingFormatted,
          risk_level: riskLevel
        };
      })
    );

    return enrichedSprints;
  } catch (error) {
    console.error('[OVERALL_VIEW] Error in getActiveSprints:', error);
    return [];
  }
};

/**
 * Get aggregated KPIs for overall view (all squads combined)
 * @returns {Promise<Object>} Aggregated KPI data
 */
export const getOverallKPIs = async () => {
  try {
    // Get KPIs without filters (all squads)
    // Explicitly pass empty filters to ensure no squad filtering
    const [deliveryData, qualityData, healthData] = await Promise.all([
      getDeliveryKPIData({ filterSquadId: undefined, filterSprintId: null }),
      getQualityKPIData({ filterSquadId: undefined, filterSprintId: null }),
      getTeamHealthKPIData({ filterSquadId: undefined, filterSprintId: null })
    ]);

    // Calculate average velocity from recent sprints
    const averageVelocity = await calculateAverageVelocity();

    return {
      deliveryScore: deliveryData?.deliverySuccessScore || null,
      qualityScore: qualityData?.developmentQualityScore || null,
      teamHealthScore: healthData?.teamHealthScore || null,
      averageVelocity: averageVelocity
    };
  } catch (error) {
    console.error('[OVERALL_VIEW] Error getting overall KPIs:', error);
    return {
      deliveryScore: null,
      qualityScore: null,
      teamHealthScore: null,
      averageVelocity: null
    };
  }
};

/**
 * Calculate average velocity from last 6 closed sprints
 * @returns {Promise<Object>} Average velocity data
 */
const calculateAverageVelocity = async () => {
  if (!supabase) {
    return null;
  }

  try {
    // Get last 6 closed sprints
    const { data: sprints, error } = await supabase
      .from('sprints')
      .select('id, sprint_name, end_date')
      .eq('state', 'closed')
      .ilike('sprint_name', '%Sprint%')
      .not('end_date', 'is', null)
      .order('end_date', { ascending: false })
      .limit(6);

    if (error || !sprints || sprints.length === 0) {
      return null;
    }

    const sprintIds = sprints.map(s => s.id);

    // Get SP Done for these sprints using RPC function
    // Since sp_done may not exist in table, calculate for each sprint
    const spDoneValues = await Promise.all(
      sprints.map(async (sprint) => {
        // Get squad_id for this sprint
        const { data: sprintData } = await supabase
          .from('sprints')
          .select('squad_id')
          .eq('id', sprint.id)
          .single();
        
        if (!sprintData?.squad_id) {
          return null;
        }
        
        try {
          const { data: spDoneData, error: rpcError } = await supabase
            .rpc('calculate_squad_sprint_sp_done', {
              p_squad_id: sprintData.squad_id,
              p_sprint_id: sprint.id
            });
          
          if (!rpcError && spDoneData !== null && spDoneData !== undefined) {
            return Number(spDoneData) || 0;
          }
        } catch (rpcErr) {
          // RPC function may not exist, skip this sprint
          console.debug(`[OVERALL_VIEW] RPC calculate_squad_sprint_sp_done not available for sprint ${sprint.id}`);
        }
        
        return null;
      })
    );
    
    // Filter out null values
    const capacities = spDoneValues.filter(val => val !== null && val !== undefined);

    if (!capacities || capacities.length === 0) {
      return null;
    }

    const totalSPDone = capacities.reduce((sum, spDone) => sum + (spDone || 0), 0);
    const averageSPDone = totalSPDone / capacities.length;

    return {
      value: Math.round(averageSPDone * 10) / 10,
      unit: 'SP',
      sprintsCount: sprints.length
    };
  } catch (error) {
    console.error('[OVERALL_VIEW] Error calculating average velocity:', error);
    return null;
  }
};

/**
 * Get quick alerts (critical items)
 * @returns {Promise<Array>} Array of alerts
 */
export const getQuickAlerts = async () => {
  if (!supabase) {
    return [];
  }

  try {
    const alerts = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get active sprints
    const activeSprints = await getActiveSprints();

    // 1. Sprints with low velocity (< 70% progress)
    const lowVelocitySprints = activeSprints.filter(
      sprint => sprint.progress_percentage < 70 && sprint.days_remaining > 0
    );
    if (lowVelocitySprints.length > 0) {
      alerts.push({
        type: 'low_velocity',
        severity: 'high',
        message: `${lowVelocitySprints.length} sprint(s) with low velocity (< 70%)`,
        count: lowVelocitySprints.length,
        items: lowVelocitySprints.map(s => ({
          sprint: s.sprint_name,
          squad: s.squad_name,
          progress: s.progress_percentage
        }))
      });
    }

    // 2. Sprints closing soon (last 3 days)
    const closingSoonSprints = activeSprints.filter(
      sprint => sprint.days_remaining <= 3 && sprint.days_remaining > 0
    );
    if (closingSoonSprints.length > 0) {
      alerts.push({
        type: 'closing_soon',
        severity: 'medium',
        message: `${closingSoonSprints.length} sprint(s) closing in 3 days or less`,
        count: closingSoonSprints.length,
        items: closingSoonSprints.map(s => ({
          sprint: s.sprint_name,
          squad: s.squad_name,
          daysRemaining: s.days_remaining
        }))
      });
    }

    // 3. Blocked issues (if we have access to issues table)
    try {
      // Query blocked issues - status is stored as text in issues table
      // Use ilike for case-insensitive matching and handle potential variations
      const { data: blockedIssues, error: blockedError } = await supabase
        .from('issues')
        .select('id, issue_key, summary, squad_id, sprint_id, status')
        .or('status.ilike.BLOCKED,status.ilike.%blocked%')
        .limit(10);
      
      // Log error but don't fail - blocked issues are optional
      if (blockedError) {
        console.debug('[OVERALL_VIEW] Error fetching blocked issues:', blockedError);
      }

      if (blockedIssues && blockedIssues.length > 0 && !blockedError) {
        alerts.push({
          type: 'blocked_issues',
          severity: 'medium',
          message: `${blockedIssues.length} blocked issue(s)`,
          count: blockedIssues.length,
          items: blockedIssues.slice(0, 5).map(i => ({
            issue: i.issue_key,
            summary: i.summary
          }))
        });
      }
    } catch (error) {
      // Silently fail if issues table is not accessible
      console.debug('[OVERALL_VIEW] Could not fetch blocked issues:', error.message);
    }

    return alerts;
  } catch (error) {
    console.error('[OVERALL_VIEW] Error getting quick alerts:', error);
    return [];
  }
};

/**
 * Get product initiatives for timeline
 * Filters active/in-progress initiatives with valid dates
 * @returns {Promise<Array>} Array of product initiatives formatted for GanttChart
 */
export const getProductInitiatives = async () => {
  if (!supabase) {
    console.warn('[OVERALL_VIEW] Supabase not configured');
    return [];
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get initiatives with valid dates (not completed)
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select(`
        id,
        initiative_name,
        initiative_key,
        start_date,
        end_date,
        squad_id,
        squads!inner(squad_name, squad_key)
      `)
      .not('start_date', 'is', null)
      .not('end_date', 'is', null)
      .gte('end_date', today.toISOString().split('T')[0]) // Only future/active initiatives
      .order('start_date', { ascending: true })
      .limit(20); // Limit to most relevant

    if (error) {
      console.error('[OVERALL_VIEW] Error getting initiatives:', error);
      return [];
    }

    if (!initiatives || initiatives.length === 0) {
      return [];
    }

    // Format for GanttChart component
    const formattedInitiatives = initiatives.map(initiative => {
      // Calculate completion percentage (simplified - could be enhanced with issues)
      const startDate = new Date(initiative.start_date);
      const endDate = new Date(initiative.end_date);
      const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const daysElapsed = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
      const completion = totalDays > 0 
        ? Math.max(0, Math.min(100, Math.round((daysElapsed / totalDays) * 100)))
        : 0;

      return {
        initiative: initiative.initiative_name || initiative.initiative_key || 'Unknown Initiative',
        squad: initiative.squads?.squad_name || 'Unassigned',
        start: initiative.start_date,
        delivery: initiative.end_date,
        status: completion,
        spi: 1.0, // Default SPI, could be calculated from issues if needed
        type: 'initiative' // Marker to distinguish from sprints
      };
    });

    return formattedInitiatives;
  } catch (error) {
    console.error('[OVERALL_VIEW] Error in getProductInitiatives:', error);
    return [];
  }
};

/**
 * Get unified timeline data (sprints + initiatives)
 * Combines active sprints and product initiatives for GanttChart
 * @returns {Promise<Array>} Combined timeline data formatted for GanttChart
 */
export const getUnifiedTimeline = async () => {
  try {
    const [sprints, initiatives] = await Promise.all([
      getActiveSprints(),
      getProductInitiatives()
    ]);

    // Format sprints for GanttChart
    const formattedSprints = sprints.map(sprint => ({
      initiative: sprint.sprint_name,
      squad: sprint.squad_name,
      start: sprint.start_date,
      delivery: sprint.end_date,
      status: sprint.progress_percentage,
      spi: sprint.progress_percentage >= 80 ? 1.0 : sprint.progress_percentage >= 60 ? 0.9 : 0.7,
      type: 'sprint' // Marker to distinguish from initiatives
    }));

    // Combine and sort by start date
    const combined = [...formattedSprints, ...initiatives].sort((a, b) => {
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      return dateA - dateB;
    });

    // Filter to show only critical items (sprints at risk or initiatives in progress)
    const criticalItems = combined.filter(item => {
      if (item.type === 'sprint') {
        // Show sprints with risk level medium or high
        const sprint = sprints.find(s => s.sprint_name === item.initiative);
        return sprint && (sprint.risk_level === 'high' || sprint.risk_level === 'medium');
      } else {
        // Show initiatives that are in progress (status > 0 and < 100)
        return item.status > 0 && item.status < 100;
      }
    });

    // Return critical items, or all if there are few items
    return criticalItems.length > 0 && criticalItems.length <= 15 
      ? criticalItems 
      : combined.slice(0, 15); // Limit to 15 items max for performance
  } catch (error) {
    console.error('[OVERALL_VIEW] Error getting unified timeline:', error);
    return [];
  }
};
