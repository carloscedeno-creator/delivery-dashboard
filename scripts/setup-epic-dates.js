/**
 * Script para agregar campos de fechas a la tabla initiatives
 * Ejecuta la migración SQL para agregar start_date y end_date
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSQL = `
-- Agregar campos start_date y end_date a initiatives
ALTER TABLE initiatives 
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Crear índices para búsquedas por fechas
CREATE INDEX IF NOT EXISTS idx_initiatives_start_date ON initiatives(start_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_end_date ON initiatives(end_date);
CREATE INDEX IF NOT EXISTS idx_initiatives_dates ON initiatives(start_date, end_date);

-- Comentarios
COMMENT ON COLUMN initiatives.start_date IS 'Fecha de inicio de la épica desde el timeline de Jira';
COMMENT ON COLUMN initiatives.end_date IS 'Fecha de fin de la épica desde el timeline de Jira';
`;

async function setupEpicDates() {
  console.log('🔧 Configurando campos de fechas para épicas...\n');
  
  try {
    // Ejecutar migración usando RPC o directamente
    // Nota: Esto requiere permisos de service_role
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // Si no existe la función exec_sql, intentar ejecutar directamente
      console.warn('⚠️  No se pudo usar RPC exec_sql, intentando método alternativo...');
      console.log('📝 Por favor, ejecuta manualmente este SQL en Supabase SQL Editor:\n');
      console.log(migrationSQL);
      console.log('\n💡 O usa el archivo: docs/supabase/ADD_EPIC_DATES.sql\n');
      return;
    }

    console.log('✅ Campos start_date y end_date agregados a la tabla initiatives');
    console.log('✅ Índices creados');
    console.log('\n📝 Próximo paso: Actualizar el script de sincronización para guardar las fechas de las épicas desde Jira\n');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.log('\n📝 Por favor, ejecuta manualmente este SQL en Supabase SQL Editor:\n');
    console.log(migrationSQL);
    console.log('\n💡 O usa el archivo: docs/supabase/ADD_EPIC_DATES.sql\n');
  }
}

setupEpicDates().catch(console.error);





