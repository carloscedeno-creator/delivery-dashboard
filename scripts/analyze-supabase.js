/**
 * Script para analizar datos de Supabase
 * Permite ejecutar queries personalizados y comparar resultados
 * 
 * Uso:
 *   node scripts/analyze-supabase.js
 * 
 * O con parámetros:
 *   node scripts/analyze-supabase.js --query "issues" --filter "assignee_id=123"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Necesitas configurar:');
  console.error('  - VITE_SUPABASE_URL o SUPABASE_URL');
  console.error('  - VITE_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Función principal para ejecutar queries
 */
async function analyzeData(queryParams) {
  const { table, filters = {}, select = '*', orderBy = null, limit = null } = queryParams;

  console.log(`\n📊 Analizando tabla: ${table}`);
  console.log(`🔍 Filtros:`, filters);
  console.log(`📋 Select:`, select);
  if (orderBy) console.log(`🔢 Ordenar por:`, orderBy);
  if (limit) console.log(`📏 Límite:`, limit);
  console.log('─'.repeat(60));

  try {
    let query = supabase.from(table).select(select);

    // Aplicar filtros
    for (const [key, value] of Object.entries(filters)) {
      if (value === null || value === undefined) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object' && value.operator) {
        // Operadores: { operator: 'gte', value: '2024-01-01' }
        query = query[value.operator](key, value.value);
      } else {
        query = query.eq(key, value);
      }
    }

    // Ordenar
    if (orderBy) {
      const [column, direction = 'asc'] = orderBy.split(':');
      query = query.order(column, { ascending: direction === 'asc' });
    }

    // Límite
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error en la query:', error);
      return null;
    }

    console.log(`✅ Resultados: ${data?.length || 0} registros`);
    if (count !== null) {
      console.log(`📊 Total (con count): ${count}`);
    }

    return data;
  } catch (error) {
    console.error('❌ Error ejecutando query:', error.message);
    return null;
  }
}

/**
 * Función para comparar dos queries
 */
async function compareQueries(query1, query2, comparisonKey = 'id') {
  console.log('\n' + '='.repeat(60));
  console.log('🔀 COMPARACIÓN DE QUERIES');
  console.log('='.repeat(60));

  const [result1, result2] = await Promise.all([
    analyzeData(query1),
    analyzeData(query2)
  ]);

  if (!result1 || !result2) {
    console.error('❌ No se pudieron obtener los resultados para comparar');
    return;
  }

  const set1 = new Set(result1.map(r => r[comparisonKey]));
  const set2 = new Set(result2.map(r => r[comparisonKey]));

  const onlyIn1 = result1.filter(r => !set2.has(r[comparisonKey]));
  const onlyIn2 = result2.filter(r => !set1.has(r[comparisonKey]));
  const inBoth = result1.filter(r => set2.has(r[comparisonKey]));

  console.log('\n📊 Resumen de comparación:');
  console.log(`  - Solo en Query 1: ${onlyIn1.length}`);
  console.log(`  - Solo en Query 2: ${onlyIn2.length}`);
  console.log(`  - En ambas: ${inBoth.length}`);

  if (onlyIn1.length > 0) {
    console.log('\n🔍 Registros solo en Query 1:');
    console.table(onlyIn1.slice(0, 10));
  }

  if (onlyIn2.length > 0) {
    console.log('\n🔍 Registros solo en Query 2:');
    console.table(onlyIn2.slice(0, 10));
  }

  return {
    query1: result1,
    query2: result2,
    onlyIn1,
    onlyIn2,
    inBoth
  };
}

/**
 * Función para mostrar estadísticas de una tabla
 */
async function showStats(table, groupBy = null) {
  console.log(`\n📈 Estadísticas de: ${table}`);
  console.log('─'.repeat(60));

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(1000);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Total de registros: ${data.length}`);

  if (groupBy && data.length > 0) {
    const grouped = {};
    data.forEach(row => {
      const key = row[groupBy] || 'null';
      grouped[key] = (grouped[key] || 0) + 1;
    });

    console.log(`\nAgrupado por ${groupBy}:`);
    Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .forEach(([key, count]) => {
        console.log(`  ${key}: ${count}`);
      });
  }
}

// Exportar funciones para uso interactivo
export { analyzeData, compareQueries, showStats, supabase };

// Ejemplo de uso directo
if (import.meta.url === `file://${process.argv[1]}`) {
  // Ejemplo básico
  console.log('🔍 Ejecutando ejemplo de análisis...\n');
  
  analyzeData({
    table: 'issues',
    filters: {},
    select: 'id, summary, current_story_points, assignee_id',
    limit: 5
  }).then(results => {
    if (results) {
      console.log('\n✅ Ejemplo completado');
    }
  });
}
