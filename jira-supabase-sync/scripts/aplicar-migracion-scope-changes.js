/**
 * Script para aplicar migración de sprint_scope_changes
 * Tarea 4: Tracking Básico de Scope Changes
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '../.env') });

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';

async function aplicarMigracion() {
  try {
    logger.info('🚀 Aplicando migración: sprint_scope_changes...');

    // Leer archivo SQL
    const sqlPath = join(__dirname, '../migrations/create_sprint_scope_changes_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    // Ejecutar SQL en Supabase
    // Nota: Supabase JS client no tiene método directo para ejecutar SQL arbitrario
    // Necesitamos usar el método RPC o ejecutar desde el dashboard
    logger.info('📋 SQL migración leída correctamente');
    logger.info('⚠️  NOTA: Esta migración debe aplicarse manualmente desde Supabase SQL Editor');
    logger.info('📝 Archivo SQL: migrations/create_sprint_scope_changes_table.sql');
    logger.info('');
    logger.info('Pasos para aplicar:');
    logger.info('1. Abre Supabase Dashboard → SQL Editor');
    logger.info('2. Copia el contenido de migrations/create_sprint_scope_changes_table.sql');
    logger.info('3. Pega y ejecuta en SQL Editor');
    logger.info('4. Verifica que la tabla y vista se crearon correctamente');

    // Verificar si la tabla ya existe
    const { data: tableExists, error: checkError } = await supabaseClient.client
      .from('sprint_scope_changes')
      .select('id')
      .limit(1);

    if (!checkError && tableExists !== null) {
      logger.success('✅ La tabla sprint_scope_changes ya existe');
      return;
    }

    if (checkError && checkError.code === 'PGRST116') {
      logger.info('ℹ️  La tabla no existe aún, necesita aplicar la migración');
    } else if (checkError) {
      logger.error('❌ Error verificando tabla:', checkError);
    }

    logger.info('');
    logger.info('SQL a ejecutar:');
    logger.info('─'.repeat(60));
    console.log(sql);
    logger.info('─'.repeat(60));

  } catch (error) {
    logger.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

aplicarMigracion();
