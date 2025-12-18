/**
 * Dev Performance Service
 * Business logic and calculations for Dev Performance module
 */

/**
 * Check if an issue status indicates "Dev Done"
 * @param {string} status - Issue status
 * @returns {boolean}
 */
export const isDevDoneStatus = (status) => {
    if (!status) return false;
    const statusUpper = status.trim().toUpperCase();
    return statusUpper === 'DONE' || 
           statusUpper === 'DEVELOPMENT DONE' ||
           statusUpper.includes('DEVELOPMENT DONE') ||
           statusUpper.includes('DEV DONE') ||
           (statusUpper.includes('DONE') && !statusUpper.includes('TO DO') && !statusUpper.includes('TODO'));
};

/**
 * Check if an issue is "Dev Done"
 * @param {object} issue - Issue object
 * @returns {boolean}
 */
export const isIssueDevDone = (issue) => {
    const hasDevCloseDate = issue.dev_close_date !== null && issue.dev_close_date !== undefined;
    const isDoneStatus = isDevDoneStatus(issue.current_status);
    return hasDevCloseDate || isDoneStatus;
};

/**
 * Filter issues by squad
 * @param {Array} issues - All issues
 * @param {string|null} squadId - Squad ID to filter by
 * @returns {Array}
 */
export const filterIssuesBySquad = (issues, squadId) => {
    if (!squadId) return issues;
    return issues.filter(i => String(i.squad_id) === String(squadId));
};

/**
 * Filter issues by sprint
 * @param {Array} issues - Issues to filter
 * @param {Array} issueSprints - Issue-sprint relationships
 * @param {string|null} sprintId - Sprint ID to filter by
 * @returns {Array}
 */
export const filterIssuesBySprint = (issues, issueSprints, sprintId) => {
    if (!sprintId) return issues;
    
    const sprintIssueIds = new Set(
        issueSprints
            .filter(is => String(is.sprint_id) === String(sprintId))
            .map(is => String(is.issue_id))
    );
    
    return issues.filter(issue => {
        const issueId = issue.id ? String(issue.id) : null;
        return issueId && sprintIssueIds.has(issueId);
    });
};

/**
 * Filter issues by developer
 * @param {Array} issues - Issues to filter
 * @param {string|null} developerId - Developer ID to filter by
 * @returns {Array}
 */
export const filterIssuesByDeveloper = (issues, developerId) => {
    if (!developerId) return issues;
    return issues.filter(issue => {
        const issueDevId = issue.assignee_id ? String(issue.assignee_id) : null;
        return issueDevId === String(developerId);
    });
};

/**
 * Apply all filters to issues
 * @param {Array} issues - All issues
 * @param {Array} issueSprints - Issue-sprint relationships
 * @param {object} filters - Filter object { squadId, sprintId, developerId }
 * @returns {Array}
 */
export const filterIssues = (issues, issueSprints, filters) => {
    let filtered = [...issues];
    
    filtered = filterIssuesBySquad(filtered, filters.squadId);
    filtered = filterIssuesBySprint(filtered, issueSprints, filters.sprintId);
    filtered = filterIssuesByDeveloper(filtered, filters.developerId);
    
    return filtered;
};

/**
 * Calculate metrics from filtered issues
 * @param {Array} filteredIssues - Filtered issues
 * @returns {object}
 */
export const calculateMetrics = (filteredIssues) => {
    const doneCount = filteredIssues.filter(isIssueDevDone).length;
    const completionPercentage = filteredIssues.length > 0 
        ? (doneCount / filteredIssues.length) * 100 
        : 0;
    
    const totalSP = filteredIssues.reduce((sum, i) => sum + (i.current_story_points || 0), 0);
    const completedSP = filteredIssues
        .filter(isIssueDevDone)
        .reduce((sum, i) => sum + (i.current_story_points || 0), 0);
    
    const totalWithSP = filteredIssues.filter(i => (i.current_story_points || 0) > 0).length;
    const totalNoSP = filteredIssues.filter(i => (i.current_story_points || 0) === 0).length;
    
    return {
        totalIssues: filteredIssues.length,
        totalWithSP,
        totalNoSP,
        doneCount,
        completedSP,
        totalSP,
        completionPercentage: Math.round(completionPercentage * 100) / 100,
        devDoneRate: filteredIssues.length > 0 ? Math.round((doneCount / filteredIssues.length) * 10000) / 100 : 0,
        spDevDone: completedSP,
        spTotal: totalSP,
        spDevDoneRate: totalSP > 0 ? Math.round((completedSP / totalSP) * 10000) / 100 : 0,
    };
};

/**
 * Calculate status breakdown
 * @param {Array} issues - Issues to analyze
 * @returns {Array}
 */
export const calculateStatusBreakdown = (issues) => {
    const statusCounts = {};
    let total = 0;
    
    issues.forEach(issue => {
        const status = issue.current_status || 'Unknown';
        if (!statusCounts[status]) {
            statusCounts[status] = { count: 0 };
        }
        statusCounts[status].count++;
        total++;
    });
    
    return Object.entries(statusCounts)
        .map(([status, data]) => ({
            status,
            count: data.count,
            percentage: total > 0 ? ((data.count / total) * 100).toFixed(2) : '0.00'
        }))
        .sort((a, b) => b.count - a.count);
};

/**
 * Filter sprints by squad and sort (current first, then by date)
 * @param {Array} sprints - All sprints
 * @param {string|null} squadId - Squad ID to filter by
 * @returns {Array}
 */
export const filterAndSortSprints = (sprints, squadId) => {
    let filtered = sprints;
    
    if (squadId) {
        filtered = sprints.filter(s => String(s.squad_id) === String(squadId));
    }
    
    // Sort: Current sprint first, then by date (newest to oldest)
    return [...filtered].sort((a, b) => {
        if (a.is_current && !b.is_current) return -1;
        if (!a.is_current && b.is_current) return 1;
        const dateA = a.start_date ? new Date(a.start_date) : new Date(0);
        const dateB = b.start_date ? new Date(b.start_date) : new Date(0);
        return dateB - dateA;
    });
};

/**
 * Filter developers by squad and sprint
 * @param {Array} developers - All developers
 * @param {Array} issues - All issues
 * @param {Array} issueSprints - Issue-sprint relationships
 * @param {string|null} squadId - Squad ID
 * @param {string|null} sprintId - Sprint ID
 * @returns {Array}
 */
export const filterDevelopers = (developers, issues, issueSprints, squadId, sprintId) => {
    if (!squadId) return developers;
    
    let filteredIssues = filterIssuesBySquad(issues, squadId);
    
    if (sprintId) {
        filteredIssues = filterIssuesBySprint(filteredIssues, issueSprints, sprintId);
    }
    
    const devIds = new Set(
        filteredIssues
            .map(i => i.assignee_id)
            .filter(id => id)
    );
    
    return developers.filter(d => devIds.has(d.id));
};





