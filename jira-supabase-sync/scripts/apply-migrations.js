/**
 * Script para aplicar migraciones de base de datos en Supabase
 * Ejecuta todos los archivos SQL en docs/supabase/ en orden numérico
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../src/config.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

/**
 * Obtiene archivos de migración ordenados numéricamente
 */
function getMigrationFiles() {
  const migrationsDir = join(rootDir, 'docs/supabase');
  const files = readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .filter(file => !file.includes('FIX_') && !file.includes('CREATE_') && !file.includes('ADD_'))
    .sort((a, b) => {
      // Extraer números del nombre del archivo para ordenar
      const numA = parseInt(a.match(/^\d+/)?.[0] || '999');
      const numB = parseInt(b.match(/^\d+/)?.[0] || '999');
      return numA - numB;
    });
  
  return files.map(file => join(migrationsDir, file));
}

/**
 * Ejecuta una migración SQL usando Supabase REST API con exec_sql
 */
async function executeMigration(supabaseClient, sqlContent, filename) {
  try {
    // Limpiar el SQL: remover comentarios y statements vacíos
    const cleanSQL = sqlContent
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n')
      .trim();

    if (!cleanSQL) {
      logger.debug(`ℹ️ Migración ${filename} está vacía, omitiendo`);
      return { success: true, skipped: true };
    }

    // Ejecutar usando la función exec_sql RPC
    const { data, error } = await supabaseClient.rpc('exec_sql', {
      p_sql: cleanSQL
    });

    if (error) {
      // Verificar si es un error de "ya existe" o similar (idempotente)
      const errorMessage = error.message?.toLowerCase() || '';
      
      if (errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate') ||
          errorMessage.includes('does not exist') ||
          errorMessage.includes('if not exists')) {
        logger.debug(`ℹ️ Migración ${filename} ya aplicada o no aplicable: ${error.message}`);
        return { success: true, skipped: true };
      }

      // Si es otro tipo de error, intentar ejecutar statement por statement
      logger.warn(`⚠️ Error ejecutando migración completa, intentando por statements: ${filename}`);
      
      const statements = cleanSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      let successCount = 0;
      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabaseClient.rpc('exec_sql', {
            p_sql: statement + ';'
          });

          if (stmtError) {
            const stmtErrorMsg = stmtError.message?.toLowerCase() || '';
            if (!stmtErrorMsg.includes('already exists') &&
                !stmtErrorMsg.includes('does not exist') &&
                !stmtErrorMsg.includes('duplicate')) {
              logger.warn(`⚠️ Error en statement de ${filename}: ${stmtError.message?.substring(0, 100)}`);
            } else {
              successCount++;
            }
          } else {
            successCount++;
          }
        } catch (stmtErr) {
          logger.debug(`ℹ️ Statement omitido en ${filename}: ${stmtErr.message?.substring(0, 50)}`);
        }
      }

      if (successCount > 0) {
        return { success: true };
      }

      return { success: false, error: error.message };
    }

    // Verificar respuesta
    if (data && typeof data === 'string' && data.includes('Error')) {
      logger.warn(`⚠️ Migración ${filename} retornó advertencia: ${data}`);
      return { success: true, warning: data };
    }

    return { success: true, data };
  } catch (error) {
    // Manejar errores de conexión o función no disponible
    if (error.message?.includes('function') || error.message?.includes('does not exist')) {
      logger.warn(`⚠️ Función exec_sql no disponible. Asegúrate de ejecutar 00_create_exec_sql_function.sql primero`);
      logger.warn(`⚠️ Migración ${filename} requiere aplicación manual`);
      return { success: false, error: 'Function not available', requiresManual: true };
    }
    throw error;
  }
}

/**
 * Aplica todas las migraciones pendientes
 */
async function applyMigrations() {
  try {
    logger.info('📦 Iniciando aplicación de migraciones...');

    // Crear cliente de Supabase con service_role para ejecutar SQL
    const supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    const migrationFiles = getMigrationFiles();
    
    if (migrationFiles.length === 0) {
      logger.info('✅ No se encontraron migraciones para aplicar');
      return;
    }

    logger.info(`📋 Encontradas ${migrationFiles.length} migraciones:`);
    migrationFiles.forEach(file => logger.info(`   - ${file.split('/').pop()}`));

    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (const migrationFile of migrationFiles) {
      const filename = migrationFile.split('/').pop();
      try {
        logger.info(`🔄 Aplicando migración: ${filename}`);
        
        const sqlContent = readFileSync(migrationFile, 'utf-8');
        const result = await executeMigration(supabaseClient, sqlContent, filename);

        if (result.success) {
          logger.success(`✅ Migración aplicada: ${filename}`);
          applied++;
        } else {
          logger.warn(`⚠️ Migración omitida (puede requerir aplicación manual): ${filename}`);
          skipped++;
        }
      } catch (error) {
        // Ignorar errores de "ya existe" o similares (migraciones idempotentes)
        if (error.message?.includes('already exists') ||
            error.message?.includes('does not exist') ||
            error.message?.includes('duplicate')) {
          logger.debug(`ℹ️ Migración ${filename} ya aplicada o no aplicable: ${error.message}`);
          skipped++;
        } else {
          logger.error(`❌ Error aplicando migración ${filename}:`, error.message);
          failed++;
        }
      }
    }

    logger.info(`\n📊 Resumen de migraciones:`);
    logger.info(`   ✅ Aplicadas: ${applied}`);
    logger.info(`   ⚠️ Omitidas: ${skipped}`);
    if (failed > 0) {
      logger.error(`   ❌ Fallidas: ${failed}`);
    }

    if (failed === 0) {
      logger.success('✅ Todas las migraciones procesadas exitosamente');
    } else {
      logger.warn('⚠️ Algunas migraciones fallaron. Revisa los logs arriba.');
    }
  } catch (error) {
    logger.error('❌ Error fatal aplicando migraciones:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  applyMigrations();
}

export { applyMigrations };
