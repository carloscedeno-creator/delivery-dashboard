/**
 * Script para verificar fechas de épicas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkEpicDates() {
  const { data: initiatives } = await supabase
    .from('initiatives')
    .select('id, initiative_key, initiative_name, start_date, end_date, created_at')
    .order('initiative_name');

  console.log('\n📦 ÉPICAS Y SUS FECHAS:\n');
  
  const withDates = [];
  const withoutDates = [];

  initiatives.forEach(i => {
    if (i.start_date || i.end_date) {
      withDates.push(i);
    } else {
      withoutDates.push(i);
    }
  });

  console.log(`✅ Con fechas: ${withDates.length}`);
  console.log(`⚠️  Sin fechas: ${withoutDates.length}\n`);

  if (withDates.length > 0) {
    console.log('Épicas CON fechas:');
    withDates.slice(0, 10).forEach(i => {
      console.log(`  - ${i.initiative_name || i.initiative_key}`);
      console.log(`    Start: ${i.start_date || 'null'}`);
      console.log(`    End: ${i.end_date || 'null'}`);
    });
  }

  if (withoutDates.length > 0) {
    console.log('\nÉpicas SIN fechas (primeras 10):');
    withoutDates.slice(0, 10).forEach(i => {
      console.log(`  - ${i.initiative_name || i.initiative_key} (created: ${i.created_at?.split('T')[0] || 'N/A'})`);
    });
  }
}

checkEpicDates().catch(console.error);

