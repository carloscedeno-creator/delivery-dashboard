/**
 * Ejemplo de cómo usar el analizador de Supabase
 * 
 * Puedes modificar este archivo con tus queries personalizadas
 * y ejecutarlo con: node scripts/query-example.js
 */

import { analyzeData, compareQueries, showStats } from './analyze-supabase.js';

async function main() {
  console.log('🔍 Ejemplos de Análisis de Supabase\n');

  // Ejemplo 1: Obtener issues de un desarrollador
  console.log('\n📋 Ejemplo 1: Issues de un desarrollador');
  const devIssues = await analyzeData({
    table: 'issues',
    filters: { assignee_id: '123' }, // Reemplaza con un ID real
    select: 'id, summary, current_story_points, current_status',
    orderBy: 'created_date:desc',
    limit: 10
  });

  // Ejemplo 2: Comparar dos queries
  console.log('\n📋 Ejemplo 2: Comparar issues de dos desarrolladores');
  const comparison = await compareQueries(
    {
      table: 'issues',
      filters: { assignee_id: '123' },
      select: 'id, summary'
    },
    {
      table: 'issues',
      filters: { assignee_id: '456' },
      select: 'id, summary'
    },
    'id'
  );

  // Ejemplo 3: Estadísticas
  console.log('\n📋 Ejemplo 3: Estadísticas de issues por estado');
  await showStats('issues', 'current_status');

  console.log('\n✅ Análisis completado');
}

main().catch(console.error);
