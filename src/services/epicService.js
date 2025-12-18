/**
 * Epic Service
 * Business logic for handling epics/initiatives with their dates
 */

/**
 * Get epics with their dates from Supabase
 * @param {object} supabase - Supabase client
 * @returns {Promise<Array>} Array of epics with dates
 */
export const getEpicsWithDates = async (supabase) => {
    if (!supabase) {
        throw new Error('Supabase client is required');
    }

    try {
        // Obtener épicas con sus fechas
        // Intentamos obtener start_date y end_date si existen en la tabla
        const { data: epics, error } = await supabase
            .from('initiatives')
            .select('id, squad_id, initiative_key, initiative_name, start_date, end_date, created_at, updated_at')
            .order('initiative_name', { ascending: true });

        if (error) {
            console.error('[EPIC SERVICE] Error loading epics:', error);
            throw error;
        }

        console.log('[EPIC SERVICE] Loaded epics:', epics?.length || 0);
        
        // Log para verificar qué campos tienen las épicas
        if (epics && epics.length > 0) {
            console.log('[EPIC SERVICE] Sample epic structure:', {
                keys: Object.keys(epics[0]),
                sample: epics[0]
            });
        }

        return epics || [];
    } catch (error) {
        console.error('[EPIC SERVICE] Error in getEpicsWithDates:', error);
        throw error;
    }
};

/**
 * Format epic date for roadmap
 * @param {string|Date|null} date - Date to format
 * @returns {string|null} Formatted date string (YYYY-MM-DD) or null
 */
export const formatEpicDate = (date) => {
    if (!date) return null;
    
    try {
        const dateObj = date instanceof Date ? date : new Date(date);
        if (isNaN(dateObj.getTime())) return null;
        return dateObj.toISOString().split('T')[0];
    } catch (error) {
        console.warn('[EPIC SERVICE] Error formatting date:', date, error);
        return null;
    }
};

/**
 * Get epic start date with fallback
 * @param {object} epic - Epic object
 * @param {object} fallbackSprint - Fallback sprint data
 * @returns {string|null} Start date string or null
 */
export const getEpicStartDate = (epic, fallbackSprint = null) => {
    // Prioridad: epic.start_date > fallbackSprint.start_date > epic.created_at
    if (epic.start_date) {
        return formatEpicDate(epic.start_date);
    }
    
    if (fallbackSprint?.start_date) {
        return formatEpicDate(fallbackSprint.start_date);
    }
    
    if (epic.created_at) {
        return formatEpicDate(epic.created_at);
    }
    
    return null;
};

/**
 * Get epic end date with fallback
 * @param {object} epic - Epic object
 * @param {object} fallbackSprint - Fallback sprint data
 * @returns {string|null} End date string or null
 */
export const getEpicEndDate = (epic, fallbackSprint = null) => {
    // Prioridad: epic.end_date > fallbackSprint.end_date
    if (epic.end_date) {
        return formatEpicDate(epic.end_date);
    }
    
    if (fallbackSprint?.end_date) {
        return formatEpicDate(fallbackSprint.end_date);
    }
    
    return null;
};

/**
 * Map epic to roadmap data format
 * @param {object} epic - Epic object
 * @param {object} squad - Squad object
 * @param {Array} issues - Issues for this epic
 * @param {object} metrics - Calculated metrics
 * @param {object} fallbackSprint - Fallback sprint data
 * @returns {object} Roadmap data object
 */
export const mapEpicToRoadmap = (epic, squad, issues, metrics, fallbackSprint = null) => {
    const startDate = getEpicStartDate(epic, fallbackSprint);
    const endDate = getEpicEndDate(epic, fallbackSprint);

    return {
        squad: squad.squad_name || squad.squad_key,
        initiative: epic.initiative_name || epic.initiative_key,
        start: startDate || new Date().toISOString().split('T')[0],
        status: metrics.completionPercentage,
        delivery: endDate,
        spi: metrics.spi,
        allocation: metrics.allocation,
        comments: metrics.comments,
        scope: epic.initiative_name || '',
        dev: metrics.devNames.join(', ') || 'Unassigned',
        percentage: metrics.completionPercentage
    };
};





