/**
 * Script para aplicar migraciones de base de datos en Supabase
 * Ejecuta todos los archivos SQL en docs/supabase/ en orden numérico
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Cargar variables de entorno desde múltiples ubicaciones posibles
// 1. Primero intentar desde el directorio raíz del proyecto (delivery-dashboard/.env)
const rootEnvPath = join(rootDir, '.env');
// 2. Luego desde jira-supabase-sync/.env
const localEnvPath = join(__dirname, '../.env');

// Cargar ambos archivos .env si existen (el último tiene prioridad)
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: localEnvPath });
// También cargar desde el directorio actual por si acaso
dotenv.config();

// Configuración directa desde variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Verifica si las columnas requeridas existen en la tabla issues
 */
async function checkRequiredColumnsExist(supabaseClient) {
  const REQUIRED_COLUMNS = [
    'sprint_history',
    'status_by_sprint',
    'story_points_by_sprint',
    'status_history_days',
    'epic_name'
  ];

  try {
    // Intentar hacer un SELECT de las columnas
    const { error } = await supabaseClient
      .from('issues')
      .select(REQUIRED_COLUMNS.join(', '))
      .limit(1);

    if (error) {
      // Si el error es que las columnas no existen
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        return { exists: false, missingColumns: REQUIRED_COLUMNS };
      }
      // Otro tipo de error (puede ser que la tabla no tenga datos pero las columnas existen)
      // En ese caso, asumimos que existen
      return { exists: true, missingColumns: [] };
    }

    // Si no hay error, las columnas existen
    return { exists: true, missingColumns: [] };
  } catch (error) {
    logger.warn(`⚠️ Error verificando columnas: ${error.message}`);
    // En caso de error, asumimos que no existen para ser seguros
    return { exists: false, missingColumns: REQUIRED_COLUMNS };
  }
}

/**
 * Obtiene archivos de migración ordenados numéricamente
 */
function getMigrationFiles() {
  try {
    const migrationsDir = join(rootDir, 'docs/supabase');
    logger.debug(`📁 Buscando migraciones en: ${migrationsDir}`);
    
    if (!readdirSync) {
      logger.error('❌ No se puede leer el directorio de migraciones');
      return [];
    }

    const files = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .filter(file => !file.includes('FIX_') && !file.includes('CREATE_') && !file.includes('ADD_'))
      .sort((a, b) => {
        // Extraer números del nombre del archivo para ordenar
        const numA = parseInt(a.match(/^\d+/)?.[0] || '999');
        const numB = parseInt(b.match(/^\d+/)?.[0] || '999');
        return numA - numB;
      });
    
    logger.debug(`📋 Archivos encontrados: ${files.length}`);
    return files.map(file => join(migrationsDir, file));
  } catch (error) {
    logger.error(`❌ Error obteniendo archivos de migración: ${error.message}`);
    logger.error(`   Directorio esperado: ${join(rootDir, 'docs/supabase')}`);
    return [];
  }
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

    // Validar configuración
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
      logger.error('   El script busca .env en las siguientes ubicaciones:');
      logger.error(`   1. ${rootEnvPath} (directorio raíz del proyecto)`);
      logger.error(`   2. ${localEnvPath} (directorio jira-supabase-sync)`);
      logger.error('   3. Variables de entorno del sistema');
      logger.error('');
      logger.error('   Configura estas variables en cualquiera de estos lugares:');
      logger.error('   - SUPABASE_URL');
      logger.error('   - SUPABASE_SERVICE_ROLE_KEY');
      logger.error('   - O VITE_SUPABASE_URL (como alternativa)');
      process.exit(1);
    }

    logger.debug(`🔗 Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);

    // Crear cliente de Supabase con service_role para ejecutar SQL
    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar primero si las columnas críticas existen
    logger.info('🔍 Verificando si las columnas históricas existen...');
    const columnCheck = await checkRequiredColumnsExist(supabaseClient);
    
    if (columnCheck.exists) {
      logger.info('✅ Las columnas históricas ya existen. Verificando otras migraciones...');
    } else {
      logger.warn(`⚠️ Faltan columnas: ${columnCheck.missingColumns.join(', ')}`);
      logger.info('📋 Aplicando migraciones para crear las columnas faltantes...');
    }

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
    logger.error('❌ Error fatal aplicando migraciones:', error.message || error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
// En Windows, import.meta.url puede tener formato diferente, así que verificamos si es el script principal
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                      import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
                      process.argv[1]?.includes('apply-migrations.js');

if (isMainModule) {
  applyMigrations().catch(error => {
    logger.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  });
}

export { applyMigrations };
