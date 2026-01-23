import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDeveloperBurndownData, getProjectsForSquad } from './developerBurndownApi.js';

const mockSupabase = {
  from: vi.fn()
};

vi.mock('@/utils/supabaseApi', () => ({
  supabase: mockSupabase
}));

vi.mock('@/utils/statusHelper', () => ({
  isCompletedStatusSync: (status) => status === 'DONE'
}));

const createQuery = (result, withMaybeSingle = false) => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis()
  };

  query.then = (resolve) => Promise.resolve(result).then(resolve);

  if (withMaybeSingle) {
    query.maybeSingle = vi.fn().mockResolvedValue(result);
  }

  return query;
};

describe('developerBurndownApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProjectsForSquad returns initiatives list', async () => {
    const initiativesResult = {
      data: [{ id: 'proj-1', initiative_key: 'PRJ-1', initiative_name: 'Project One' }],
      error: null
    };

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'initiatives') {
        return createQuery(initiativesResult);
      }
      return createQuery({ data: [], error: null });
    });

    const result = await getProjectsForSquad('squad-1');
    expect(result).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('initiatives');
  });

  it('uses current_sprint for active sprints', async () => {
    const sprintResult = {
      data: {
        id: 'sprint-1',
        sprint_name: 'Sprint 1',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        complete_date: null,
        state: 'active'
      },
      error: null
    };

    const issuesResult = {
      data: [
        {
          id: 'issue-1',
          issue_key: 'ABC-1',
          current_status: 'DONE',
          current_story_points: 3,
          current_sprint: 'Sprint 1',
          assignee_id: 'dev-1',
          initiative_id: 'proj-1',
          status_by_sprint: {}
        }
      ],
      error: null
    };

    const statusHistoryResult = {
      data: [
        {
          issue_id: 'issue-1',
          from_value: 'IN PROGRESS',
          to_value: 'DONE',
          changed_at: '2024-01-01T10:00:00Z'
        }
      ],
      error: null
    };

    const assigneeHistoryResult = { data: [], error: null };
    let historyCall = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'sprints') {
        return createQuery(sprintResult, true);
      }
      if (table === 'issues') {
        return createQuery(issuesResult);
      }
      if (table === 'issue_history') {
        historyCall += 1;
        return createQuery(historyCall === 1 ? statusHistoryResult : assigneeHistoryResult);
      }
      return createQuery({ data: [], error: null });
    });

    const result = await getDeveloperBurndownData('sprint-1', 'dev-1');
    expect(mockSupabase.from).toHaveBeenCalledWith('issues');
    expect(result.dataSource).toBe('current_sprint');
  });

  it('uses issue_sprints for closed sprints', async () => {
    const sprintResult = {
      data: {
        id: 'sprint-2',
        sprint_name: 'Sprint 2',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        complete_date: '2024-01-02',
        state: 'closed'
      },
      error: null
    };

    const issueSprintsResult = {
      data: [
        {
          issue_id: 'issue-2',
          status_at_sprint_close: 'DONE',
          story_points_at_close: 5,
          issues: {
            id: 'issue-2',
            issue_key: 'ABC-2',
            current_status: 'DONE',
            current_story_points: 5,
            assignee_id: 'dev-2',
            initiative_id: 'proj-2',
            status_by_sprint: {}
          }
        }
      ],
      error: null
    };

    const historyResult = { data: [], error: null };
    let historyCall = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'sprints') {
        return createQuery(sprintResult, true);
      }
      if (table === 'issue_sprints') {
        return createQuery(issueSprintsResult);
      }
      if (table === 'issue_history') {
        historyCall += 1;
        return createQuery(historyResult);
      }
      return createQuery({ data: [], error: null });
    });

    const result = await getDeveloperBurndownData('sprint-2', 'dev-2');
    expect(mockSupabase.from).toHaveBeenCalledWith('issue_sprints');
    expect(result.dataSource).toBe('issue_sprints');
  });

  it('respects historical assignee when available', async () => {
    const sprintResult = {
      data: {
        id: 'sprint-3',
        sprint_name: 'Sprint 3',
        start_date: '2024-01-01',
        end_date: '2024-01-02',
        complete_date: '2024-01-02',
        state: 'closed'
      },
      error: null
    };

    const issueSprintsResult = {
      data: [
        {
          issue_id: 'issue-3',
          status_at_sprint_close: 'DONE',
          story_points_at_close: 8,
          issues: {
            id: 'issue-3',
            issue_key: 'ABC-3',
            current_status: 'DONE',
            current_story_points: 8,
            assignee_id: 'dev-2',
            initiative_id: 'proj-3',
            status_by_sprint: {}
          }
        }
      ],
      error: null
    };

    const statusHistoryResult = {
      data: [
        {
          issue_id: 'issue-3',
          from_value: 'IN PROGRESS',
          to_value: 'DONE',
          changed_at: '2024-01-02T10:00:00Z'
        }
      ],
      error: null
    };

    const assigneeHistoryResult = {
      data: [
        {
          issue_id: 'issue-3',
          from_value: 'dev-2',
          to_value: 'dev-1',
          changed_at: '2024-01-02T00:00:00Z'
        }
      ],
      error: null
    };

    let historyCall = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'sprints') {
        return createQuery(sprintResult, true);
      }
      if (table === 'issue_sprints') {
        return createQuery(issueSprintsResult);
      }
      if (table === 'issue_history') {
        historyCall += 1;
        return createQuery(historyCall === 1 ? statusHistoryResult : assigneeHistoryResult);
      }
      return createQuery({ data: [], error: null });
    });

    const result = await getDeveloperBurndownData('sprint-3', 'dev-1');
    expect(result.days[0].planned).toBe(0);
    expect(result.days[1].planned).toBe(8);
  });

  it('falls back to current assignee when history missing', async () => {
    const sprintResult = {
      data: {
        id: 'sprint-4',
        sprint_name: 'Sprint 4',
        start_date: '2024-01-01',
        end_date: '2024-01-01',
        complete_date: '2024-01-01',
        state: 'closed'
      },
      error: null
    };

    const issueSprintsResult = {
      data: [
        {
          issue_id: 'issue-4',
          status_at_sprint_close: 'DONE',
          story_points_at_close: 5,
          issues: {
            id: 'issue-4',
            issue_key: 'ABC-4',
            current_status: 'DONE',
            current_story_points: 5,
            assignee_id: 'dev-1',
            initiative_id: 'proj-4',
            status_by_sprint: {}
          }
        }
      ],
      error: null
    };

    const statusHistoryResult = { data: [], error: null };
    const assigneeHistoryResult = { data: [], error: null };
    let historyCall = 0;

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'sprints') {
        return createQuery(sprintResult, true);
      }
      if (table === 'issue_sprints') {
        return createQuery(issueSprintsResult);
      }
      if (table === 'issue_history') {
        historyCall += 1;
        return createQuery(historyCall === 1 ? statusHistoryResult : assigneeHistoryResult);
      }
      return createQuery({ data: [], error: null });
    });

    const result = await getDeveloperBurndownData('sprint-4', 'dev-1');
    expect(result.days[0].planned).toBe(5);
  });
});
