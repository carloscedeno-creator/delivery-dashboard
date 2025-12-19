/**
 * Script para verificar el esquema actual de la tabla issues
 * y confirmar que no existe la columna epic_id
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Cargar variables de entorno desde múltiples ubicaciones
const rootEnvPath = join(rootDir, '.env');
const localEnvPath = join(__dirname, '../.env');
dotenv.config({ path: rootEnvPath });
dotenv.config({ path: localEnvPath });
dotenv.config(); // Fallback

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verifySchema() {
  console.log('🔍 Verificando esquema de la tabla issues...\n');

  try {
    // Intentar hacer un SELECT de todas las columnas posibles para ver cuáles existen
    // Esto nos dirá qué columnas están disponibles en PostgREST
    console.log('📊 Verificando columnas disponibles en PostgREST...\n');
    
    const testColumns = [
      'id', 'squad_id', 'initiative_id', 'epic_id', 'epic_name',
      'issue_key', 'issue_type', 'summary', 'assignee_id', 'priority',
      'current_status', 'current_story_points', 'resolution',
      'created_date', 'resolved_date', 'updated_date',
      'dev_start_date', 'dev_close_date',
      'sprint_history', 'status_by_sprint', 'story_points_by_sprint',
      'status_history_days', 'raw_data'
    ];

    const existingColumns = [];
    const missingColumns = [];
    const epicIdFound = false;

    // Probar cada columna haciendo un SELECT limitado
    for (const col of testColumns) {
      try {
        const { error } = await supabase
          .from('issues')
          .select(col)
          .limit(0); // Solo verificar que la columna existe, no obtener datos

        if (error) {
          if (error.message && error.message.includes('column') && error.message.includes('does not exist')) {
            missingColumns.push(col);
          } else {
            // Otro error, pero la columna probablemente existe
            existingColumns.push(col);
          }
        } else {
          existingColumns.push(col);
        }
      } catch (err) {
        // Error al verificar, asumir que no existe
        missingColumns.push(col);
      }
    }

    console.log('✅ Columnas que EXISTEN:');
    existingColumns.forEach(col => {
      const marker = col === 'initiative_id' ? '✅' : 
                     col === 'epic_name' ? '✅' : '  ';
      console.log(`${marker} ${col}`);
    });

    if (missingColumns.length > 0) {
      console.log('\n❌ Columnas que NO EXISTEN:');
      missingColumns.forEach(col => {
        const marker = col === 'epic_id' ? '✅ (correcto, no debería existir)' : '❌';
        console.log(`${marker} ${col}`);
      });
    }

    console.log('\n📋 Resumen:');
    console.log(`   Total de columnas verificadas: ${testColumns.length}`);
    console.log(`   Columnas existentes: ${existingColumns.length}`);
    console.log(`   Columnas faltantes: ${missingColumns.length}`);
    
    if (existingColumns.includes('epic_id')) {
      console.log('\n   ❌ PROBLEMA CRÍTICO: La columna epic_id todavía existe en PostgREST');
      console.log('      Esto causará errores durante el upsert.');
    } else {
      console.log('\n   ✅ La columna epic_id NO existe en PostgREST (correcto)');
    }
    
    if (existingColumns.includes('initiative_id')) {
      console.log('   ✅ La columna initiative_id existe (correcto)');
    } else {
      console.log('   ❌ PROBLEMA: La columna initiative_id NO existe');
    }
    
    if (existingColumns.includes('epic_name')) {
      console.log('   ✅ La columna epic_name existe (correcto)');
    } else {
      console.log('   ❌ PROBLEMA: La columna epic_name NO existe');
    }

    // Si epic_id existe, es un problema crítico
    if (existingColumns.includes('epic_id')) {
      console.log('\n⚠️  ACCIÓN REQUERIDA:');
      console.log('   La columna epic_id todavía existe en la base de datos.');
      console.log('   Necesitas ejecutar una migración para eliminarla:');
      console.log('   ALTER TABLE public.issues DROP COLUMN IF EXISTS epic_id;');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

verifySchema()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
