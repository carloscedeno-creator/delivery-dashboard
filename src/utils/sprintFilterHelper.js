/**
 * Helper para filtrar sprints y mantener solo los últimos 10 cerrados + activos
 * Esto protege los promedios (avg) de ser afectados por sprints muy antiguos
 */

/**
 * Filtra sprints para mantener solo:
 * - Sprint activo (si existe)
 * - Últimos 10 sprints cerrados por fecha
 * - NO incluye sprints futuros
 * 
 * @param {Array} sprints - Array de sprints a filtrar
 * @param {string|null} squadId - ID del squad (opcional, para filtrar por squad)
 * @returns {Array} Array filtrado de sprints
 */
export const filterRecentSprints = (sprints, squadId = null) => {
  if (!sprints || sprints.length === 0) {
    return [];
  }

  // Filtrar por squad si se proporciona
  let filteredSprints = sprints;
  if (squadId) {
    filteredSprints = sprints.filter(s => s.squad_id === squadId);
  }

  // Separar sprints por estado
  const activeSprints = filteredSprints.filter(s => s.state === 'active');
  const closedSprints = filteredSprints.filter(s => s.state === 'closed');
  const futureSprints = filteredSprints.filter(s => s.state === 'future');

  // Ordenar sprints cerrados por fecha (más recientes primero)
  const sortedClosedSprints = closedSprints.sort((a, b) => {
    const dateA = a.end_date || a.start_date || a.complete_date || a.created_at || 0;
    const dateB = b.end_date || b.start_date || b.complete_date || b.created_at || 0;
    return new Date(dateB) - new Date(dateA);
  });

  // Mantener solo los últimos 10 cerrados
  const recentClosedSprints = sortedClosedSprints.slice(0, 10);

  // Combinar: activos + últimos 10 cerrados (NO futuros)
  const result = [...activeSprints, ...recentClosedSprints];

  // Ordenar resultado final por fecha (más recientes primero)
  return result.sort((a, b) => {
    const dateA = a.end_date || a.start_date || a.complete_date || a.created_at || 0;
    const dateB = b.end_date || b.start_date || b.complete_date || b.created_at || 0;
    return new Date(dateB) - new Date(dateA);
  });
};

/**
 * Filtra sprints cerrados para mantener solo los últimos N
 * Útil para cálculos de promedios
 * 
 * @param {Array} sprints - Array de sprints cerrados
 * @param {number} limit - Número de sprints a mantener (default: 10)
 * @returns {Array} Array filtrado de sprints cerrados
 */
export const filterRecentClosedSprints = (sprints, limit = 10) => {
  if (!sprints || sprints.length === 0) {
    return [];
  }

  // Filtrar solo cerrados
  const closedSprints = sprints.filter(s => s.state === 'closed');

  // Ordenar por fecha (más recientes primero)
  const sorted = closedSprints.sort((a, b) => {
    const dateA = a.end_date || a.start_date || a.complete_date || a.created_at || 0;
    const dateB = b.end_date || b.start_date || b.complete_date || b.created_at || 0;
    return new Date(dateB) - new Date(dateA);
  });

  // Retornar solo los últimos N
  return sorted.slice(0, limit);
};
