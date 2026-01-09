/**
 * Helper centralizado para manejo de estatus
 * Reemplaza todas las funciones dispersas isDone, isDevDone, etc.
 * 
 * DISEÑO EXTENSIBLE: Este helper está diseñado para facilitar implementaciones futuras:
 * - Reportes avanzados pueden usar estas funciones para filtrar por estatus
 * - KPIs faltantes (Cycle Time, Rework Rate) pueden usar estas funciones para detectar transiciones
 * - Dashboard de salud puede extender con nuevas categorías sin cambiar código existente
 * 
 * Uso:
 *   import { isCompletedStatus, isDevDoneStatus, isProductionDoneStatus } from './statusHelper.js';
 *   const isDone = await isCompletedStatus(status, true); // incluye DEV DONE
 * 
 * FUTURO: Agregar funciones como:
 *   - detectStatusTransition(issueId, fromStatus, toStatus) - para Rework Rate
 *   - getStatusCategory(status) - para reportes por categoría
 *   - isBlockedStatus(status) - para dashboard de salud
 */

import { supabase } from './supabaseApi.js';

let statusCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carga definiciones de estatus desde Supabase o usa defaults
 */
async function loadStatusDefinitions(forceRefresh = false) {
  const now = Date.now();
  
  if (!forceRefresh && statusCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_TTL) {
    return statusCache;
  }
  
  try {
    const { data, error } = await supabase
      .from('status_definitions')
      .select('*')
      .order('display_order');
    
    if (error) {
      console.warn('[StatusHelper] Error loading status definitions, using defaults:', error);
      return getDefaultStatusDefinitions();
    }
    
    // Crear mapa por normalized_name para búsqueda rápida
    const definitionsMap = {};
    (data || []).forEach(def => {
      definitionsMap[def.normalized_name] = {
        isCompleted: def.is_completed,
        isDevDone: def.is_dev_done,
        isProductionDone: def.is_production_done,
        category: def.category,
        displayOrder: def.display_order
      };
    });
    
    statusCache = definitionsMap;
    cacheTimestamp = now;
    
    return statusCache;
  } catch (error) {
    console.warn('[StatusHelper] Exception loading status definitions, using defaults:', error);
    return getDefaultStatusDefinitions();
  }
}

/**
 * Defaults si no se puede cargar desde BD
 */
function getDefaultStatusDefinitions() {
  return {
    'DONE': { isCompleted: true, isDevDone: false, isProductionDone: true, category: 'done' },
    'DEVELOPMENT DONE': { isCompleted: true, isDevDone: true, isProductionDone: false, category: 'done' },
    'DEV DONE': { isCompleted: true, isDevDone: true, isProductionDone: false, category: 'done' },
    'RESOLVED': { isCompleted: true, isDevDone: false, isProductionDone: true, category: 'done' },
    'CLOSED': { isCompleted: true, isDevDone: false, isProductionDone: true, category: 'done' },
    'COMPLETED': { isCompleted: true, isDevDone: false, isProductionDone: true, category: 'done' },
    'TO DO': { isCompleted: false, isDevDone: false, isProductionDone: false, category: 'todo' },
    'IN PROGRESS': { isCompleted: false, isDevDone: false, isProductionDone: false, category: 'in_progress' },
    'BLOCKED': { isCompleted: false, isDevDone: false, isProductionDone: false, category: 'blocked' }
  };
}

/**
 * Normaliza estatus a formato estándar
 */
function normalizeStatus(status) {
  if (!status) return null;
  return status.trim().toUpperCase();
}

/**
 * Verifica si un estatus se considera "completado"
 * @param {string} status - Estatus a verificar
 * @param {boolean} includeDevDone - Si true, incluye "DEVELOPMENT DONE" como completado
 * @returns {Promise<boolean>}
 */
export async function isCompletedStatus(status, includeDevDone = true) {
  const definitions = await loadStatusDefinitions();
  const normalized = normalizeStatus(status);
  
  if (!normalized) return false;
  
  const def = definitions[normalized];
  if (def) {
    return includeDevDone 
      ? (def.isCompleted || def.isDevDone)
      : def.isProductionDone;
  }
  
  // Fallback: buscar por substring si no está en definiciones
  if (normalized.includes('DONE') && !normalized.includes('TO DO') && !normalized.includes('TODO')) {
    return includeDevDone ? true : normalized === 'DONE';
  }
  
  return false;
}

/**
 * Verifica si un estatus es "Development Done" (no producción)
 * @param {string} status - Estatus a verificar
 * @returns {Promise<boolean>}
 */
export async function isDevDoneStatus(status) {
  const definitions = await loadStatusDefinitions();
  const normalized = normalizeStatus(status);
  
  if (!normalized) return false;
  
  const def = definitions[normalized];
  return def?.isDevDone || false;
}

/**
 * Verifica si un estatus es "Production Done" (completado en producción)
 * @param {string} status - Estatus a verificar
 * @returns {Promise<boolean>}
 */
export async function isProductionDoneStatus(status) {
  const definitions = await loadStatusDefinitions();
  const normalized = normalizeStatus(status);
  
  if (!normalized) return false;
  
  const def = definitions[normalized];
  return def?.isProductionDone || false;
}

/**
 * Versión síncrona para casos donde no se puede usar async
 * Usa cache o defaults
 */
export function isCompletedStatusSync(status, includeDevDone = true) {
  const definitions = statusCache || getDefaultStatusDefinitions();
  const normalized = normalizeStatus(status);
  
  if (!normalized) return false;
  
  const def = definitions[normalized];
  if (def) {
    return includeDevDone 
      ? (def.isCompleted || def.isDevDone)
      : def.isProductionDone;
  }
  
  // Fallback
  if (normalized.includes('DONE') && !normalized.includes('TO DO') && !normalized.includes('TODO')) {
    return includeDevDone ? true : normalized === 'DONE';
  }
  
  return false;
}

/**
 * Versión síncrona de isDevDoneStatus para casos donde no se puede usar async
 * Usa cache o defaults
 * @param {string} status - Estatus a verificar
 * @returns {boolean} True si es Development Done
 */
export function isDevDoneStatusSync(status) {
  const definitions = statusCache || getDefaultStatusDefinitions();
  const normalized = normalizeStatus(status);
  
  if (!normalized) return false;
  
  const def = definitions[normalized];
  if (def) {
    return def.isDevDone || false;
  }
  
  // Fallback: buscar por substring si no está en definiciones
  if (normalized.includes('DEVELOPMENT DONE') || 
      normalized.includes('DEV DONE') ||
      (normalized.includes('DONE') && !normalized.includes('TO DO') && !normalized.includes('TODO') && normalized !== 'DONE')) {
    return true;
  }
  
  return false;
}
