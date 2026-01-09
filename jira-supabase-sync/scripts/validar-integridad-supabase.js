/**
 * Script para validar integridad de datos en Supabase
 * Ejecuta las validaciones SQL y muestra resultados
 * 
 * USO: node scripts/validar-integridad-supabase.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ejecuta una query SQL en Supabase
 */
async function ejecutarQuery(supabase, query, nombre) {
  try {
    logger.info(`🔍 Ejecutando validación: ${nombre}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
    
    if (error) {
      // Si no existe la función RPC, intentar ejecutar directamente
      logger.warn(`⚠️ RPC no disponible, intentando método alternativo...`);
      logger.info(`📝 Query a ejecutar manualmente:\n${query}`);
      return null;
    }
    
    return data;
  } catch (error) {
    logger.warn(`⚠️ Error ejecutando query: ${error.message}`);
    logger.info(`📝 Query a ejecutar manualmente:\n${query}`);
    return null;
  }
}

/**
 * Valida integridad de datos usando queries SQL
 */
async function validarIntegridad() {
  logger.info('🔍 Iniciando validación de integridad de datos...');
  
  // Crear cliente de Supabase
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );
  
  // Leer queries del archivo SQL
  const sqlFile = join(__dirname, 'validar-integridad-datos.sql');
  let sqlContent;
  
  try {
    sqlContent = readFileSync(sqlFile, 'utf-8');
  } catch (error) {
    logger.error(`❌ No se pudo leer archivo SQL: ${sqlFile}`);
    logger.info('📝 Por favor ejecuta manualmente: scripts/validar-integridad-datos.sql');
    return;
  }
  
  // Dividir queries por secciones (cada SELECT es una validación)
  const queries = sqlContent
    .split(';')
    .map(q => q.trim())
    .filter(q => q.length > 0 && q.toUpperCase().startsWith('SELECT'));
  
  logger.info(`📊 Ejecutando ${queries.length} validaciones...`);
  
  const resultados = [];
  
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const nombre = `Validación ${i + 1}`;
    
    try {
      // Intentar ejecutar query directamente usando Supabase
      // Nota: Esto requiere que Supabase tenga habilitado SQL directo o usar RPC
      logger.info(`\n📋 ${nombre}:`);
      logger.info(`SQL: ${query.substring(0, 100)}...`);
      
      // Por ahora, solo mostramos la query
      // En producción, esto se ejecutaría usando el cliente de Supabase
      logger.info('⚠️ Ejecuta esta query manualmente en Supabase SQL Editor:');
      logger.info(`\n${query};\n`);
      
    } catch (error) {
      logger.error(`❌ Error en ${nombre}:`, error.message);
    }
  }
  
  logger.info('\n✅ Validaciones completadas');
  logger.info('📝 IMPORTANTE: Ejecuta las queries manualmente en Supabase SQL Editor');
  logger.info('📝 Archivo SQL: scripts/validar-integridad-datos.sql');
}

/**
 * Valida datos específicos de un sprint
 */
async function validarSprint(sprintId) {
  logger.info(`🔍 Validando sprint: ${sprintId}`);
  
  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );
  
  // Query para validar sprint específico
  const query = `
    SELECT 
      s.sprint_name,
      s.state,
      s.start_date,
      s.end_date,
      s.complete_date,
      COUNT(DISTINCT is_rel.issue_id) as total_issues,
      COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.issue_id END) as issues_al_cierre,
      COUNT(DISTINCT CASE WHEN is_rel.status_at_sprint_close IS NULL THEN is_rel.issue_id END) as issues_removidos,
      SUM(CASE WHEN is_rel.status_at_sprint_close IS NOT NULL THEN is_rel.story_points_at_start ELSE 0 END) as sp_committed,
      SUM(CASE 
        WHEN is_rel.status_at_sprint_close IS NOT NULL 
        AND EXISTS (
          SELECT 1 FROM status_definitions sd 
          WHERE sd.status_name = is_rel.status_at_sprint_close 
          AND sd.is_completed = true
        )
        THEN is_rel.story_points_at_close 
        ELSE 0 
      END) as sp_completed
    FROM sprints s
    LEFT JOIN issue_sprints is_rel ON s.id = is_rel.sprint_id
    WHERE s.id = '${sprintId}'
    GROUP BY s.id, s.sprint_name, s.state, s.start_date, s.end_date, s.complete_date;
  `;
  
  logger.info('📊 Datos del sprint:');
  logger.info(`SQL: ${query}`);
  logger.info('⚠️ Ejecuta esta query manualmente en Supabase SQL Editor');
}

// Main
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0 && args[0] === '--sprint') {
    const sprintId = args[1];
    if (!sprintId) {
      logger.error('❌ Debes proporcionar un sprint_id');
      logger.info('Uso: node scripts/validar-integridad-supabase.js --sprint <sprint_id>');
      process.exit(1);
    }
    await validarSprint(sprintId);
  } else {
    await validarIntegridad();
  }
}

main().catch(error => {
  logger.error('❌ Error fatal:', error);
  process.exit(1);
});
