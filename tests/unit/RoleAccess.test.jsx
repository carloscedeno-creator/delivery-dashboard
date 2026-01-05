/**
 * Unit tests for RoleAccess component
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import RoleAccess from '../../src/components/RoleAccess';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        data: [],
        error: null
      })),
      data: [],
      error: null
    })),
    upsert: vi.fn(() => ({
      data: null,
      error: null
    }))
  }))
};

vi.mock('../../src/utils/supabaseApi', () => ({
  supabase: mockSupabase
}));

// Mock permissions
vi.mock('../../src/config/permissions', () => ({
  MODULES: {
    OVERALL: 'overall',
    PRODUCT: 'product',
    DELIVERY: 'delivery',
    STRATA: 'strata',
    ADMIN: 'admin',
    USER_ADMIN: 'user-admin',
    ROLE_ACCESS: 'role-access',
    PM: 'pm',
    PROJECTS_METRICS: 'projects-metrics',
    DEVELOPER_METRICS: 'developer-metrics',
    TEAM_CAPACITY: 'team-capacity',
    THREE_AMIGOS: 'three-amigos',
    TEAM_ALLOCATION: 'team-allocation',
    KPIS: 'kpis',
    SOFTWARE_ENGINEERING_BENCHMARKS: 'software-engineering-benchmarks'
  },
  ROLE_PERMISSIONS: {
    admin: ['overall', 'admin', 'user-admin', 'role-access', 'three-amigos', 'team-allocation'],
    pm: ['overall', 'pm', 'projects-metrics', 'three-amigos', 'team-allocation'],
    regular: ['overall'],
    stakeholder: ['overall', 'product'],
    '3amigos': ['overall', 'pm', 'three-amigos', 'team-allocation']
  },
  clearPermissionsCache: vi.fn()
}));

describe('RoleAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock table exists check
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: [],
          error: null
        }))
      }))
    });
  });

  it('should render the component', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Role Access Management/i)).toBeInTheDocument();
    });
  });

  it('should display permission matrix', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Permission Matrix/i)).toBeInTheDocument();
      expect(screen.getByText(/Admin/i)).toBeInTheDocument();
      expect(screen.getByText(/PM/i)).toBeInTheDocument();
      expect(screen.getByText(/Regular/i)).toBeInTheDocument();
    });
  });

  it('should display all modules grouped by category', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Core/i)).toBeInTheDocument();
      expect(screen.getByText(/Metrics/i)).toBeInTheDocument();
      expect(screen.getByText(/PM/i)).toBeInTheDocument();
      expect(screen.getByText(/3 Amigos/i)).toBeInTheDocument();
      expect(screen.getByText(/Admin/i)).toBeInTheDocument();
    });
  });

  it('should display Team Allocation module', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Team Allocation/i)).toBeInTheDocument();
    });
  });

  it('should display 3 Amigos Section as a group', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/3 Amigos Section/i)).toBeInTheDocument();
    });
  });

  it('should toggle permission when checkbox is clicked', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      const checkboxes = screen.getAllByRole('button');
      const firstCheckbox = checkboxes.find(btn => 
        btn.getAttribute('title')?.includes('Grant') || btn.getAttribute('title')?.includes('Revoke')
      );
      
      if (firstCheckbox) {
        fireEvent.click(firstCheckbox);
        expect(screen.getByText(/You have unsaved changes/i)).toBeInTheDocument();
      }
    });
  });

  it('should show save button when there are changes', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      const saveButton = screen.getByText(/Save Changes/i);
      expect(saveButton).toBeInTheDocument();
      expect(saveButton).toBeDisabled(); // Initially disabled (no changes)
    });
  });

  it('should show reset to defaults button', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Reset to Defaults/i)).toBeInTheDocument();
    });
  });

  it('should display role summary cards', async () => {
    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Admin/i)).toBeInTheDocument();
      expect(screen.getByText(/PM/i)).toBeInTheDocument();
      expect(screen.getByText(/Regular/i)).toBeInTheDocument();
      expect(screen.getByText(/Stakeholder/i)).toBeInTheDocument();
      expect(screen.getByText(/3 Amigos/i)).toBeInTheDocument();
    });
  });

  it('should handle table not existing gracefully', async () => {
    // Mock table doesn't exist
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        limit: vi.fn(() => ({
          data: null,
          error: { code: 'PGRST116' }
        }))
      }))
    });

    await act(async () => {
      render(<RoleAccess />);
    });

    await waitFor(() => {
      // Should still render with default permissions
      expect(screen.getByText(/Role Access Management/i)).toBeInTheDocument();
    });
  });

  it('should show loading state initially', async () => {
    // Mock slow loading
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        order: vi.fn(() => 
          new Promise(resolve => {
            setTimeout(() => resolve({ data: [], error: null }), 100);
          })
        )
      }))
    });

    const { container } = render(<RoleAccess />);
    
    // Should show loading initially
    expect(container.textContent).toContain('Loading');
    
    await waitFor(() => {
      expect(screen.getByText(/Role Access Management/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});

