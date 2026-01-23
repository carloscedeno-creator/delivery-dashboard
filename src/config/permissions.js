/**
 * Configuración de permisos por rol
 * Define qué módulos puede ver cada rol
 */

export const MODULES = {
  OVERALL: 'overall',
  PRODUCT: 'product',
  DELIVERY: 'delivery',
  STRATA: 'strata',
  ADMIN: 'admin', // Admin section (groups User Administration, Role Access)
  USER_ADMIN: 'user-admin',
  ROLE_ACCESS: 'role-access',
  PM: 'pm', // PM section (groups Project Metrics, Developer Metrics, Team Capacity, Developer Burndown)
  PROJECTS_METRICS: 'projects-metrics',
  DEVELOPER_METRICS: 'developer-metrics',
  DEVELOPER_BURNDOWN: 'developer-burndown',
  TEAM_CAPACITY: 'team-capacity',
  THREE_AMIGOS: 'three-amigos', // 3 Amigos section (groups Team Allocation, Product Department KPIs, ENPS Survey Management)
  TEAM_ALLOCATION: 'team-allocation',
  PRODUCT_DEPARTMENT_KPIS: 'product-department-kpis', // Product Department KPIs table
  ENPS_SURVEY_MANAGEMENT: 'enps-survey-management', // eNPS Survey Management in 3 Amigos
  KPIS: 'kpis', // KPIs section (groups Delivery KPIs, Technical KPIs, Product KPIs)
  DELIVERY_KPIS: 'delivery-kpis', // Delivery KPIs (with filters)
  TECHNICAL_KPIS: 'technical-kpis', // Technical KPIs (Quality)
  PRODUCT_KPIS: 'product-kpis', // Product KPIs
  SOFTWARE_ENGINEERING_BENCHMARKS: 'software-engineering-benchmarks',
  ENPS_SURVEY: 'enps-survey' // eNPS Survey for developers
};

/**
 * Permisos por rol
 * Cada rol tiene un array de módulos que puede acceder
 */
export const ROLE_PERMISSIONS = {
  // admin: puede ver todo, incluyendo Admin section, PM section, 3 Amigos section, y User Administration
  admin: [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.ADMIN, // Admin section (includes User Administration, Role Access)
    MODULES.USER_ADMIN,
    MODULES.ROLE_ACCESS,
    MODULES.PM, // PM section (includes Project Metrics, Developer Metrics, Team Capacity, Developer Burndown)
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.DEVELOPER_BURNDOWN,
    MODULES.TEAM_CAPACITY,
    MODULES.THREE_AMIGOS, // 3 Amigos section (includes Team Allocation, Product Department KPIs, ENPS Survey Management)
    MODULES.TEAM_ALLOCATION,
    MODULES.PRODUCT_DEPARTMENT_KPIS,
    MODULES.ENPS_SURVEY_MANAGEMENT,
    MODULES.KPIS, // KPIs section (includes Delivery KPIs, Technical KPIs, Product KPIs)
    MODULES.DELIVERY_KPIS,
    MODULES.TECHNICAL_KPIS,
    MODULES.PRODUCT_KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS,
    MODULES.ENPS_SURVEY // Team Survey (eNPS)
  ],
  
  // stakeholder: puede ver todo EXCEPTO User Administration
  stakeholder: [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.KPIS, // KPIs section (includes Delivery KPIs, Technical KPIs, Product KPIs)
    MODULES.DELIVERY_KPIS,
    MODULES.TECHNICAL_KPIS,
    MODULES.PRODUCT_KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ],
  
  // regular: solo puede ver Overview (temporalmente incluye KPIs para desarrollo)
  regular: [
    MODULES.OVERALL,
    MODULES.KPIS, // KPIs section (includes Delivery KPIs, Technical KPIs, Product KPIs)
    MODULES.DELIVERY_KPIS,
    MODULES.TECHNICAL_KPIS,
    MODULES.PRODUCT_KPIS
  ],
  
  // 3amigos: puede ver todo EXCEPTO User Administration, incluye PM y 3 Amigos section
  '3amigos': [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.PM, // PM section (includes Project Metrics, Developer Metrics, Team Capacity, Developer Burndown)
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.DEVELOPER_BURNDOWN,
    MODULES.TEAM_CAPACITY,
    MODULES.THREE_AMIGOS, // 3 Amigos section (includes Team Allocation, Product Department KPIs, ENPS Survey Management)
    MODULES.TEAM_ALLOCATION,
    MODULES.PRODUCT_DEPARTMENT_KPIS,
    MODULES.ENPS_SURVEY_MANAGEMENT,
    MODULES.KPIS, // KPIs section (includes Delivery KPIs, Technical KPIs, Product KPIs)
    MODULES.DELIVERY_KPIS,
    MODULES.TECHNICAL_KPIS,
    MODULES.PRODUCT_KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ],
  
  // pm: puede ver todo EXCEPTO User Administration, incluye PM section y 3 Amigos section
  pm: [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.PM, // PM section (includes Project Metrics, Developer Metrics, Team Capacity, Developer Burndown)
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.DEVELOPER_BURNDOWN,
    MODULES.TEAM_CAPACITY,
    MODULES.THREE_AMIGOS, // 3 Amigos section (includes Team Allocation, Product Department KPIs, ENPS Survey Management)
    MODULES.TEAM_ALLOCATION,
    MODULES.PRODUCT_DEPARTMENT_KPIS,
    MODULES.ENPS_SURVEY_MANAGEMENT,
    MODULES.KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ],
  
  // developer: puede ver Overview y responder encuesta eNPS
  developer: [
    MODULES.OVERALL,
    MODULES.ENPS_SURVEY
  ]
};

// Cache for custom permissions loaded from database
let customPermissionsCache = null;
let customPermissionsCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Load custom permissions from Supabase (if available)
 * This allows admins to override default permissions
 * @returns {Promise<Object|null>} Object with role -> modules mapping, or null if not available
 */
export const loadCustomPermissions = async () => {
  // Check cache first
  if (customPermissionsCache && customPermissionsCacheTime && 
      Date.now() - customPermissionsCacheTime < CACHE_DURATION) {
    return customPermissionsCache;
  }

  try {
    // Dynamic import to avoid issues if Supabase is not configured
    const { supabase } = await import('../utils/supabaseApi.js');
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('role_permission_config')
      .select('role, modules');

    if (error) {
      // Table might not exist, that's okay - use defaults
      if (error.code === 'PGRST116') {
        console.log('[Permissions] Custom permissions table does not exist, using defaults');
      } else {
        console.warn('[Permissions] Error loading custom permissions:', error);
      }
      return null;
    }

    if (data && data.length > 0) {
      const perms = {};
      data.forEach(item => {
        perms[item.role] = item.modules || [];
      });
      customPermissionsCache = perms;
      customPermissionsCacheTime = Date.now();
      return perms;
    }

    return null;
  } catch (error) {
    console.warn('[Permissions] Error loading custom permissions:', error);
    return null;
  }
};

/**
 * Clear the custom permissions cache
 * Call this after saving permissions to refresh immediately
 */
export const clearPermissionsCache = () => {
  customPermissionsCache = null;
  customPermissionsCacheTime = null;
};

/**
 * Obtener módulos permitidos para un rol
 * Checks custom permissions from database first, then falls back to defaults
 * @param {string} role - Rol del usuario
 * @returns {Promise<string[]>} Array de módulos permitidos
 */
export const getModulesForRole = async (role) => {
  if (!role) return [MODULES.OVERALL]; // Por defecto, solo Overview
  
  const normalizedRole = role.toLowerCase();
  
  // Try to load custom permissions
  const customPerms = await loadCustomPermissions();
  if (customPerms && customPerms[normalizedRole]) {
    const modules = [...customPerms[normalizedRole]];
    
    // Si el rol tiene acceso a PM, también incluir automáticamente los sub-módulos
    if (modules.includes(MODULES.PM)) {
      if (!modules.includes(MODULES.PROJECTS_METRICS)) modules.push(MODULES.PROJECTS_METRICS);
      if (!modules.includes(MODULES.DEVELOPER_METRICS)) modules.push(MODULES.DEVELOPER_METRICS);
      if (!modules.includes(MODULES.DEVELOPER_BURNDOWN)) modules.push(MODULES.DEVELOPER_BURNDOWN);
      if (!modules.includes(MODULES.TEAM_CAPACITY)) modules.push(MODULES.TEAM_CAPACITY);
    }
    
    // Si el rol tiene acceso a THREE_AMIGOS, también incluir automáticamente los sub-módulos
    if (modules.includes(MODULES.THREE_AMIGOS)) {
      if (!modules.includes(MODULES.TEAM_ALLOCATION)) modules.push(MODULES.TEAM_ALLOCATION);
      if (!modules.includes(MODULES.PRODUCT_DEPARTMENT_KPIS)) modules.push(MODULES.PRODUCT_DEPARTMENT_KPIS);
      if (!modules.includes(MODULES.ENPS_SURVEY_MANAGEMENT)) modules.push(MODULES.ENPS_SURVEY_MANAGEMENT);
    }
    
    return modules;
  }
  
  // Fall back to default permissions
  const modules = ROLE_PERMISSIONS[normalizedRole] || [MODULES.OVERALL];
  
  // Si el rol tiene acceso a PM, también incluir automáticamente los sub-módulos
  if (modules.includes(MODULES.PM)) {
    if (!modules.includes(MODULES.PROJECTS_METRICS)) modules.push(MODULES.PROJECTS_METRICS);
    if (!modules.includes(MODULES.DEVELOPER_METRICS)) modules.push(MODULES.DEVELOPER_METRICS);
    if (!modules.includes(MODULES.DEVELOPER_BURNDOWN)) modules.push(MODULES.DEVELOPER_BURNDOWN);
    if (!modules.includes(MODULES.TEAM_CAPACITY)) modules.push(MODULES.TEAM_CAPACITY);
  }
  
  return modules;
};

/**
 * Synchronous version for backward compatibility
 * Uses cached custom permissions if available, otherwise defaults
 * @param {string} role - Rol del usuario
 * @returns {string[]} Array de módulos permitidos
 */
export const getModulesForRoleSync = (role) => {
  if (!role) return [MODULES.OVERALL];
  
  const normalizedRole = role.toLowerCase();
  
  // Check cache first
  if (customPermissionsCache && customPermissionsCache[normalizedRole]) {
    const modules = [...customPermissionsCache[normalizedRole]];
    if (modules.includes(MODULES.PM)) {
      if (!modules.includes(MODULES.PROJECTS_METRICS)) modules.push(MODULES.PROJECTS_METRICS);
      if (!modules.includes(MODULES.DEVELOPER_METRICS)) modules.push(MODULES.DEVELOPER_METRICS);
      if (!modules.includes(MODULES.DEVELOPER_BURNDOWN)) modules.push(MODULES.DEVELOPER_BURNDOWN);
      if (!modules.includes(MODULES.TEAM_CAPACITY)) modules.push(MODULES.TEAM_CAPACITY);
    }
    return modules;
  }
  
  // Fall back to defaults
  const modules = ROLE_PERMISSIONS[normalizedRole] || [MODULES.OVERALL];
  if (modules.includes(MODULES.PM)) {
    if (!modules.includes(MODULES.PROJECTS_METRICS)) modules.push(MODULES.PROJECTS_METRICS);
    if (!modules.includes(MODULES.DEVELOPER_METRICS)) modules.push(MODULES.DEVELOPER_METRICS);
    if (!modules.includes(MODULES.DEVELOPER_BURNDOWN)) modules.push(MODULES.DEVELOPER_BURNDOWN);
    if (!modules.includes(MODULES.TEAM_CAPACITY)) modules.push(MODULES.TEAM_CAPACITY);
  }
  
  return modules;
};

/**
 * Verificar si un rol puede acceder a un módulo (synchronous)
 * @param {string} role - Rol del usuario
 * @param {string} module - Módulo a verificar
 * @returns {boolean}
 */
export const canAccessModule = (role, module) => {
  const modules = getModulesForRoleSync(role);
  return modules.includes(module);
};

/**
 * Obtener información de módulos para el Navbar (synchronous)
 * @param {string} role - Rol del usuario
 * @returns {Array} Array de objetos con información de módulos (puede incluir submenús)
 */
export const getNavbarModules = (role) => {
  const modules = getModulesForRoleSync(role);
  
  const moduleInfo = {
    [MODULES.OVERALL]: { id: 'overall', label: 'Overall', icon: 'Layout' },
    [MODULES.PRODUCT]: { id: 'product', label: 'Product Roadmap', icon: 'Box' },
    [MODULES.DELIVERY]: { id: 'delivery', label: 'Delivery Roadmap', icon: 'Truck' },
    [MODULES.STRATA]: { id: 'strata', label: 'Strata Mapping', icon: 'Map' },
    [MODULES.ADMIN]: { 
      id: 'admin', 
      label: 'Admin', 
      icon: 'Shield',
      hasSubmenu: true,
      submodules: [
        { id: 'user-admin', label: 'User Administration', icon: 'Users' },
        { id: 'role-access', label: 'Role Access', icon: 'Shield' }
      ]
    },
    [MODULES.USER_ADMIN]: { id: 'user-admin', label: 'User Administration', icon: 'Users' },
    [MODULES.ROLE_ACCESS]: { id: 'role-access', label: 'Role Access', icon: 'Shield' },
    [MODULES.PM]: { 
      id: 'pm', 
      label: 'PM', 
      icon: 'BarChart',
      hasSubmenu: true,
      submodules: [
        { id: 'projects-metrics', label: 'Project Metrics', icon: 'BarChart' },
        { id: 'developer-metrics', label: 'Developer Metrics', icon: 'Activity' },
        { id: 'developer-burndown', label: 'Developer Burndown', icon: 'BarChart' },
        { id: 'team-capacity', label: 'Team Capacity', icon: 'UserCheck' }
      ]
    },
    [MODULES.PROJECTS_METRICS]: { id: 'projects-metrics', label: 'Projects Metrics', icon: 'BarChart' },
    [MODULES.DEVELOPER_METRICS]: { id: 'developer-metrics', label: 'Developer Metrics', icon: 'Activity' },
    [MODULES.DEVELOPER_BURNDOWN]: { id: 'developer-burndown', label: 'Developer Burndown', icon: 'BarChart' },
    [MODULES.TEAM_CAPACITY]: { id: 'team-capacity', label: 'Team Capacity', icon: 'UserCheck' },
    [MODULES.THREE_AMIGOS]: { 
      id: 'three-amigos', 
      label: '3 Amigos', 
      icon: 'GitBranch',
      hasSubmenu: true,
      submodules: [
        { id: 'team-allocation', label: 'Team Allocation', icon: 'BarChart' },
        { id: 'product-department-kpis', label: 'Product Raw Manual Raw Data', icon: 'TrendingUp' },
        { id: 'enps-survey-management', label: 'eNPS Survey Management', icon: 'MessageSquare' }
      ]
    },
    [MODULES.TEAM_ALLOCATION]: { id: 'team-allocation', label: 'Team Allocation', icon: 'BarChart' },
    [MODULES.PRODUCT_DEPARTMENT_KPIS]: { id: 'product-department-kpis', label: 'Product Raw Manual Raw Data', icon: 'TrendingUp' },
    [MODULES.ENPS_SURVEY_MANAGEMENT]: { id: 'enps-survey-management', label: 'eNPS Survey Management', icon: 'MessageSquare' },
    [MODULES.KPIS]: { 
      id: 'kpis', 
      label: 'KPIs', 
      icon: 'Gauge',
      hasSubmenu: true,
      submodules: [
        { id: 'delivery-kpis', label: 'Delivery KPIs', icon: 'Truck' },
        { id: 'technical-kpis', label: 'Technical KPIs', icon: 'Shield' },
        { id: 'product-kpis', label: 'Product KPIs', icon: 'TrendingUp' }
      ]
    },
    [MODULES.DELIVERY_KPIS]: { id: 'delivery-kpis', label: 'Delivery KPIs', icon: 'Truck' },
    [MODULES.TECHNICAL_KPIS]: { id: 'technical-kpis', label: 'Technical KPIs', icon: 'Shield' },
    [MODULES.PRODUCT_KPIS]: { id: 'product-kpis', label: 'Product KPIs', icon: 'TrendingUp' },
    [MODULES.SOFTWARE_ENGINEERING_BENCHMARKS]: { id: 'software-engineering-benchmarks', label: 'Software Engineering Benchmark', icon: 'TrendingUp' },
    [MODULES.ENPS_SURVEY]: { id: 'enps-survey', label: 'Team Survey', icon: 'MessageSquare' }
  };
  
  // Si el usuario tiene acceso a ADMIN, agrupar los sub-módulos dentro de ADMIN
  // Si el usuario tiene acceso a PM, agrupar los sub-módulos dentro de PM
  // Si no tiene acceso a estos grupos pero tiene acceso a los sub-módulos individuales, mostrarlos por separado
  const hasAdmin = modules.includes(MODULES.ADMIN);
  const hasPM = modules.includes(MODULES.PM);
  const hasProjectsMetrics = modules.includes(MODULES.PROJECTS_METRICS);
  const hasDeveloperMetrics = modules.includes(MODULES.DEVELOPER_METRICS);
  const hasTeamCapacity = modules.includes(MODULES.TEAM_CAPACITY);
  const hasUserAdmin = modules.includes(MODULES.USER_ADMIN);
  const hasRoleAccess = modules.includes(MODULES.ROLE_ACCESS);
  
  let result = modules;
  
  const hasThreeAmigos = modules.includes(MODULES.THREE_AMIGOS);
  const hasTeamAllocation = modules.includes(MODULES.TEAM_ALLOCATION);
  
  // Si tiene ADMIN, excluir USER_ADMIN y ROLE_ACCESS individuales (se agrupan en ADMIN)
  if (hasAdmin) {
    result = result.filter(module => 
      module !== MODULES.USER_ADMIN && 
      module !== MODULES.ROLE_ACCESS
    );
  }
  
  // Si tiene PM, excluir PROJECTS_METRICS, DEVELOPER_METRICS, DEVELOPER_BURNDOWN y TEAM_CAPACITY individuales (se agrupan en PM)
  if (hasPM) {
    result = result.filter(module => 
      module !== MODULES.PROJECTS_METRICS && 
      module !== MODULES.DEVELOPER_METRICS && 
      module !== MODULES.DEVELOPER_BURNDOWN &&
      module !== MODULES.TEAM_CAPACITY
    );
  }
  
    // Si tiene THREE_AMIGOS, excluir sub-módulos individuales (se agrupan en THREE_AMIGOS)
    if (hasThreeAmigos) {
      result = result.filter(module => 
        module !== MODULES.TEAM_ALLOCATION &&
        module !== MODULES.PRODUCT_DEPARTMENT_KPIS &&
        module !== MODULES.ENPS_SURVEY_MANAGEMENT
      );
    }
  
  const hasKPIs = modules.includes(MODULES.KPIS);
  const hasDeliveryKPIs = modules.includes(MODULES.DELIVERY_KPIS);
  const hasTechnicalKPIs = modules.includes(MODULES.TECHNICAL_KPIS);
  const hasProductKPIs = modules.includes(MODULES.PRODUCT_KPIS);
  
  // Si tiene KPIS, excluir sub-módulos individuales (se agrupan en KPIS)
  if (hasKPIs) {
    result = result.filter(module => 
      module !== MODULES.DELIVERY_KPIS &&
      module !== MODULES.TECHNICAL_KPIS &&
      module !== MODULES.PRODUCT_KPIS
    );
  }
  
  return result.map(module => moduleInfo[module]).filter(Boolean);
};




