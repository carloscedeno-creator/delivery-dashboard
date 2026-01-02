/**
 * Servicio de Supabase para obtener métricas de delivery
 * Conecta con la base de datos Supabase que se actualiza cada 30 minutos desde Jira
 */

import { createClient } from '@supabase/supabase-js';

// Configuración desde variables de entorno
// También intenta valores por defecto si están disponibles
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validar que las variables estén configuradas
if (!supabaseAnonKey) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY no está configurado. Configura esta variable en tu archivo .env');
  console.warn('   Para obtenerla: Supabase Dashboard > Settings > API > anon public key');
}

// Crear cliente de Supabase solo si tenemos la clave
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
 * Obtiene datos de delivery roadmap desde Supabase
 * @returns {Promise<Array>} Array de proyectos con métricas
 */
export const getDeliveryRoadmapData = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    // Obtener squads
    const { data: squads, error: squadsError } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name')
      .order('squad_name', { ascending: true });

    if (squadsError) {
      console.error('[SUPABASE] Error obteniendo squads:', squadsError);
      throw squadsError;
    }

    // Obtener initiatives (incluyendo fechas de épicas)
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id, squad_id, initiative_key, initiative_name, created_at, start_date, end_date')
      .order('initiative_name', { ascending: true });

    if (initiativesError) {
      console.error('[SUPABASE] Error obteniendo initiatives:', initiativesError);
      throw initiativesError;
    }

    // Obtener métricas de sprints más recientes
    const { data: sprintMetrics, error: metricsError } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .order('end_date', { ascending: false })
      .limit(100);

    if (metricsError) {
      console.warn('[SUPABASE] Error obteniendo métricas:', metricsError);
    }

    // Obtener issues
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, initiative_id, current_status, current_story_points, assignee_id');

    if (issuesError) {
      console.warn('[SUPABASE] Error obteniendo issues:', issuesError);
    }

    // Obtener desarrolladores
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name');

    if (devsError) {
      console.warn('[SUPABASE] Error obteniendo developers:', devsError);
    }

    // Crear mapa de desarrolladores
    const devMap = new Map((developers || []).map(d => [d.id, d.display_name]));

    // Crear mapa de squads
    const squadMap = new Map((squads || []).map(s => [s.id, s]));

    // Validar que haya datos en Supabase
    if (!squads || squads.length === 0) {
      throw new Error('No hay squads en Supabase. Verifica que el servicio de sync haya ejecutado.');
    }

    if (!initiatives || initiatives.length === 0) {
      throw new Error('No hay initiatives en Supabase. Verifica que el servicio de sync haya ejecutado.');
    }

    console.log('[SUPABASE] Datos encontrados:', {
      squads: squads.length,
      initiatives: initiatives.length,
      issues: (issues || []).length,
      developers: (developers || []).length
    });

    // Construir datos de delivery roadmap
    const roadmapData = [];

    // Procesar iniciativas normales
    for (const initiative of initiatives || []) {
      const squad = squadMap.get(initiative.squad_id);
      if (!squad) continue;

      // Obtener issues de esta iniciativa
      const initiativeIssues = (issues || []).filter(
        issue => issue.initiative_id === initiative.id
      );

      // Calcular métricas básicas
      const totalSP = initiativeIssues.reduce((sum, issue) => 
        sum + (issue.current_story_points || 0), 0
      );
      const completedSP = initiativeIssues
        .filter(issue => {
          const status = issue.current_status?.toLowerCase() || '';
          return status.includes('done') || status.includes('closed') || status.includes('resolved');
        })
        .reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);

      // Calcular SPI (simplificado: basado en SP completados vs total)
      const spi = totalSP > 0 ? (completedSP / totalSP) : 0;

      // Calcular porcentaje de completitud
      const completionPercentage = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

      // Obtener fechas de la épica (prioridad) o del sprint más reciente (fallback)
      // Prioridad 1: Usar fechas de la épica (start_date, end_date de initiatives)
      // Prioridad 2: Usar fechas del sprint más reciente
      // Prioridad 3: Usar created_at como start_date
      let startDate = null;
      let endDate = null;

      if (initiative.start_date) {
        startDate = new Date(initiative.start_date).toISOString().split('T')[0];
      } else {
        // Fallback: usar sprint más reciente
        const squadMetrics = (sprintMetrics || []).filter(
          m => m.project_name === squad.squad_key || m.squad_key === squad.squad_key
        );
        const latestSprint = squadMetrics[0];
        startDate = latestSprint?.start_date 
          ? new Date(latestSprint.start_date).toISOString().split('T')[0]
          : new Date(initiative.created_at).toISOString().split('T')[0];
      }

      if (initiative.end_date) {
        endDate = new Date(initiative.end_date).toISOString().split('T')[0];
      } else {
        // Si no hay end_date, estimar basado en start_date o created_at
        const baseDate = initiative.start_date || initiative.created_at;
        const estimatedEnd = new Date(baseDate);
        estimatedEnd.setMonth(estimatedEnd.getMonth() + 3); // 3 meses después
        endDate = estimatedEnd.toISOString().split('T')[0];
      }

      // Asegurar que ambas fechas estén presentes (última validación)
      if (!startDate) {
        startDate = new Date(initiative.created_at).toISOString().split('T')[0];
      }
      if (!endDate) {
        const estimatedEnd = new Date(startDate);
        estimatedEnd.setMonth(estimatedEnd.getMonth() + 3);
        endDate = estimatedEnd.toISOString().split('T')[0];
      }

      // Obtener asignaciones de desarrolladores
      const devIds = [...new Set(
        initiativeIssues
          .map(issue => issue.assignee_id)
          .filter(Boolean)
      )];
      const devNames = devIds.map(id => devMap.get(id)).filter(Boolean);

      // Asegurar que ambas fechas estén presentes
      if (!startDate) {
        startDate = new Date(initiative.created_at).toISOString().split('T')[0];
      }
      if (!endDate) {
        const estimatedEnd = new Date(startDate);
        estimatedEnd.setMonth(estimatedEnd.getMonth() + 3);
        endDate = estimatedEnd.toISOString().split('T')[0];
      }

      const roadmapItem = {

        squad: squad.squad_name || squad.squad_key,
        initiative: initiative.initiative_name || initiative.initiative_key,
        start: startDate,
        status: completionPercentage,
        delivery: endDate,
        spi: parseFloat(spi.toFixed(2)),
        allocation: devNames.length,
        comments: `${initiativeIssues.length} issues, ${totalSP} SP total`,
        scope: initiative.initiative_name || '',
        dev: devNames.join(', ') || 'Unassigned',
        percentage: completionPercentage
      };

      roadmapData.push(roadmapItem);
    }

    // Procesar issues sin iniciativa agrupados por squad
    const issuesWithoutInitiative = (issues || []).filter(issue => !issue.initiative_id);
    const squadIdsWithUnassignedIssues = [...new Set(issuesWithoutInitiative.map(issue => issue.squad_id).filter(Boolean))];

    for (const squadId of squadIdsWithUnassignedIssues) {
      const squad = squadMap.get(squadId);
      if (!squad) continue;

      const unassignedIssues = issuesWithoutInitiative.filter(issue => issue.squad_id === squadId);
      if (unassignedIssues.length === 0) continue;

      const totalSP = unassignedIssues.reduce((sum, issue) => 
        sum + (issue.current_story_points || 0), 0
      );
      const completedSP = unassignedIssues
        .filter(issue => {
          const status = issue.current_status?.toLowerCase() || '';
          return status.includes('done') || status.includes('closed') || status.includes('resolved');
        })
        .reduce((sum, issue) => sum + (issue.current_story_points || 0), 0);

      const spi = totalSP > 0 ? (completedSP / totalSP) : 0;
      const completionPercentage = totalSP > 0 ? Math.round((completedSP / totalSP) * 100) : 0;

      const squadMetrics = (sprintMetrics || []).filter(
        m => m.project_name === squad.squad_key || m.squad_key === squad.squad_key
      );
      const latestSprint = squadMetrics[0];

      const devIds = [...new Set(
        unassignedIssues.map(issue => issue.assignee_id).filter(Boolean)
      )];
      const devNames = devIds.map(id => devMap.get(id)).filter(Boolean);

      roadmapData.push({
        squad: squad.squad_name || squad.squad_key,
        initiative: 'Otros',
        start: latestSprint?.start_date 
          ? new Date(latestSprint.start_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: completionPercentage,
        delivery: latestSprint?.end_date
          ? new Date(latestSprint.end_date).toISOString().split('T')[0]
          : null,
        spi: parseFloat(spi.toFixed(2)),
        allocation: devNames.length,
        comments: `${unassignedIssues.length} issues, ${totalSP} SP total`,
        scope: 'Otros',
        dev: devNames.join(', ') || 'Unassigned',
        percentage: completionPercentage
      });
    }

    // Validar que se generaron datos
    if (roadmapData.length === 0) {
      throw new Error('No se pudieron generar datos de roadmap desde Supabase. Verifica que haya initiatives con issues asociados.');
    }

    console.log('[SUPABASE] Roadmap data generado:', roadmapData.length, 'items');
    return roadmapData;
  } catch (error) {
    console.error('[SUPABASE] Error en getDeliveryRoadmapData:', error);
    throw error;
  }
};

/**
 * Obtiene datos de asignación de desarrolladores desde Supabase
 * @returns {Promise<Array>} Array de asignaciones
 */
export const getDeveloperAllocationData = async () => {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Verifica las variables de entorno.');
  }

  try {
    // Obtener sprints activos o más recientes por squad
    const { data: activeSprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, squad_id, start_date, end_date, state, sprint_name')
      .or('state.eq.active,state.eq.closed')
      .order('end_date', { ascending: false });

    if (sprintsError) {
      console.warn('[SUPABASE] Error obteniendo sprints:', sprintsError);
    }

    // Crear mapa de sprint más reciente por squad
    const squadSprintMap = new Map();
    if (activeSprints) {
      for (const sprint of activeSprints) {
        if (!squadSprintMap.has(sprint.squad_id)) {
          squadSprintMap.set(sprint.squad_id, sprint);
        }
      }
    }

    // Obtener issues con fechas para filtrar por sprint (incluyendo los sin iniciativa)
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('id, squad_id, initiative_id, current_story_points, current_sprint, assignee_id, created_date, dev_start_date, dev_close_date, resolved_date');

    if (issuesError) {
      console.error('[SUPABASE] Error obteniendo issues:', issuesError);
      throw issuesError;
    }

    // Función para verificar si un issue está activo en el sprint actual
    // Usa current_sprint (métrica real que define si está en el sprint seleccionado)
    const isIssueActiveInSprint = (issue, sprint) => {
      if (!sprint) return false;

      const sprintStart = new Date(sprint.start_date);
      const sprintEnd = new Date(sprint.end_date);
      const now = new Date();

      // Si el sprint ya terminó hace más de un sprint, no contar
      if (sprintEnd < now && sprint.state === 'closed') {
        // Solo contar si terminó recientemente (último sprint cerrado)
        const daysSinceEnd = (now - sprintEnd) / (1000 * 60 * 60 * 24);
        if (daysSinceEnd > 14) return false; // Más de 2 semanas = no contar
      }

      // PRIORIDAD 1: Verificar si el issue tiene current_sprint que coincida con el sprint
      // Esta es la fuente más confiable (métrica real del spreadsheet)
      if (issue.current_sprint && issue.current_sprint === sprint.sprint_name) {
        return true; // Está en el sprint, contar
      }

      // PRIORIDAD 2: Si NO tiene current_sprint, verificar fechas SOLO para tickets muy recientes
      // Solo contar si fue creado DURANTE el sprint actual (no antes)
      const issueCreated = issue.created_date ? new Date(issue.created_date) : null;
      
      // Si fue creado durante el sprint actual, contarlo
      if (issueCreated && issueCreated >= sprintStart && issueCreated <= sprintEnd) {
        return true;
      }

      // NO contar issues viejos que se solapan por fechas de desarrollo
      // Solo contamos si está explícitamente en el sprint o fue creado durante el sprint
      return false;
    };

    // Obtener initiatives
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select('id, initiative_name, squad_id');

    if (initiativesError) {
      console.error('[SUPABASE] Error obteniendo initiatives:', initiativesError);
      throw initiativesError;
    }

    // Obtener squads
    const { data: squads, error: squadsError } = await supabase
      .from('squads')
      .select('id, squad_name');

    if (squadsError) {
      console.error('[SUPABASE] Error obteniendo squads:', squadsError);
      throw squadsError;
    }

    // Obtener desarrolladores
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name');

    if (devsError) {
      console.error('[SUPABASE] Error obteniendo developers:', devsError);
      throw devsError;
    }

    // Validar que haya datos
    if (!issues || issues.length === 0) {
      throw new Error('No hay issues en Supabase. Verifica que el servicio de sync haya ejecutado.');
    }

    if (!initiatives || initiatives.length === 0) {
      throw new Error('No hay initiatives en Supabase. Verifica que el servicio de sync haya ejecutado.');
    }

    console.log('[SUPABASE] Datos para allocation:', {
      issues: issues.length,
      initiatives: initiatives.length,
      squads: (squads || []).length,
      developers: (developers || []).length
    });

    // Crear mapas para búsqueda rápida
    const initiativeMap = new Map((initiatives || []).map(i => [i.id, i]));
    const squadMap = new Map((squads || []).map(s => [s.id, s]));
    const devMap = new Map((developers || []).map(d => [d.id, d]));

    // Agrupar por iniciativa y desarrollador, filtrando solo issues activos en sprint actual
    const allocationMap = new Map();
    let filteredIssuesCount = 0;
    let totalIssuesCount = 0;

    for (const issue of issues || []) {
      totalIssuesCount++;
      if (!issue.initiative_id || !issue.assignee_id) continue;

      const initiative = initiativeMap.get(issue.initiative_id);
      const dev = devMap.get(issue.assignee_id);
      if (!initiative || !dev) continue;

      const squad = squadMap.get(initiative.squad_id);
      if (!squad) continue;

      // Obtener el sprint actual para este squad
      const currentSprint = squadSprintMap.get(squad.id);
      
      // Filtrar: solo contar issues activos en el sprint actual
      if (!isIssueActiveInSprint(issue, currentSprint)) {
        continue; // Issue viejo o fuera del sprint, no contar
      }

      filteredIssuesCount++;
      const key = `${squad.squad_name}::${initiative.initiative_name}::${dev.display_name}`;
      
      if (!allocationMap.has(key)) {
        allocationMap.set(key, {
          squad: squad.squad_name,
          initiative: initiative.initiative_name,
          dev: dev.display_name,
          totalSP: 0
        });
      }

      const allocation = allocationMap.get(key);
      allocation.totalSP += issue.current_story_points || 0;
    }

    console.log('[SUPABASE] Issues filtrados por sprint:', {
      total: totalIssuesCount,
      activos: filteredIssuesCount,
      excluidos: totalIssuesCount - filteredIssuesCount
    });

    // Convertir a array y calcular porcentajes
    // Capacidad del sprint basada en la tabla de conversión:
    // 1 SP = 4 horas
    // 2 SP = 1 día (8 horas)
    // 3 SP = 2-3 días (16-24 horas)
    // 5 SP = 3-4 días (24-32 horas)
    // Sprint = 2 semanas = 8.5 días de trabajo = 68 horas
    // Capacidad = 68 horas / 4 horas por SP = 17 SP por sprint
    const SPRINT_CAPACITY_SP = 17; // SP que puede hacer un desarrollador en un sprint
    
    const allocations = Array.from(allocationMap.values()).map(allocation => {
      // Calcular porcentaje basado en SP vs capacidad del sprint
      // percentage = (SP asignados en esta iniciativa / capacidad del sprint) * 100
      // No limitamos a 100% porque un desarrollador puede estar asignado a múltiples iniciativas
      const percentage = Math.round((allocation.totalSP / SPRINT_CAPACITY_SP) * 100);
      
      return {
        squad: allocation.squad,
        initiative: allocation.initiative,
        dev: allocation.dev,
        percentage: percentage
      };
    });

    // Validar que se generaron asignaciones
    if (allocations.length === 0) {
      console.warn('[SUPABASE] No se generaron asignaciones. Puede que no haya issues con assignee_id.');
      // Retornar array vacío en lugar de lanzar error, ya que puede ser válido
    }

    console.log('[SUPABASE] Allocation data generado:', allocations.length, 'items');
    return allocations;
  } catch (error) {
    console.error('[SUPABASE] Error en getDeveloperAllocationData:', error);
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
      .from('squads')
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
  getDeliveryRoadmapData,
  getDeveloperAllocationData,
  testConnection
};


