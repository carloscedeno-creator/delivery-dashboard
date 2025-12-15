/**
 * Servicio para sincronizar datos extraídos de Notion con Supabase
 */

/**
 * Sincroniza contenido extraído con Supabase
 * @param {Object} supabaseClient - Cliente de Supabase
 * @param {Object} extractedData - Datos extraídos de Notion
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export const syncContentToSupabase = async (supabaseClient, extractedData) => {
  try {
    if (!extractedData.found || extractedData.pages.length === 0) {
      console.log(`[SYNC] No data to sync for ${extractedData.initiative}`);
      return { synced: false, reason: 'no_data' };
    }

    const results = [];

    // Sincronizar cada página encontrada
    for (const page of extractedData.pages) {
      const { data, error } = await supabaseClient
        .from('notion_content_extraction')
        .upsert({
          initiative_name: extractedData.initiative,
          notion_page_id: page.pageId,
          page_url: page.url,
          extracted_content: page.content,
          structured_data: page.structured,
          properties: page.properties,
          extraction_date: new Date().toISOString(),
          last_updated: page.lastEdited,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'notion_page_id',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        console.error(`[SYNC] Error syncing page ${page.pageId}:`, error);
        results.push({ pageId: page.pageId, success: false, error: error.message });
      } else {
        console.log(`[SYNC] Successfully synced page ${page.pageId}`);
        results.push({ pageId: page.pageId, success: true });
      }
    }

    return {
      synced: results.every(r => r.success),
      results,
      initiative: extractedData.initiative
    };

  } catch (error) {
    console.error('[SYNC] Error syncing content:', error);
    throw error;
  }
};

/**
 * Sincroniza métricas extraídas con Supabase
 * @param {Object} supabaseClient - Cliente de Supabase
 * @param {Object} processedData - Datos procesados con métricas
 * @returns {Promise<Object>} Resultado de la sincronización
 */
export const syncMetricsToSupabase = async (supabaseClient, processedData) => {
  try {
    if (!processedData.found || !processedData.metrics) {
      console.log(`[SYNC] No metrics to sync for ${processedData.initiative}`);
      return { synced: false, reason: 'no_metrics' };
    }

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseClient
      .from('notion_extracted_metrics')
      .upsert({
        initiative_name: processedData.initiative,
        extraction_date: today,
        status: processedData.metrics.status,
        completion_percentage: processedData.metrics.completion,
        tasks_completed: processedData.metrics.tasksCompleted,
        tasks_total: processedData.metrics.tasksTotal,
        story_points_done: processedData.metrics.storyPointsDone,
        story_points_total: processedData.metrics.storyPointsTotal,
        blockers: processedData.metrics.blockers || [],
        dependencies: processedData.metrics.dependencies || [],
        extracted_dates: processedData.metrics.extractedDates || {},
        raw_metrics: processedData.metrics,
        source: 'notion_extraction',
        created_at: new Date().toISOString()
      }, {
        onConflict: 'initiative_name,extraction_date',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error(`[SYNC] Error syncing metrics:`, error);
      return { synced: false, error: error.message };
    }

    console.log(`[SYNC] Successfully synced metrics for ${processedData.initiative}`);
    return {
      synced: true,
      initiative: processedData.initiative,
      metricsId: data?.[0]?.id
    };

  } catch (error) {
    console.error('[SYNC] Error syncing metrics:', error);
    throw error;
  }
};

/**
 * Sincroniza datos completos (contenido + métricas) con Supabase
 * @param {Object} supabaseClient - Cliente de Supabase
 * @param {Object} extractedData - Datos extraídos de Notion
 * @param {Object} processedData - Datos procesados con métricas
 * @returns {Promise<Object>} Resultado completo de la sincronización
 */
export const syncAllToSupabase = async (supabaseClient, extractedData, processedData) => {
  try {
    console.log(`[SYNC] Starting sync for ${extractedData.initiative}`);

    // Sincronizar contenido
    const contentResult = await syncContentToSupabase(supabaseClient, extractedData);

    // Sincronizar métricas
    const metricsResult = await syncMetricsToSupabase(supabaseClient, processedData);

    return {
      initiative: extractedData.initiative,
      contentSynced: contentResult.synced,
      metricsSynced: metricsResult.synced,
      contentResults: contentResult.results,
      metricsId: metricsResult.metricsId,
      syncedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('[SYNC] Error in full sync:', error);
    throw error;
  }
};

/**
 * Obtiene el historial de extracciones para una iniciativa
 * @param {Object} supabaseClient - Cliente de Supabase
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Array>} Historial de extracciones
 */
export const getExtractionHistory = async (supabaseClient, initiativeName) => {
  try {
    const { data, error } = await supabaseClient
      .from('notion_extracted_metrics')
      .select('*')
      .eq('initiative_name', initiativeName)
      .order('extraction_date', { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];

  } catch (error) {
    console.error('[SYNC] Error fetching history:', error);
    throw error;
  }
};

/**
 * Obtiene el contenido extraído más reciente para una iniciativa
 * @param {Object} supabaseClient - Cliente de Supabase
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Object|null>} Contenido extraído o null
 */
export const getLatestExtraction = async (supabaseClient, initiativeName) => {
  try {
    const { data, error } = await supabaseClient
      .from('notion_content_extraction')
      .select('*')
      .eq('initiative_name', initiativeName)
      .order('extraction_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data || null;

  } catch (error) {
    console.error('[SYNC] Error fetching latest extraction:', error);
    throw error;
  }
};

/**
 * Obtiene las métricas más recientes para una iniciativa
 * @param {Object} supabaseClient - Cliente de Supabase
 * @param {string} initiativeName - Nombre de la iniciativa
 * @returns {Promise<Object|null>} Métricas o null
 */
export const getLatestMetrics = async (supabaseClient, initiativeName) => {
  try {
    const { data, error } = await supabaseClient
      .from('notion_extracted_metrics')
      .select('*')
      .eq('initiative_name', initiativeName)
      .order('extraction_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;

  } catch (error) {
    console.error('[SYNC] Error fetching latest metrics:', error);
    throw error;
  }
};

export default {
  syncContentToSupabase,
  syncMetricsToSupabase,
  syncAllToSupabase,
  getExtractionHistory,
  getLatestExtraction,
  getLatestMetrics
};
