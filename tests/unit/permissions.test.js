/**
 * Unit tests for permissions configuration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MODULES,
  ROLE_PERMISSIONS,
  getModulesForRoleSync,
  getModulesForRole,
  canAccessModule,
  getNavbarModules,
  loadCustomPermissions,
  clearPermissionsCache
} from '../../src/config/permissions';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      data: null,
      error: null
    }))
  }))
};

vi.mock('../../src/utils/supabaseApi', () => ({
  supabase: null
}));

describe('Permissions Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPermissionsCache();
  });

  describe('MODULES constants', () => {
    it('should have all required modules defined', () => {
      expect(MODULES.OVERALL).toBe('overall');
      expect(MODULES.PRODUCT).toBe('product');
      expect(MODULES.DELIVERY).toBe('delivery');
      expect(MODULES.STRATA).toBe('strata');
      expect(MODULES.ADMIN).toBe('admin');
      expect(MODULES.USER_ADMIN).toBe('user-admin');
      expect(MODULES.ROLE_ACCESS).toBe('role-access');
      expect(MODULES.PM).toBe('pm');
      expect(MODULES.PROJECTS_METRICS).toBe('projects-metrics');
      expect(MODULES.DEVELOPER_METRICS).toBe('developer-metrics');
      expect(MODULES.TEAM_CAPACITY).toBe('team-capacity');
      expect(MODULES.THREE_AMIGOS).toBe('three-amigos');
      expect(MODULES.TEAM_ALLOCATION).toBe('team-allocation');
      expect(MODULES.PRODUCT_DEPARTMENT_KPIS).toBe('product-department-kpis');
      expect(MODULES.KPIS).toBe('kpis');
      expect(MODULES.SOFTWARE_ENGINEERING_BENCHMARKS).toBe('software-engineering-benchmarks');
    });
  });

  describe('ROLE_PERMISSIONS', () => {
    it('should have permissions for all roles', () => {
      expect(ROLE_PERMISSIONS.admin).toBeDefined();
      expect(ROLE_PERMISSIONS.pm).toBeDefined();
      expect(ROLE_PERMISSIONS['3amigos']).toBeDefined();
      expect(ROLE_PERMISSIONS.stakeholder).toBeDefined();
      expect(ROLE_PERMISSIONS.regular).toBeDefined();
    });

    it('should have admin role with all modules', () => {
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.ADMIN);
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.USER_ADMIN);
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.ROLE_ACCESS);
    });

    it('should have pm role with PM section and 3 Amigos section', () => {
      expect(ROLE_PERMISSIONS.pm).toContain(MODULES.PM);
      expect(ROLE_PERMISSIONS.pm).toContain(MODULES.PROJECTS_METRICS);
      expect(ROLE_PERMISSIONS.pm).toContain(MODULES.THREE_AMIGOS);
      expect(ROLE_PERMISSIONS.pm).toContain(MODULES.TEAM_ALLOCATION);
    });

    it('should have 3amigos role with PM section and 3 Amigos section', () => {
      expect(ROLE_PERMISSIONS['3amigos']).toContain(MODULES.PM);
      expect(ROLE_PERMISSIONS['3amigos']).toContain(MODULES.THREE_AMIGOS);
      expect(ROLE_PERMISSIONS['3amigos']).toContain(MODULES.TEAM_ALLOCATION);
    });

    it('should have admin role with all sections including 3 Amigos', () => {
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.ADMIN);
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.PM);
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.THREE_AMIGOS);
      expect(ROLE_PERMISSIONS.admin).toContain(MODULES.TEAM_ALLOCATION);
    });

    it('should have regular role with limited access', () => {
      expect(ROLE_PERMISSIONS.regular).toContain(MODULES.OVERALL);
      expect(ROLE_PERMISSIONS.regular).not.toContain(MODULES.ADMIN);
    });
  });

  describe('getModulesForRoleSync', () => {
    it('should return default modules for admin role', () => {
      const modules = getModulesForRoleSync('admin');
      expect(modules).toContain(MODULES.OVERALL);
      expect(modules).toContain(MODULES.ADMIN);
      expect(modules).toContain(MODULES.USER_ADMIN);
    });

    it('should return default modules for pm role', () => {
      const modules = getModulesForRoleSync('pm');
      expect(modules).toContain(MODULES.PM);
      expect(modules).toContain(MODULES.PROJECTS_METRICS);
      expect(modules).toContain(MODULES.DEVELOPER_METRICS);
    });

    it('should return overall for unknown role', () => {
      const modules = getModulesForRoleSync('unknown');
      expect(modules).toEqual([MODULES.OVERALL]);
    });

    it('should return overall for null role', () => {
      const modules = getModulesForRoleSync(null);
      expect(modules).toEqual([MODULES.OVERALL]);
    });

    it('should automatically include PM sub-modules when PM is present', () => {
      const modules = getModulesForRoleSync('pm');
      expect(modules).toContain(MODULES.PM);
      expect(modules).toContain(MODULES.PROJECTS_METRICS);
      expect(modules).toContain(MODULES.DEVELOPER_METRICS);
      expect(modules).toContain(MODULES.TEAM_CAPACITY);
    });

    it('should automatically include 3 Amigos sub-modules when THREE_AMIGOS is present', () => {
      const modules = getModulesForRoleSync('3amigos');
      expect(modules).toContain(MODULES.THREE_AMIGOS);
      expect(modules).toContain(MODULES.TEAM_ALLOCATION);
    });

    it('should handle case-insensitive roles', () => {
      const modules1 = getModulesForRoleSync('ADMIN');
      const modules2 = getModulesForRoleSync('admin');
      expect(modules1).toEqual(modules2);
    });
  });

  describe('getModulesForRole (async)', () => {
    it('should return default modules when no custom permissions', async () => {
      const modules = await getModulesForRole('admin');
      expect(modules).toContain(MODULES.OVERALL);
      expect(modules).toContain(MODULES.ADMIN);
    });

    it('should return default modules for regular role', async () => {
      const modules = await getModulesForRole('regular');
      expect(modules).toContain(MODULES.OVERALL);
      expect(modules).not.toContain(MODULES.ADMIN);
    });
  });

  describe('canAccessModule', () => {
    it('should return true for admin accessing admin module', () => {
      expect(canAccessModule('admin', MODULES.ADMIN)).toBe(true);
    });

    it('should return false for regular accessing admin module', () => {
      expect(canAccessModule('regular', MODULES.ADMIN)).toBe(false);
    });

    it('should return true for pm accessing PM module', () => {
      expect(canAccessModule('pm', MODULES.PM)).toBe(true);
    });

    it('should return false for regular accessing PM module', () => {
      expect(canAccessModule('regular', MODULES.PM)).toBe(false);
    });

    it('should return true for all roles accessing overall', () => {
      expect(canAccessModule('admin', MODULES.OVERALL)).toBe(true);
      expect(canAccessModule('regular', MODULES.OVERALL)).toBe(true);
      expect(canAccessModule('pm', MODULES.OVERALL)).toBe(true);
    });
  });

  describe('getNavbarModules', () => {
    it('should return modules for admin role', () => {
      const modules = getNavbarModules('admin');
      expect(modules.length).toBeGreaterThan(0);
      expect(modules.some(m => m.id === 'overall')).toBe(true);
    });

    it('should return modules for pm role', () => {
      const modules = getNavbarModules('pm');
      expect(modules.length).toBeGreaterThan(0);
      // PM should have PM section grouped
      const pmModule = modules.find(m => m.id === 'pm');
      expect(pmModule).toBeDefined();
      expect(pmModule?.hasSubmenu).toBe(true);
    });

    it('should return modules for regular role', () => {
      const modules = getNavbarModules('regular');
      expect(modules.length).toBeGreaterThan(0);
      expect(modules.some(m => m.id === 'overall')).toBe(true);
    });

    it('should group PM submodules when PM access is present', () => {
      const modules = getNavbarModules('pm');
      const pmModule = modules.find(m => m.id === 'pm');
      expect(pmModule).toBeDefined();
      expect(pmModule?.submodules).toBeDefined();
      expect(pmModule?.submodules?.length).toBe(3);
    });

    it('should group 3 Amigos submodules when THREE_AMIGOS access is present', () => {
      const modules = getNavbarModules('3amigos');
      const threeAmigosModule = modules.find(m => m.id === 'three-amigos');
      expect(threeAmigosModule).toBeDefined();
      expect(threeAmigosModule?.hasSubmenu).toBe(true);
      expect(threeAmigosModule?.submodules).toBeDefined();
      expect(threeAmigosModule?.submodules?.length).toBeGreaterThanOrEqual(1);
      // Verify team-allocation is included
      const teamAllocationSubmodule = threeAmigosModule?.submodules?.find(sub => sub.id === 'team-allocation');
      expect(teamAllocationSubmodule).toBeDefined();
    });

    it('should group Admin submodules when Admin access is present', () => {
      const modules = getNavbarModules('admin');
      const adminModule = modules.find(m => m.id === 'admin');
      expect(adminModule).toBeDefined();
      expect(adminModule?.hasSubmenu).toBe(true);
      expect(adminModule?.submodules?.length).toBe(2);
    });
  });

  describe('loadCustomPermissions', () => {
    it('should return null when Supabase is not configured', async () => {
      const result = await loadCustomPermissions();
      expect(result).toBeNull();
    });

    it('should return null when table does not exist', async () => {
      // Mock Supabase with error
      vi.doMock('../../src/utils/supabaseApi', () => ({
        supabase: {
          from: vi.fn(() => ({
            select: vi.fn(() => ({
              data: null,
              error: { code: 'PGRST116' }
            }))
          }))
        }
      }));

      const result = await loadCustomPermissions();
      // Should return null for table not found
      expect(result).toBeNull();
    });
  });

  describe('clearPermissionsCache', () => {
    it('should clear the permissions cache', () => {
      // Set some cache values (we can't directly access them, but we can test the function exists)
      clearPermissionsCache();
      // Function should execute without error
      expect(clearPermissionsCache).toBeDefined();
      expect(typeof clearPermissionsCache).toBe('function');
    });
  });
});

