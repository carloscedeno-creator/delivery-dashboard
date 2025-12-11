/**
 * Servicio de Supabase para obtener métricas de delivery
 * Conecta con la base de datos Supabase que se actualiza cada 30 minutos desde Jira
 */

import { createClient } from '@supabase/supabase-js';

// Configuración desde variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase no está configurado. Asegúrate de configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env');
}

// Crear cliente de Supabase
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Obtiene métricas de sprints desde Supabase
 * @param {string} projectKey - Clave del proyecto (default: 'OBD')
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Array>} Array de métricas de sprints
 */
export const getSprintMetrics = async (projectKey = 'OBD', options = {}) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    let query = supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .eq('project_name', projectKey.toUpperCase());

    // Ordenar por fecha de fin (más recientes primero)
    query = query.order('end_date', { ascending: false, nullsFirst: false });

    // Limitar resultados si se especifica
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Filtrar por estado si se especifica
    if (options.state) {
      query = query.eq('state', options.state);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SUPABASE] Error obteniendo métricas de sprints:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Error en getSprintMetrics:', error);
    throw error;
  }
};

/**
 * Obtiene métricas de desarrolladores por sprint
 * @param {string} projectKey - Clave del proyecto (default: 'OBD')
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Array>} Array de métricas de desarrolladores
 */
export const getDeveloperMetrics = async (projectKey = 'OBD', options = {}) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    let query = supabase
      .from('v_developer_sprint_metrics_complete')
      .select('*')
      .eq('project_name', projectKey.toUpperCase());

    // Ordenar por sprint y desarrollador
    query = query.order('sprint_name', { ascending: false });
    query = query.order('developer_name', { ascending: true });

    // Limitar resultados si se especifica
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Filtrar por sprint específico si se especifica
    if (options.sprintName) {
      query = query.eq('sprint_name', options.sprintName);
    }

    // Filtrar por desarrollador específico si se especifica
    if (options.developerName) {
      query = query.eq('developer_name', options.developerName);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[SUPABASE] Error obteniendo métricas de desarrolladores:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Error en getDeveloperMetrics:', error);
    throw error;
  }
};

/**
 * Obtiene métricas globales del proyecto
 * @param {string} projectKey - Clave del proyecto (default: 'OBD')
 * @returns {Promise<Object>} Objeto con métricas globales
 */
export const getGlobalMetrics = async (projectKey = 'OBD') => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    const { data, error } = await supabase
      .from('global_metrics')
      .select('*')
      .eq('project_id', 
        supabase
          .from('projects')
          .select('id')
          .eq('project_key', projectKey.toUpperCase())
          .single()
      )
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('[SUPABASE] Error obteniendo métricas globales:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[SUPABASE] Error en getGlobalMetrics:', error);
    throw error;
  }
};

/**
 * Obtiene el sprint activo actual
 * @param {string} projectKey - Clave del proyecto (default: 'OBD')
 * @returns {Promise<Object>} Objeto con datos del sprint activo
 */
export const getActiveSprint = async (projectKey = 'OBD') => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    const { data, error } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .eq('project_name', projectKey.toUpperCase())
      .eq('state', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // Si no hay sprint activo, no es un error crítico
      if (error.code === 'PGRST116') {
        console.log('[SUPABASE] No hay sprint activo actualmente');
        return null;
      }
      console.error('[SUPABASE] Error obteniendo sprint activo:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[SUPABASE] Error en getActiveSprint:', error);
    throw error;
  }
};

/**
 * Obtiene issues por estado
 * @param {string} projectKey - Clave del proyecto (default: 'OBD')
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Array>} Array de issues agrupados por estado
 */
export const getIssuesByStatus = async (projectKey = 'OBD', options = {}) => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    // Primero obtener el project_id
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_key', projectKey.toUpperCase())
      .single();

    if (projectError || !project) {
      throw new Error(`Proyecto ${projectKey} no encontrado`);
    }

    // Obtener issues agrupados por estado
    const { data, error } = await supabase
      .from('issues')
      .select('current_status, current_story_points')
      .eq('project_id', project.id);

    if (error) {
      console.error('[SUPABASE] Error obteniendo issues por estado:', error);
      throw error;
    }

    // Agrupar por estado
    const grouped = data.reduce((acc, issue) => {
      const status = issue.current_status || 'Unassigned';
      if (!acc[status]) {
        acc[status] = {
          status,
          count: 0,
          totalSP: 0
        };
      }
      acc[status].count++;
      acc[status].totalSP += issue.current_story_points || 0;
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[SUPABASE] Error en getIssuesByStatus:', error);
    throw error;
  }
};

/**
 * Obtiene todos los desarrolladores activos
 * @param {string} projectKey - Clave del proyecto (default: 'OBD')
 * @returns {Promise<Array>} Array de desarrolladores
 */
export const getDevelopers = async (projectKey = 'OBD') => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    const { data, error } = await supabase
      .from('developers')
      .select('*')
      .eq('active', true)
      .order('display_name', { ascending: true });

    if (error) {
      console.error('[SUPABASE] Error obteniendo desarrolladores:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('[SUPABASE] Error en getDevelopers:', error);
    throw error;
  }
};

/**
 * Verifica la conexión con Supabase
 * @returns {Promise<boolean>} true si la conexión es exitosa
 */
export const testConnection = async () => {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1);

    if (error) {
      console.error('[SUPABASE] Error de conexión:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[SUPABASE] Error en testConnection:', error);
    return false;
  }
};

// Exportar todas las funciones
export default {
  supabase,
  getSprintMetrics,
  getDeveloperMetrics,
  getGlobalMetrics,
  getActiveSprint,
  getIssuesByStatus,
  getDevelopers,
  testConnection
};
