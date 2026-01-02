/**
 * Configuración de permisos por rol
 * Define qué módulos puede ver cada rol
 */

export const MODULES = {
  OVERALL: 'overall',
  PRODUCT: 'product',
  DELIVERY: 'delivery',
  STRATA: 'strata',
  USER_ADMIN: 'user-admin',
  PROJECTS_METRICS: 'projects-metrics',
  DEVELOPER_METRICS: 'developer-metrics',
  KPIS: 'kpis',
  SOFTWARE_ENGINEERING_BENCHMARKS: 'software-engineering-benchmarks'
};

/**
 * Permisos por rol
 * Cada rol tiene un array de módulos que puede acceder
 */
export const ROLE_PERMISSIONS = {
  // admin: puede ver todo, incluyendo User Administration
  admin: [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.USER_ADMIN,
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ],
  
  // stakeholder: puede ver todo EXCEPTO User Administration
  stakeholder: [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ],
  
  // regular: solo puede ver Overview (temporalmente incluye KPIs para desarrollo)
  regular: [
    MODULES.OVERALL,
    MODULES.KPIS  // Temporal para desarrollo - remover en producción
  ],
  
  // 3amigos: puede ver todo EXCEPTO User Administration
  '3amigos': [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ],
  
  // pm: puede ver todo EXCEPTO User Administration, y tiene acceso a Projects Metrics y Developer Metrics
  pm: [
    MODULES.OVERALL,
    MODULES.PRODUCT,
    MODULES.DELIVERY,
    MODULES.STRATA,
    MODULES.PROJECTS_METRICS,
    MODULES.DEVELOPER_METRICS,
    MODULES.KPIS,
    MODULES.SOFTWARE_ENGINEERING_BENCHMARKS
  ]
};

/**
 * Obtener módulos permitidos para un rol
 * @param {string} role - Rol del usuario
 * @returns {string[]} Array de módulos permitidos
 */
export const getModulesForRole = (role) => {
  if (!role) return [MODULES.OVERALL]; // Por defecto, solo Overview
  
  const normalizedRole = role.toLowerCase();
  return ROLE_PERMISSIONS[normalizedRole] || [MODULES.OVERALL];
};

/**
 * Verificar si un rol puede acceder a un módulo
 * @param {string} role - Rol del usuario
 * @param {string} module - Módulo a verificar
 * @returns {boolean}
 */
export const canAccessModule = (role, module) => {
  const modules = getModulesForRole(role);
  return modules.includes(module);
};

/**
 * Obtener información de módulos para el Navbar
 * @param {string} role - Rol del usuario
 * @returns {Array} Array de objetos con información de módulos
 */
export const getNavbarModules = (role) => {
  const modules = getModulesForRole(role);
  
  const moduleInfo = {
    [MODULES.OVERALL]: { id: 'overall', label: 'Overall', icon: 'Layout' },
    [MODULES.PRODUCT]: { id: 'product', label: 'Product Roadmap', icon: 'Box' },
    [MODULES.DELIVERY]: { id: 'delivery', label: 'Delivery Roadmap', icon: 'Truck' },
    [MODULES.STRATA]: { id: 'strata', label: 'Strata Mapping', icon: 'Map' },
    [MODULES.USER_ADMIN]: { id: 'user-admin', label: 'User Administration', icon: 'Users' },
    [MODULES.PROJECTS_METRICS]: { id: 'projects-metrics', label: 'Projects Metrics', icon: 'BarChart' },
    [MODULES.DEVELOPER_METRICS]: { id: 'developer-metrics', label: 'Developer Metrics', icon: 'Activity' },
    [MODULES.KPIS]: { id: 'kpis', label: 'KPIs', icon: 'Gauge' },
    [MODULES.SOFTWARE_ENGINEERING_BENCHMARKS]: { id: 'software-engineering-benchmarks', label: 'Software Engineering Benchmark', icon: 'TrendingUp' }
  };
  
  return modules.map(module => moduleInfo[module]).filter(Boolean);
};




