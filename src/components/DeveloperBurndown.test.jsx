import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DeveloperBurndown from './DeveloperBurndown.jsx';

const mockGetSquads = vi.fn();
const mockGetSprintsForSquad = vi.fn();
const mockGetDevelopersForSquad = vi.fn();
const mockGetProjectsForSquad = vi.fn();
const mockGetDeveloperBurndownData = vi.fn();

vi.mock('@/utils/developerMetricsApi', () => ({
  getSquads: (...args) => mockGetSquads(...args),
  getSprintsForSquad: (...args) => mockGetSprintsForSquad(...args),
  getDevelopersForSquad: (...args) => mockGetDevelopersForSquad(...args)
}));

vi.mock('@/utils/developerBurndownApi', () => ({
  getProjectsForSquad: (...args) => mockGetProjectsForSquad(...args),
  getDeveloperBurndownData: (...args) => mockGetDeveloperBurndownData(...args)
}));

describe('DeveloperBurndown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no burndown data', async () => {
    mockGetSquads.mockResolvedValue([{ id: 'squad-1', squad_name: 'Squad One' }]);
    mockGetSprintsForSquad.mockResolvedValue([{ id: 'sprint-1', sprint_name: 'Sprint 1', is_active: true }]);
    mockGetDevelopersForSquad.mockResolvedValue([{ id: 'dev-1', display_name: 'Dev One' }]);
    mockGetProjectsForSquad.mockResolvedValue([]);
    mockGetDeveloperBurndownData.mockResolvedValue({
      days: [],
      totalPlanned: 0,
      totalCompleted: 0,
      totalTickets: 0
    });

    render(<DeveloperBurndown />);

    expect(await screen.findByText('No burndown data available for the selected filters.')).toBeTruthy();
  });

  it('passes project filter to API when selected', async () => {
    mockGetSquads.mockResolvedValue([{ id: 'squad-1', squad_name: 'Squad One' }]);
    mockGetSprintsForSquad.mockResolvedValue([{ id: 'sprint-1', sprint_name: 'Sprint 1', is_active: true }]);
    mockGetDevelopersForSquad.mockResolvedValue([{ id: 'dev-1', display_name: 'Dev One' }]);
    mockGetProjectsForSquad.mockResolvedValue([
      { id: 'project-1', initiative_name: 'Project One', initiative_key: 'PRJ-1' }
    ]);
    mockGetDeveloperBurndownData.mockResolvedValue({
      days: [{ date: '2024-01-01', planned: 3, completed: 1, remaining: 2 }],
      totalPlanned: 3,
      totalCompleted: 1,
      totalTickets: 1
    });

    render(<DeveloperBurndown />);

    await waitFor(() => {
      expect(mockGetDeveloperBurndownData).toHaveBeenCalled();
    });

    const projectSelect = screen.getByDisplayValue('All Projects');
    fireEvent.change(projectSelect, { target: { value: 'project-1' } });

    await waitFor(() => {
      const lastCall = mockGetDeveloperBurndownData.mock.calls.at(-1);
      expect(lastCall[0]).toBe('sprint-1');
      expect(lastCall[1]).toBe('dev-1');
      expect(lastCall[2]).toEqual({
        squadId: 'squad-1',
        projectId: 'project-1'
      });
    });
  });
});
