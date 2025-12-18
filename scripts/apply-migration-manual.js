/**
 * Script para aplicar la migración 06_add_issue_historical_fields.sql manualmente
 * Ejecuta directamente la migración SQL en Supabase
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
  process.exit(1);
}

async function applyMigration() {
  try {
    console.log('📦 Aplicando migración: 06_add_issue_historical_fields.sql\n');

    // Crear cliente de Supabase
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Leer el archivo de migración
    const migrationFile = join(__dirname, '../docs/supabase/06_add_issue_historical_fields.sql');
    const sqlContent = readFileSync(migrationFile, 'utf-8');

    console.log('📄 Contenido de la migración:');
    console.log(sqlContent.substring(0, 500) + '...\n');

    // Ejecutar usando exec_sql
    console.log('🔄 Ejecutando migración...');
    const { data, error } = await supabaseClient.rpc('exec_sql', {
      p_sql: sqlContent
    });

    if (error) {
      console.error('❌ Error ejecutando migración:', error);
      
      // Si exec_sql no existe, mostrar instrucciones
      if (error.message?.includes('function') || error.message?.includes('does not exist')) {
        console.log('\n⚠️ La función exec_sql no está disponible.');
        console.log('📝 Por favor, ejecuta manualmente el SQL en Supabase Dashboard:');
        console.log(`   Archivo: ${migrationFile}`);
        console.log('\nO ejecuta primero: docs/supabase/00_create_exec_sql_function.sql');
      }
      process.exit(1);
    }

    console.log('✅ Migración aplicada exitosamente!');
    console.log('📊 Respuesta:', data);

    // Verificar que las columnas existen
    console.log('\n🔍 Verificando columnas...');
    const { data: columns, error: columnsError } = await supabaseClient
      .from('issues')
      .select('sprint_history, status_by_sprint, story_points_by_sprint, status_history_days, epic_name')
      .limit(1);

    if (columnsError) {
      console.warn('⚠️ No se pudieron verificar las columnas:', columnsError.message);
    } else {
      console.log('✅ Columnas verificadas correctamente');
      console.log('📋 Columnas disponibles:', Object.keys(columns[0] || {}));
    }

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

applyMigration();
