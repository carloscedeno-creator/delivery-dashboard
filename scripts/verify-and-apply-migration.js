/**
 * Script para verificar y aplicar la migración de campos históricos
 * Verifica primero si las columnas existen antes de intentar crearlas
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../jira-supabase-sync/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
  console.error('   Configura estas variables en jira-supabase-sync/.env');
  process.exit(1);
}

const REQUIRED_COLUMNS = [
  'sprint_history',
  'status_by_sprint',
  'story_points_by_sprint',
  'status_history_days',
  'epic_name'
];

/**
 * Verifica si las columnas existen en la tabla issues
 */
async function checkColumnsExist(supabaseClient) {
  try {
    // Intentar hacer un SELECT de las columnas
    const { data, error } = await supabaseClient
      .from('issues')
      .select(REQUIRED_COLUMNS.join(', '))
      .limit(1);

    if (error) {
      // Si el error es que las columnas no existen, retornar false
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        return { exists: false, missingColumns: REQUIRED_COLUMNS };
      }
      throw error;
    }

    // Si no hay error, las columnas existen
    return { exists: true, missingColumns: [] };
  } catch (error) {
    // Si hay un error de conexión o similar, intentar verificar con SQL directo
    console.warn('⚠️ No se pudo verificar con SELECT, intentando con SQL directo...');
    
    try {
      const checkSQL = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'issues' 
          AND column_name IN (${REQUIRED_COLUMNS.map(c => `'${c}'`).join(', ')});
      `;

      const { data: columns, error: sqlError } = await supabaseClient.rpc('exec_sql', {
        p_sql: checkSQL
      });

      if (sqlError) {
        // Si exec_sql no existe, necesitamos crearla primero
        if (sqlError.message?.includes('function') || sqlError.message?.includes('does not exist')) {
          console.log('⚠️ La función exec_sql no existe. Necesitamos crearla primero.');
          return { exists: false, needsExecSql: true, missingColumns: REQUIRED_COLUMNS };
        }
        throw sqlError;
      }

      const existingColumns = Array.isArray(columns) ? columns.map(c => c.column_name) : [];
      const missingColumns = REQUIRED_COLUMNS.filter(col => !existingColumns.includes(col));

      return {
        exists: missingColumns.length === 0,
        missingColumns,
        existingColumns
      };
    } catch (sqlErr) {
      console.error('❌ Error verificando columnas:', sqlErr.message);
      return { exists: false, error: sqlErr.message, missingColumns: REQUIRED_COLUMNS };
    }
  }
}

/**
 * Crea la función exec_sql si no existe
 */
async function ensureExecSqlFunction(supabaseClient) {
  try {
    const execSqlFile = join(__dirname, '../docs/supabase/00_create_exec_sql_function.sql');
    const execSqlContent = readFileSync(execSqlFile, 'utf-8');

    console.log('📦 Creando función exec_sql...');
    
    // Usar fetch directo porque exec_sql aún no existe
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ p_sql: execSqlContent }),
    });

    if (!response.ok) {
      // Si falla, intentar crear directamente usando psql o SQL directo
      console.log('⚠️ No se puede crear exec_sql automáticamente.');
      console.log('📝 Por favor, ejecuta manualmente en Supabase Dashboard:');
      console.log(`   ${execSqlFile}`);
      return false;
    }

    console.log('✅ Función exec_sql creada/verificada');
    return true;
  } catch (error) {
    console.warn('⚠️ No se pudo crear exec_sql automáticamente:', error.message);
    console.log('📝 Por favor, ejecuta manualmente en Supabase Dashboard:');
    console.log('   docs/supabase/00_create_exec_sql_function.sql');
    return false;
  }
}

/**
 * Aplica la migración usando exec_sql
 */
async function applyMigration(supabaseClient) {
  try {
    const migrationFile = join(__dirname, '../docs/supabase/06_add_issue_historical_fields.sql');
    const sqlContent = readFileSync(migrationFile, 'utf-8');

    console.log('🔄 Aplicando migración...');
    
    const { data, error } = await supabaseClient.rpc('exec_sql', {
      p_sql: sqlContent
    });

    if (error) {
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🔍 Verificando estado de la migración...\n');

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Paso 1: Verificar si las columnas existen
    console.log('📋 Paso 1: Verificando si las columnas existen...');
    const checkResult = await checkColumnsExist(supabaseClient);

    if (checkResult.exists) {
      console.log('✅ Todas las columnas ya existen. Migración no necesaria.');
      console.log('📊 Columnas existentes:', REQUIRED_COLUMNS.join(', '));
      return;
    }

    console.log('⚠️ Faltan columnas:', checkResult.missingColumns.join(', '));
    console.log('📦 Necesitamos aplicar la migración...\n');

    // Paso 2: Asegurar que exec_sql existe
    if (checkResult.needsExecSql) {
      console.log('📋 Paso 2: Verificando función exec_sql...');
      const execSqlCreated = await ensureExecSqlFunction(supabaseClient);
      
      if (!execSqlCreated) {
        console.log('\n❌ No se pudo crear exec_sql automáticamente.');
        console.log('📝 INSTRUCCIONES MANUALES:');
        console.log('   1. Ve a Supabase Dashboard → SQL Editor');
        console.log('   2. Ejecuta: docs/supabase/00_create_exec_sql_function.sql');
        console.log('   3. Luego ejecuta: docs/supabase/06_add_issue_historical_fields.sql');
        process.exit(1);
      }
    }

    // Paso 3: Aplicar la migración
    console.log('📋 Paso 3: Aplicando migración...');
    const migrationResult = await applyMigration(supabaseClient);

    if (migrationResult.success) {
      console.log('✅ Migración aplicada exitosamente!');
    }

    // Paso 4: Verificar nuevamente
    console.log('\n📋 Paso 4: Verificando que las columnas se crearon...');
    const finalCheck = await checkColumnsExist(supabaseClient);

    if (finalCheck.exists) {
      console.log('✅ ¡Éxito! Todas las columnas están creadas.');
      console.log('📊 Columnas disponibles:', REQUIRED_COLUMNS.join(', '));
    } else {
      console.warn('⚠️ Algunas columnas aún faltan:', finalCheck.missingColumns.join(', '));
      console.log('📝 Puede que necesites ejecutar la migración manualmente en Supabase Dashboard');
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error('\n📝 INSTRUCCIONES MANUALES:');
    console.log('   1. Ve a Supabase Dashboard → SQL Editor');
    console.log('   2. Ejecuta el contenido de: docs/supabase/06_add_issue_historical_fields.sql');
    process.exit(1);
  }
}

main();
