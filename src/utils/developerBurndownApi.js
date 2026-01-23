/**
 * API para obtener datos del burndown por desarrollador
 * Usa historial de assignee si está disponible, con fallback seguro
 */

import { supabase } from '@/utils/supabaseApi';
import { isCompletedStatusSync } from '@/utils/statusHelper';

const formatDate = (date) => date.toISOString().split('T')[0];

const buildHistoryMap = (records) => {
  const map = new Map();
  (records || []).forEach((record) => {
    if (!map.has(record.issue_id)) {
      map.set(record.issue_id, []);
    }
    map.get(record.issue_id).push({
      issue_id: record.issue_id,
      date: record.changed_at,
      from_value: record.from_value,
      to_value: record.to_value
    });
  });
  return map;
};

const getValueAtDate = (history, dateTime, fallbackValue) => {
  if (!history || history.length === 0) {
    return fallbackValue;
  }

  let valueAtDate = null;
  for (const record of history) {
    const recordDate = new Date(record.date).getTime();
    if (recordDate <= dateTime) {
      valueAtDate = record.to_value;
    } else {
      break;
    }
  }

  if (!valueAtDate) {
    const firstRecordDate = new Date(history[0].date).getTime();
    if (firstRecordDate > dateTime) {
      valueAtDate = history[0].from_value;
    } else {
      valueAtDate = history[history.length - 1].to_value;
    }
  }

  return valueAtDate ?? fallbackValue;
};

const getStatusAtDate = (history, dateTime, fallbackStatus) => (
  getValueAtDate(history, dateTime, fallbackStatus)
);

const getAssigneeAtDate = (history, dateTime, fallbackAssignee) => (
  getValueAtDate(history, dateTime, fallbackAssignee)
);

const getSprintInfo = async (sprintId) => {
  const { data, error } = await supabase
    .from('sprints')
    .select('id, sprint_name, start_date, end_date, complete_date, state, squad_id')
    .eq('id', sprintId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Sprint not found: ${sprintId}`);
  }

  return data;
};

const getIssuesForSprint = async (sprint, options) => {
  const { squadId, projectId, isSprintClosed } = options;
  const sprintName = sprint.sprint_name?.trim();

  if (isSprintClosed) {
    const { data, error } = await supabase
      .from('issue_sprints')
      .select(`
        issue_id,
        status_at_sprint_close,
        story_points_at_close,
        issues!inner(
          id,
          issue_key,
          current_status,
          current_story_points,
          assignee_id,
          initiative_id,
          status_by_sprint
        )
      `)
      .eq('sprint_id', sprint.id)
      .not('status_at_sprint_close', 'is', null);

    if (error) throw error;

    let issues = (data || []).map((item) => {
      const issue = item.issues || {};
      return {
        ...issue,
        status_at_sprint_close: item.status_at_sprint_close,
        story_points_at_close: item.story_points_at_close
      };
    });

    if (squadId) {
      const { data: initiatives, error: initiativesError } = await supabase
        .from('initiatives')
        .select('id')
        .eq('squad_id', squadId);
      if (initiativesError) throw initiativesError;
      const initiativeIds = (initiatives || []).map((i) => i.id);
      issues = issues.filter((issue) => initiativeIds.includes(issue.initiative_id));
    }

    if (projectId) {
      issues = issues.filter((issue) => issue.initiative_id === projectId);
    }

    return { issues, sprintName };
  }

  if (!sprintName) {
    return { issues: [], sprintName: null };
  }

  let query = supabase
    .from('issues')
    .select(`
      id,
      issue_key,
      current_status,
      current_story_points,
      current_sprint,
      assignee_id,
      initiative_id,
      status_by_sprint
    `)
    .eq('current_sprint', sprintName);

  if (squadId) {
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id')
      .eq('squad_id', squadId);
    if (initiativesError) throw initiativesError;
    const initiativeIds = (initiatives || []).map((i) => i.id);
    query = query.in('initiative_id', initiativeIds);
  }

  if (projectId) {
    query = query.eq('initiative_id', projectId);
  }

  const { data: issues, error } = await query;
  if (error) throw error;

  return { issues: issues || [], sprintName };
};

export const getProjectsForSquad = async (squadId) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase
    .from('initiatives')
    .select('id, initiative_key, initiative_name')
    .eq('squad_id', squadId)
    .order('initiative_name', { ascending: true });

  if (error) {
    console.error('[DEVELOPER_BURNDOWN] Error getting projects:', error);
    throw error;
  }

  return data || [];
};

export const getDeveloperBurndownData = async (sprintId, developerId, options = {}) => {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  if (!sprintId) {
    throw new Error('Sprint ID is required');
  }
  if (!developerId) {
    throw new Error('Developer ID is required');
  }

  const { squadId = null, projectId = null } = options;

  const sprint = await getSprintInfo(sprintId);
  const sprintCloseDate = sprint.complete_date || sprint.end_date || null;
  const isSprintClosed = sprint.state === 'closed' || (sprintCloseDate && new Date(sprintCloseDate) < new Date());

  if (!sprint.start_date) {
    throw new Error(`Sprint ${sprint.sprint_name} does not have valid dates`);
  }

  const sprintStart = new Date(sprint.start_date);
  const sprintEndBase = new Date(sprintCloseDate || new Date());
  const sprintEnd = isSprintClosed ? sprintEndBase : new Date(Math.min(sprintEndBase.getTime(), Date.now()));

  const { issues, sprintName } = await getIssuesForSprint(sprint, { squadId, projectId, isSprintClosed });

  if (!issues || issues.length === 0) {
    return {
      sprint,
      days: [],
      totalPlanned: 0,
      totalCompleted: 0,
      totalTickets: 0,
      dataSource: isSprintClosed ? 'issue_sprints' : 'current_sprint'
    };
  }

  const issueIds = issues.map((issue) => issue.id);

  const { data: statusHistoryRecords, error: statusHistoryError } = await supabase
    .from('issue_history')
    .select('issue_id, from_value, to_value, changed_at')
    .in('issue_id', issueIds)
    .eq('field_name', 'status')
    .gte('changed_at', sprintStart.toISOString())
    .lte('changed_at', sprintEnd.toISOString())
    .order('changed_at', { ascending: true });

  if (statusHistoryError) {
    console.warn('[DEVELOPER_BURNDOWN] Error loading status history:', statusHistoryError);
  }

  let assigneeHistoryRecords = [];
  try {
    const { data, error } = await supabase
      .from('issue_history')
      .select('issue_id, from_value, to_value, changed_at')
      .in('issue_id', issueIds)
      .eq('field_name', 'assignee')
      .order('changed_at', { ascending: true });

    if (error) {
      console.warn('[DEVELOPER_BURNDOWN] Assignee history not available:', error);
    } else {
      assigneeHistoryRecords = data || [];
    }
  } catch (error) {
    console.warn('[DEVELOPER_BURNDOWN] Failed to load assignee history:', error);
  }

  const statusHistoryMap = buildHistoryMap(statusHistoryRecords || []);
  const assigneeHistoryMap = buildHistoryMap(assigneeHistoryRecords || []);
  const hasAssigneeHistory = (assigneeHistoryRecords || []).length > 0;

  if (!hasAssigneeHistory) {
    console.warn('[DEVELOPER_BURNDOWN] No assignee history found; using current assignee_id as fallback.');
  }

  const days = [];
  const currentDate = new Date(sprintStart);

  while (currentDate <= sprintEnd) {
    const dateStr = formatDate(currentDate);
    const dateTime = currentDate.getTime();

    let plannedSP = 0;
    let completedSP = 0;
    const completedTickets = new Set();
    let totalTickets = 0;

    for (const issue of issues) {
      const assigneeAtDate = getAssigneeAtDate(
        assigneeHistoryMap.get(issue.id),
        dateTime,
        issue.assignee_id
      );

      if (!assigneeAtDate || assigneeAtDate !== developerId) {
        continue;
      }

      totalTickets += 1;
      const storyPoints = isSprintClosed
        ? Number(issue.story_points_at_close) || 0
        : Number(issue.current_story_points) || 0;

      plannedSP += storyPoints;

      const statusFallback = issue.status_at_sprint_close || issue.status_by_sprint?.[sprintName] || issue.current_status;
      const statusAtDate = getStatusAtDate(statusHistoryMap.get(issue.id), dateTime, statusFallback);

      if (statusAtDate && isCompletedStatusSync(statusAtDate, true)) {
        completedTickets.add(issue.id);
        completedSP += storyPoints;
      }
    }

    days.push({
      date: dateStr,
      planned: plannedSP,
      completed: completedSP,
      remaining: plannedSP - completedSP,
      completedTickets: completedTickets.size,
      totalTickets
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    sprint,
    days,
    totalPlanned: days[0]?.planned || 0,
    totalCompleted: days[days.length - 1]?.completed || 0,
    totalTickets: days[days.length - 1]?.totalTickets || 0,
    dataSource: isSprintClosed ? 'issue_sprints' : 'current_sprint'
  };
};
