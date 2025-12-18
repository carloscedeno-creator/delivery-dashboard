/**
 * Script para verificar qué épicas tienen fechas en Supabase
 * y cuáles no
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde múltiples ubicaciones posibles
const envPaths = [
  join(__dirname, '..', '.env'),
  join(__dirname, '..', '..', '.env'),
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
  } catch (e) {
    // Ignorar si no existe
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEpicDates() {
  console.log('🔍 Verificando fechas de épicas en Supabase...\n');

  try {
    // Obtener todas las épicas
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select('id, initiative_key, initiative_name, start_date, end_date, created_at')
      .order('initiative_name', { ascending: true });

    if (error) {
      console.error('❌ Error obteniendo épicas:', error);
      return;
    }

    if (!initiatives || initiatives.length === 0) {
      console.log('⚠️ No hay épicas en la base de datos');
      return;
    }

    console.log(`📊 Total de épicas: ${initiatives.length}\n`);

    // Agrupar por estado
    const withBothDates = initiatives.filter(i => i.start_date && i.end_date);
    const withStartOnly = initiatives.filter(i => i.start_date && !i.end_date);
    const withEndOnly = initiatives.filter(i => !i.start_date && i.end_date);
    const withoutDates = initiatives.filter(i => !i.start_date && !i.end_date);

    console.log('📈 Resumen:');
    console.log(`   ✅ Con ambas fechas: ${withBothDates.length}`);
    console.log(`   ⚠️  Solo start_date: ${withStartOnly.length}`);
    console.log(`   ⚠️  Solo end_date: ${withEndOnly.length}`);
    console.log(`   ❌ Sin fechas: ${withoutDates.length}\n`);

    // Mostrar ejemplos
    if (withBothDates.length > 0) {
      console.log('✅ Épicas CON fechas (primeras 5):');
      withBothDates.slice(0, 5).forEach(epic => {
        console.log(`   - ${epic.initiative_key}: ${epic.initiative_name}`);
        console.log(`     Start: ${epic.start_date}, End: ${epic.end_date}`);
      });
      console.log('');
    }

    if (withoutDates.length > 0) {
      console.log('❌ Épicas SIN fechas (primeras 10):');
      withoutDates.slice(0, 10).forEach(epic => {
        console.log(`   - ${epic.initiative_key}: ${epic.initiative_name}`);
        console.log(`     Created: ${epic.created_at}`);
      });
      console.log('');
    }

    // Recomendación
    if (withoutDates.length > 0) {
      console.log('💡 Recomendación:');
      console.log('   Ejecuta el sincronizador manualmente para extraer las fechas:');
      console.log('   cd jira-supabase-sync');
      console.log('   npm run sync');
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkEpicDates();

