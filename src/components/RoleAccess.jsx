import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertCircle, Save, Check, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { supabase } from '../utils/supabaseApi';
import { MODULES, ROLE_PERMISSIONS, clearPermissionsCache } from '../config/permissions';

/**
 * Role Access Component
 * Matrix-based permission management: Roles x Modules
 * Allows admin to configure which modules each role can access
 */
const RoleAccess = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Get all available roles
  const roles = [
    { id: 'admin', label: 'Admin', color: 'rose' },
    { id: 'pm', label: 'PM', color: 'blue' },
    { id: '3amigos', label: '3 Amigos', color: 'cyan' },
    { id: 'stakeholder', label: 'Stakeholder', color: 'amber' },
    { id: 'regular', label: 'Regular', color: 'slate' }
  ];

  // Get all modules with their display info
  const modules = [
    { id: MODULES.OVERALL, label: 'Overall', category: 'Core' },
    { id: MODULES.PRODUCT, label: 'Product Roadmap', category: 'Core' },
    { id: MODULES.DELIVERY, label: 'Delivery Roadmap', category: 'Core' },
    { id: MODULES.STRATA, label: 'Strata Mapping', category: 'Core' },
    { id: MODULES.KPIS, label: 'KPIs', category: 'Metrics' },
    { id: MODULES.SOFTWARE_ENGINEERING_BENCHMARKS, label: 'Software Engineering Benchmark', category: 'Metrics' },
    { id: MODULES.PM, label: 'PM Section', category: 'PM', isGroup: true },
    { id: MODULES.PROJECTS_METRICS, label: 'Project Metrics', category: 'PM' },
    { id: MODULES.DEVELOPER_METRICS, label: 'Developer Metrics', category: 'PM' },
    { id: MODULES.TEAM_CAPACITY, label: 'Team Capacity', category: 'PM' },
    { id: MODULES.THREE_AMIGOS, label: '3 Amigos Section', category: '3 Amigos', isGroup: true },
    { id: MODULES.TEAM_ALLOCATION, label: 'Team Allocation', category: '3 Amigos' },
    { id: MODULES.ADMIN, label: 'Admin Section', category: 'Admin', isGroup: true },
    { id: MODULES.USER_ADMIN, label: 'User Administration', category: 'Admin' },
    { id: MODULES.ROLE_ACCESS, label: 'Role Access', category: 'Admin' }
  ];

  // Group modules by category
  const modulesByCategory = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = [];
    }
    acc[module.category].push(module);
    return acc;
  }, {});

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      if (!supabase) {
        console.warn('[RoleAccess] Supabase not configured, using default permissions');
        initializeDefaultPermissions();
        return;
      }

      // Try to load custom permissions from Supabase
      const { data, error } = await supabase
        .from('role_permission_config')
        .select('role, modules')
        .order('role');

      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        console.warn('[RoleAccess] Error loading permissions (table may not exist):', error);
        initializeDefaultPermissions();
        return;
      }

      if (data && data.length > 0) {
        // Convert database format to permissions matrix
        const perms = {};
        data.forEach(item => {
          perms[item.role] = item.modules || [];
        });
        setPermissions(perms);
      } else {
        // No custom permissions found, use defaults
        initializeDefaultPermissions();
      }
    } catch (error) {
      console.error('[RoleAccess] Error loading permissions:', error);
      initializeDefaultPermissions();
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultPermissions = () => {
    // Initialize with default permissions from config
    const perms = {};
    roles.forEach(role => {
      perms[role.id] = ROLE_PERMISSIONS[role.id] || [];
    });
    setPermissions(perms);
  };

  const togglePermission = (roleId, moduleId) => {
    const currentModules = permissions[roleId] || [];
    const newModules = currentModules.includes(moduleId)
      ? currentModules.filter(m => m !== moduleId)
      : [...currentModules, moduleId];

    setPermissions({
      ...permissions,
      [roleId]: newModules
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const toggleAllForRole = (roleId) => {
    const currentModules = permissions[roleId] || [];
    const allModules = modules.map(m => m.id);
    const hasAll = allModules.every(m => currentModules.includes(m));

    setPermissions({
      ...permissions,
      [roleId]: hasAll ? [] : allModules
    });
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const toggleAllForModule = (moduleId) => {
    const newPermissions = { ...permissions };
    const allRolesHaveAccess = roles.every(role => 
      (permissions[role.id] || []).includes(moduleId)
    );

    roles.forEach(role => {
      const currentModules = newPermissions[role.id] || [];
      if (allRolesHaveAccess) {
        // Remove from all
        newPermissions[role.id] = currentModules.filter(m => m !== moduleId);
      } else {
        // Add to all
        if (!currentModules.includes(moduleId)) {
          newPermissions[role.id] = [...currentModules, moduleId];
        }
      }
    });

    setPermissions(newPermissions);
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all permissions to default values? This will discard any unsaved changes.')) {
      initializeDefaultPermissions();
      setHasChanges(false);
      setSaveSuccess(false);
    }
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      if (!supabase) {
        console.warn('[RoleAccess] Supabase not configured, cannot save permissions');
        alert('Supabase is not configured. Permissions cannot be saved to database.');
        return;
      }

      // Check if table exists, if not create it first
      const { error: checkError } = await supabase
        .from('role_permission_config')
        .select('role')
        .limit(1);

      if (checkError && checkError.code === 'PGRST116') {
        // Table doesn't exist, we'll need to create it via migration
        console.warn('[RoleAccess] Table role_permission_config does not exist. Please run the migration first.');
        alert('The role_permission_config table does not exist. Please run the database migration first.\n\nSee docs/supabase/12_create_role_permission_config.sql');
        return;
      }

      // Prepare data for upsert
      const records = roles.map(role => ({
        role: role.id,
        modules: permissions[role.id] || [],
        updated_at: new Date().toISOString()
      }));

      // Upsert all permissions
      const { error } = await supabase
        .from('role_permission_config')
        .upsert(records, { onConflict: 'role' });

      if (error) {
        console.error('[RoleAccess] Error saving permissions:', error);
        alert('Error saving permissions: ' + error.message);
      } else {
        setHasChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        // Clear cache so new permissions are loaded immediately
        clearPermissionsCache();
        console.log('[RoleAccess] Permissions saved successfully');
      }
    } catch (error) {
      console.error('[RoleAccess] Error:', error);
      alert('Error saving permissions: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const hasPermission = (roleId, moduleId) => {
    return (permissions[roleId] || []).includes(moduleId);
  };

  const getRoleColor = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role?.color || 'slate';
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-slate-400 text-lg">Loading permissions matrix...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-8 border border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Role Access Management</h2>
            <p className="text-slate-400 text-sm">
              Configure which modules each role can access. Changes are saved to the database.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500/50 transition-colors text-sm flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Reset to Defaults
            </button>
            <button
              onClick={savePermissions}
              disabled={!hasChanges || saving}
              className={`px-4 py-2 rounded-lg border transition-colors text-sm flex items-center gap-2 ${
                hasChanges && !saving
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                  : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  Saved!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Alert */}
        <div className="glass rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 flex items-start gap-3">
          <Shield className="text-blue-400 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="text-blue-400 font-semibold text-sm mb-1">Permission Matrix</p>
            <p className="text-slate-300 text-sm">
              Check/uncheck boxes to grant or revoke access. Click column headers to toggle all roles for a module, 
              or row headers to toggle all modules for a role. Changes take effect after saving.
            </p>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-4 glass rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2">
            <AlertCircle className="text-amber-400" size={18} />
            <p className="text-amber-400 text-sm">You have unsaved changes. Click "Save Changes" to apply them.</p>
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="glass rounded-2xl p-6 border border-slate-700/50 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left py-3 px-4 text-slate-400 font-semibold text-sm sticky left-0 bg-slate-900/95 z-10">
                Module / Role
              </th>
              {roles.map(role => (
                <th
                  key={role.id}
                  className="text-center py-3 px-4 text-slate-400 font-semibold text-sm min-w-[120px] cursor-pointer hover:bg-slate-800/50 transition-colors"
                  onClick={() => toggleAllForRole(role.id)}
                  title={`Toggle all modules for ${role.label}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.label}</span>
                    <span className="text-xs text-slate-500">({(permissions[role.id] || []).length})</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
              <React.Fragment key={category}>
                <tr>
                  <td colSpan={roles.length + 1} className="py-2 px-4 bg-slate-800/30">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {category}
                    </span>
                  </td>
                </tr>
                {categoryModules.map(module => (
                  <tr
                    key={module.id}
                    className="border-b border-slate-700/30 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-4 text-white sticky left-0 bg-slate-900/95 z-10">
                      <div className="flex items-center gap-2">
                        {module.isGroup && (
                          <Shield size={14} className="text-cyan-400" />
                        )}
                        <span className={module.isGroup ? 'font-semibold text-cyan-400' : ''}>
                          {module.label}
                        </span>
                      </div>
                    </td>
                    {roles.map(role => {
                      const hasAccess = hasPermission(role.id, module.id);
                      const roleColor = getRoleColor(role.id);
                      
                      // Map color names to Tailwind classes
                      const colorClasses = {
                        rose: hasAccess ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30' : '',
                        blue: hasAccess ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30' : '',
                        cyan: hasAccess ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30' : '',
                        amber: hasAccess ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30' : '',
                        slate: hasAccess ? 'bg-slate-500/20 border-slate-500/50 text-slate-400 hover:bg-slate-500/30' : ''
                      };
                      
                      return (
                        <td
                          key={`${role.id}-${module.id}`}
                          className="text-center py-3 px-4"
                        >
                          <button
                            onClick={() => togglePermission(role.id, module.id)}
                            className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center mx-auto ${
                              hasAccess
                                ? colorClasses[roleColor] || 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30'
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                            }`}
                            title={`${hasAccess ? 'Revoke' : 'Grant'} ${module.label} access for ${role.label}`}
                          >
                            {hasAccess && <Check size={16} />}
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleAllForModule(module.id)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        title={`Toggle ${module.label} for all roles`}
                      >
                        All
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {roles.map(role => {
          const roleColor = getRoleColor(role.id);
          const badgeClasses = {
            rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
            blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
          };
          
          return (
            <div
              key={role.id}
              className="glass rounded-lg p-4 border border-slate-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-white text-sm">{role.label}</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${badgeClasses[roleColor] || badgeClasses.slate}`}>
                  {(permissions[role.id] || []).length}
                </span>
              </div>
              <p className="text-slate-400 text-xs">
                {(permissions[role.id] || []).length} module{(permissions[role.id] || []).length !== 1 ? 's' : ''} enabled
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoleAccess;
