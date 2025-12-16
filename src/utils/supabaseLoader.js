import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;

const getSupabaseClient = () => {
    if (!supabaseClient && SUPABASE_URL && SUPABASE_ANON_KEY) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase client creado en supabaseLoader');
    } else if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('⚠️ Supabase no configurado en supabaseLoader:', {
            hasUrl: !!SUPABASE_URL,
            hasKey: !!SUPABASE_ANON_KEY
        });
    }
    return supabaseClient;
};

/**
 * Carga datos de iniciativas desde Supabase (notion_extracted_metrics)
 * Transforma los datos al formato esperado por el dashboard
 */
export const loadProductInitiativesFromDB = async () => {
    const supabase = getSupabaseClient();
    
    if (!supabase) {
        console.warn('Supabase no configurado, usando datos vacíos');
        return [];
    }

    try {
        // Obtener la última métrica por iniciativa (más reciente)
        const { data, error } = await supabase
            .from('notion_extracted_metrics')
            .select('*')
            .order('extraction_date', { ascending: false });

        if (error) {
            console.error('Error cargando datos de Supabase:', error);
            return [];
        }

        if (!data || data.length === 0) {
            console.warn('No hay datos en notion_extracted_metrics');
            return [];
        }

        // Agrupar por iniciativa y tomar la más reciente
        const latestByInitiative = {};
        data.forEach(metric => {
            const name = metric.initiative_name;
            if (!latestByInitiative[name] || 
                new Date(metric.extraction_date) > new Date(latestByInitiative[name].extraction_date)) {
                latestByInitiative[name] = metric;
            }
        });

        // Transformar al formato esperado por ProductRoadmapView
        const initiatives = Object.values(latestByInitiative).map(metric => {
            const raw = metric.raw_metrics || {};
            return {
                initiative: metric.initiative_name,
                status: metric.status || 'planned',
                completion: metric.completion_percentage || 0,
                storyPoints: metric.story_points_total || 0,
                storyPointsDone: metric.story_points_done || 0,
                quarter: raw.quarter || raw.Quarter || 'Unassigned',
                priority: raw.priority || raw.Priority || 'Medium',
                team: raw.team || raw.Team || raw.squad || 'Product',
                startDate: raw.startDate || raw['Start Date'] || raw.start_date || null,
                expectedDate: raw.expectedDate || raw['Expected Date'] || raw.expected_date || raw.delivery || null,
                effort: raw.effort || raw['Effort (days)'] || null,
                ba: raw.ba || raw.BA || null,
                designer: raw.designer || raw.Designer || null,
                // Incluir datos raw para referencia
                rawData: raw
            };
        });

        console.log(`✅ Cargadas ${initiatives.length} iniciativas desde Supabase`);
        return initiatives;

    } catch (error) {
        console.error('Error en loadProductInitiativesFromDB:', error);
        return [];
    }
};

/**
 * Carga datos de bug/release desde Supabase
 * (Por ahora retorna vacío, se puede extender si hay tabla específica)
 */
export const loadProductBugReleaseFromDB = async () => {
    // TODO: Implementar si hay tabla específica para bugs/releases
    return [];
};

/**
 * Verifica si Supabase está configurado
 */
export const isSupabaseConfigured = () => {
    const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
    if (!configured && import.meta.env.DEV) {
        console.warn('⚠️ Supabase no configurado en supabaseLoader. Variables:', {
            hasUrl: !!SUPABASE_URL,
            hasKey: !!SUPABASE_ANON_KEY,
            allEnvKeys: Object.keys(import.meta.env).filter(k => k.includes('SUPABASE'))
        });
    }
    return configured;
};
