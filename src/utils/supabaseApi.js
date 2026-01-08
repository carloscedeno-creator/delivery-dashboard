/**
 * Supabase service for obtaining delivery metrics
 * Connects to Supabase database that is updated every 30 minutes from Jira
 */

import { createClient } from '@supabase/supabase-js';

// Configuration from environment variables
// Also tries default values if available
// Note: For GitHub Pages deployment, if env vars are not available during build,
// these defaults will be used. The anon key is public and safe to include in client-side code.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
// Default anon key - replace with your actual key if deploying without env vars
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || null;

// Validate that variables are configured
if (!supabaseAnonKey) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY is not configured. Set this variable in your .env file');
  console.warn('   To get it: Supabase Dashboard > Settings > API > anon public key');
}

// Create Supabase client only if we have the key
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Gets sprint metrics from Supabase
 * @param {string} projectKey - Project key (default: 'OBD')
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of sprint metrics
 */
export const getSprintMetrics = async (projectKey = 'OBD', options = {}) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    let query = supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .eq('project_name', projectKey.toUpperCase());

    // Sort by end date (most recent first)
    query = query.order('end_date', { ascending: false, nullsFirst: false });

    // Limit results if specified
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Filter by state if specified
    if (options.state) {
      query = query.eq('state', options.state);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SUPABASE] Error getting sprint metrics:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Error in getSprintMetrics:', error);
    throw error;
  }
};

/**
 * Gets developer metrics by sprint
 * @param {string} projectKey - Project key (default: 'OBD')
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of developer metrics
 */
export const getDeveloperMetrics = async (projectKey = 'OBD', options = {}) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    let query = supabase
      .from('v_developer_sprint_metrics_complete')
      .select('*')
      .eq('project_name', projectKey.toUpperCase());

    // Sort by sprint and developer
    query = query.order('sprint_name', { ascending: false });
    query = query.order('developer_name', { ascending: true });

    // Limit results if specified
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Filter by specific sprint if specified
    if (options.sprintName) {
      query = query.eq('sprint_name', options.sprintName);
    }

    // Filter by specific developer if specified
    if (options.developerName) {
      query = query.eq('developer_name', options.developerName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SUPABASE] Error getting developer metrics:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Error in getDeveloperMetrics:', error);
    throw error;
  }
};

/**
 * Gets global project metrics
 * @param {string} projectKey - Project key (default: 'OBD')
 * @returns {Promise<Object>} Object with global metrics
 */
export const getGlobalMetrics = async (projectKey = 'OBD') => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    const { data, error } = await supabase
      .from('global_metrics')
      .select('*')
      .eq('project_id', 
        supabase
          .from('projects')
          .select('id')
          .eq('project_key', projectKey.toUpperCase())
          .single()
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[SUPABASE] Error getting global metrics:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[SUPABASE] Error in getGlobalMetrics:', error);
    throw error;
  }
};

/**
 * Gets the current active sprint
 * @param {string} projectKey - Project key (default: 'OBD')
 * @returns {Promise<Object>} Object with active sprint data
 */
export const getActiveSprint = async (projectKey = 'OBD') => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    const { data, error } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .eq('project_name', projectKey.toUpperCase())
      .eq('state', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If there's no active sprint, it's not a critical error
      if (error.code === 'PGRST116') {
        console.log('[SUPABASE] No active sprint currently');
        return null;
      }
      console.error('[SUPABASE] Error getting active sprint:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[SUPABASE] Error in getActiveSprint:', error);
    throw error;
  }
};

/**
 * Gets issues by status
 * @param {string} projectKey - Project key (default: 'OBD')
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of issues grouped by status
 */
export const getIssuesByStatus = async (projectKey = 'OBD', options = {}) => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    // First get the project_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_key', projectKey.toUpperCase())
      .single();

    if (projectError || !project) {
      throw new Error(`Project ${projectKey} not found`);
    }

    // Get issues grouped by status
    const { data, error } = await supabase
      .from('issues')
      .select('current_status, current_story_points')
      .eq('project_id', project.id);

    if (error) {
      console.error('[SUPABASE] Error getting issues by status:', error);
      throw error;
    }

    // Group by status
    const grouped = data.reduce((acc, issue) => {
      const status = issue.current_status || 'Unassigned';
      if (!acc[status]) {
        acc[status] = {
          status,
          count: 0,
          totalSP: 0
        };
      }
      acc[status].count++;
      acc[status].totalSP += issue.current_story_points || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[SUPABASE] Error in getIssuesByStatus:', error);
    throw error;
  }
};

/**
 * Gets all active developers
 * @param {string} projectKey - Project key (default: 'OBD')
 * @returns {Promise<Array>} Array of developers
 */
export const getDevelopers = async (projectKey = 'OBD') => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    const { data, error } = await supabase
      .from('developers')
      .select('*')
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('[SUPABASE] Error getting developers:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Error in getDevelopers:', error);
    throw error;
  }
};

/**
 * Gets delivery roadmap data from Supabase
 * @returns {Promise<Array>} Array of projects with metrics
 */
export const getDeliveryRoadmapData = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    // Get squads
    const { data: squads, error: squadsError } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .order('squad_name', { ascending: true });

    if (squadsError) {
      console.error('[SUPABASE] Error getting squads:', squadsError);
      throw squadsError;
    }

    // Get initiatives (including epic dates)
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id, squad_id, initiative_key, initiative_name, created_at, start_date, end_date')
      .order('initiative_name', { ascending: true });

    if (initiativesError) {
      console.error('[SUPABASE] Error getting initiatives:', initiativesError);
      throw initiativesError;
    }

    // Get most recent sprint metrics
    const { data: sprintMetrics, error: metricsError } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .order('end_date', { ascending: false })
      .limit(100);

    if (metricsError) {
      console.warn('[SUPABASE] Error getting metrics:', metricsError);
    }

    // Get issues
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, initiative_id, current_status, current_story_points, assignee_id');

    if (issuesError) {
      console.warn('[SUPABASE] Error getting issues:', issuesError);
    }

    // Get developers
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name');

    if (devsError) {
      console.warn('[SUPABASE] Error getting developers:', devsError);
    }

    // Create developer map
    const devMap = new Map((developers || []).map(d => [d.id, d.display_name]));

    // Create squad map
    const squadMap = new Map((squads || []).map(s => [s.id, s]));

    // Validate that there is data in Supabase
    if (!squads || squads.length === 0) {
      throw new Error('No squads in Supabase. Verify that the sync service has run.');
    }

    if (!initiatives || initiatives.length === 0) {
      throw new Error('No initiatives in Supabase. Verify that the sync service has run.');
    }

    console.log('[SUPABASE] Data found:', {
      squads: squads.length,
      initiatives: initiatives.length,
      issues: (issues || []).length,
      developers: (developers || []).length
    });

    // Build delivery roadmap data
    const roadmapData = [];

    // Process normal initiatives
    for (const initiative of initiatives || []) {
      const squad = squadMap.get(initiative.squad_id);
      if (!squad) continue;

      // Get issues for this initiative
      const initiativeIssues = (issues || []).filter(
        issue => issue.initiative_id === initiative.id
      );

      // Calculate basic metrics
      const totalSP = initiativeIssues.reduce((sum, issue) => 
        sum + (issue.current_story_points || 0), 0
      );
      const completedSP = initiativeIssues
        .filter(issue => {
          const status = issue.current_status?.toLowerCase() || '';
          return status.includes('done') || status.includes('closed') || status.includes('resolved');
        })
        .reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);

      // Calculate SPI (simplified: based on completed SP vs total)
      const spi = totalSP > 0 ? (completedSP / totalSP) : 0;

      // Calculate completion percentage
      const completionPercentage = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

      // Get dates from epic (priority) or most recent sprint (fallback)
      // Priority 1: Use epic dates (start_date, end_date from initiatives)
      // Priority 2: Use most recent sprint dates
      // Priority 3: Use created_at as start_date
      let startDate = null;
      let endDate = null;

      if (initiative.start_date) {
        startDate = new Date(initiative.start_date).toISOString().split('T')[0];
      } else {
        // Fallback: use most recent sprint
        const squadMetrics = (sprintMetrics || []).filter(
          m => m.project_name === squad.squad_key || m.squad_key === squad.squad_key
        );
        const latestSprint = squadMetrics[0];
        startDate = latestSprint?.start_date 
          ? new Date(latestSprint.start_date).toISOString().split('T')[0]
          : new Date(initiative.created_at).toISOString().split('T')[0];
      }

      if (initiative.end_date) {
        endDate = new Date(initiative.end_date).toISOString().split('T')[0];
      } else {
        // If no end_date, estimate based on start_date or created_at
        const baseDate = initiative.start_date || initiative.created_at;
        const estimatedEnd = new Date(baseDate);
        estimatedEnd.setMonth(estimatedEnd.getMonth() + 3); // 3 months later
        endDate = estimatedEnd.toISOString().split('T')[0];
      }

      // Ensure both dates are present (final validation)
      if (!startDate) {
        startDate = new Date(initiative.created_at).toISOString().split('T')[0];
      }
      if (!endDate) {
        const estimatedEnd = new Date(startDate);
        estimatedEnd.setMonth(estimatedEnd.getMonth() + 3);
        endDate = estimatedEnd.toISOString().split('T')[0];
      }

      // Get developer assignments
      const devIds = [...new Set(
        initiativeIssues
          .map(issue => issue.assignee_id)
          .filter(Boolean)
      )];
      const devNames = devIds.map(id => devMap.get(id)).filter(Boolean);

      // Ensure both dates are present
      if (!startDate) {
        startDate = new Date(initiative.created_at).toISOString().split('T')[0];
      }
      if (!endDate) {
        const estimatedEnd = new Date(startDate);
        estimatedEnd.setMonth(estimatedEnd.getMonth() + 3);
        endDate = estimatedEnd.toISOString().split('T')[0];
      }

      const roadmapItem = {

        squad: squad.squad_name || squad.squad_key,
        initiative: initiative.initiative_name || initiative.initiative_key,
        start: startDate,
        status: completionPercentage,
        delivery: endDate,
        spi: parseFloat(spi.toFixed(2)),
        allocation: devNames.length,
        comments: `${initiativeIssues.length} issues, ${totalSP} SP total`,
        scope: initiative.initiative_name || '',
        dev: devNames.join(', ') || 'Unassigned',
        percentage: completionPercentage
      };

      roadmapData.push(roadmapItem);
    }

    // Process issues without initiative grouped by squad
    const issuesWithoutInitiative = (issues || []).filter(issue => !issue.initiative_id);
    const squadIdsWithUnassignedIssues = [...new Set(issuesWithoutInitiative.map(issue => issue.squad_id).filter(Boolean))];

    for (const squadId of squadIdsWithUnassignedIssues) {
      const squad = squadMap.get(squadId);
      if (!squad) continue;

      const unassignedIssues = issuesWithoutInitiative.filter(issue => issue.squad_id === squadId);
      if (unassignedIssues.length === 0) continue;

      const totalSP = unassignedIssues.reduce((sum, issue) => 
        sum + (issue.current_story_points || 0), 0
      );
      const completedSP = unassignedIssues
        .filter(issue => {
          const status = issue.current_status?.toLowerCase() || '';
          return status.includes('done') || status.includes('closed') || status.includes('resolved');
        })
        .reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);

      const spi = totalSP > 0 ? (completedSP / totalSP) : 0;
      const completionPercentage = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

      const squadMetrics = (sprintMetrics || []).filter(
        m => m.project_name === squad.squad_key || m.squad_key === squad.squad_key
      );
      const latestSprint = squadMetrics[0];

      const devIds = [...new Set(
        unassignedIssues.map(issue => issue.assignee_id).filter(Boolean)
      )];
      const devNames = devIds.map(id => devMap.get(id)).filter(Boolean);

      roadmapData.push({
        squad: squad.squad_name || squad.squad_key,
        initiative: 'Others',
        start: latestSprint?.start_date 
          ? new Date(latestSprint.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: completionPercentage,
        delivery: latestSprint?.end_date
          ? new Date(latestSprint.end_date).toISOString().split('T')[0]
          : null,
        spi: parseFloat(spi.toFixed(2)),
        allocation: devNames.length,
        comments: `${unassignedIssues.length} issues, ${totalSP} SP total`,
        scope: 'Others',
        dev: devNames.join(', ') || 'Unassigned',
        percentage: completionPercentage
      });
    }

    // Validate that data was generated
    if (roadmapData.length === 0) {
      throw new Error('Could not generate roadmap data from Supabase. Verify that there are initiatives with associated issues.');
    }

    console.log('[SUPABASE] Roadmap data generated:', roadmapData.length, 'items');
    return roadmapData;
  } catch (error) {
    console.error('[SUPABASE] Error in getDeliveryRoadmapData:', error);
    throw error;
  }
};

/**
 * Gets developer allocation data from Supabase
 * @returns {Promise<Array>} Array of allocations
 */
export const getDeveloperAllocationData = async () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Check environment variables.');
  }

  try {
    // Get active or most recent sprints by squad
    const { data: activeSprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, squad_id, start_date, end_date, state, sprint_name')
      .or('state.eq.active,state.eq.closed')
      .order('end_date', { ascending: false });

    if (sprintsError) {
      console.warn('[SUPABASE] Error getting sprints:', sprintsError);
    }

    // Create map of most recent sprint by squad
    const squadSprintMap = new Map();
    if (activeSprints) {
      for (const sprint of activeSprints) {
        if (!squadSprintMap.has(sprint.squad_id)) {
          squadSprintMap.set(sprint.squad_id, sprint);
        }
      }
    }

    // Get issues with dates to filter by sprint (including those without initiative)
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, squad_id, initiative_id, current_story_points, current_sprint, assignee_id, created_date, dev_start_date, dev_close_date, resolved_date');

    if (issuesError) {
      console.error('[SUPABASE] Error getting issues:', issuesError);
      throw issuesError;
    }

    // Function to verify if an issue is active in the current sprint
    // Uses current_sprint (real metric that defines if it's in the selected sprint)
    const isIssueActiveInSprint = (issue, sprint) => {
      if (!sprint) return false;

      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = new Date(sprint.end_date);
      const now = new Date();

      // If sprint ended more than a sprint ago, don't count
      if (sprintEnd < now && sprint.state === 'closed') {
        // Only count if it ended recently (last closed sprint)
        const daysSinceEnd = (now - sprintEnd) / (1000 * 60 * 60 * 24);
        if (daysSinceEnd > 14) return false; // More than 2 weeks = don't count
      }

      // PRIORITY 1: Check if issue has current_sprint that matches the sprint
      // This is the most reliable source (real metric from spreadsheet)
      if (issue.current_sprint && issue.current_sprint === sprint.sprint_name) {
        return true; // It's in the sprint, count it
      }

      // PRIORITY 2: If it doesn't have current_sprint, check dates ONLY for very recent tickets
      // Only count if it was created DURING the current sprint (not before)
      const issueCreated = issue.created_date ? new Date(issue.created_date) : null;
      
      // If it was created during the current sprint, count it
      if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) {
        return true;
      }

      // DON'T count old issues that overlap by development dates
      // We only count if it's explicitly in the sprint or was created during the sprint
      return false;
    };

    // Get initiatives
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id, initiative_name, squad_id');

    if (initiativesError) {
      console.error('[SUPABASE] Error getting initiatives:', initiativesError);
      throw initiativesError;
    }

    // Get squads
    const { data: squads, error: squadsError } = await supabase
      .from('squads')
      .select('id, squad_name');

    if (squadsError) {
      console.error('[SUPABASE] Error getting squads:', squadsError);
      throw squadsError;
    }

    // Get developers
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name');

    if (devsError) {
      console.error('[SUPABASE] Error getting developers:', devsError);
      throw devsError;
    }

    // Validate that there is data
    if (!issues || issues.length === 0) {
      throw new Error('No issues in Supabase. Verify that the sync service has run.');
    }

    if (!initiatives || initiatives.length === 0) {
      throw new Error('No initiatives in Supabase. Verify that the sync service has run.');
    }

    console.log('[SUPABASE] Data for allocation:', {
      issues: issues.length,
      initiatives: initiatives.length,
      squads: (squads || []).length,
      developers: (developers || []).length
    });

    // Create maps for fast lookup
    const initiativeMap = new Map((initiatives || []).map(i => [i.id, i]));
    const squadMap = new Map((squads || []).map(s => [s.id, s]));
    const devMap = new Map((developers || []).map(d => [d.id, d]));

    // Group by initiative and developer, filtering only issues active in current sprint
    const allocationMap = new Map();
    let filteredIssuesCount = 0;
    let totalIssuesCount = 0;

    for (const issue of issues || []) {
      totalIssuesCount++;
      if (!issue.initiative_id || !issue.assignee_id) continue;

      const initiative = initiativeMap.get(issue.initiative_id);
      const dev = devMap.get(issue.assignee_id);
      if (!initiative || !dev) continue;

      const squad = squadMap.get(initiative.squad_id);
      if (!squad) continue;

      // Get current sprint for this squad
      const currentSprint = squadSprintMap.get(squad.id);
      
      // Filter: only count issues active in current sprint
      if (!isIssueActiveInSprint(issue, currentSprint)) {
        continue; // Old issue or outside sprint, don't count
      }

      filteredIssuesCount++;
      const key = `${squad.squad_name}::${initiative.initiative_name}::${dev.display_name}`;
      
      if (!allocationMap.has(key)) {
        allocationMap.set(key, {
          squad: squad.squad_name,
          initiative: initiative.initiative_name,
          dev: dev.display_name,
          totalSP: 0
        });
      }

      const allocation = allocationMap.get(key);
      allocation.totalSP += issue.current_story_points || 0;
    }

    console.log('[SUPABASE] Issues filtered by sprint:', {
      total: totalIssuesCount,
      active: filteredIssuesCount,
      excluded: totalIssuesCount - filteredIssuesCount
    });

    // Convert to array and calculate percentages
    // Sprint capacity based on conversion table:
    // 1 SP = 4 hours
    // 2 SP = 1 day (8 hours)
    // 3 SP = 2-3 days (16-24 hours)
    // 5 SP = 3-4 days (24-32 hours)
    // Sprint = 2 weeks = 8.5 working days = 68 hours
    // Capacity = 68 hours / 4 hours per SP = 17 SP per sprint
    const SPRINT_CAPACITY_SP = 17; // SP a developer can do in a sprint
    
    const allocations = Array.from(allocationMap.values()).map(allocation => {
      // Calculate percentage based on SP vs sprint capacity
      // percentage = (SP assigned in this initiative / sprint capacity) * 100
      // We don't limit to 100% because a developer can be assigned to multiple initiatives
      const percentage = Math.round((allocation.totalSP / SPRINT_CAPACITY_SP) * 100);
      
      return {
        squad: allocation.squad,
        initiative: allocation.initiative,
        dev: allocation.dev,
        percentage: percentage
      };
    });

    // Validate that allocations were generated
    if (allocations.length === 0) {
      console.warn('[SUPABASE] No allocations generated. There may be no issues with assignee_id.');
      // Return empty array instead of throwing error, as this may be valid
    }

    console.log('[SUPABASE] Allocation data generated:', allocations.length, 'items');
    return allocations;
  } catch (error) {
    console.error('[SUPABASE] Error in getDeveloperAllocationData:', error);
    throw error;
  }
};

/**
 * Tests connection to Supabase
 * @returns {Promise<boolean>} true if connection is successful
 */
export const testConnection = async () => {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('squads')
      .select('count')
      .limit(1);

    if (error) {
      console.error('[SUPABASE] Connection error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SUPABASE] Error in testConnection:', error);
    return false;
  }
};

// Exportar todas las funciones
export default {
  supabase,
  getSprintMetrics,
  getDeveloperMetrics,
  getGlobalMetrics,
  getActiveSprint,
  getIssuesByStatus,
  getDevelopers,
  getDeliveryRoadmapData,
  getDeveloperAllocationData,
  testConnection
};


