/**
 * Script para normalizar estados usando actualizaciones SQL directas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    console.log('🔄 Normalizando estados con actualizaciones SQL directas...\n');

    // Mapeo de estados a normalizar
    const statusUpdates = [
      { from: 'To Do', to: 'TO DO' },
      { from: 'Done', to: 'DONE' },
      { from: 'In Progress', to: 'IN PROGRESS' },
      { from: 'Testing', to: 'TESTING' },
      { from: 'Blocked', to: 'BLOCKED' },
      { from: 'Security Review', to: 'SECURITY REVIEW' },
      { from: 'Reopen', to: 'REOPEN' },
      { from: 'ReOpen', to: 'REOPEN' },
      { from: 'Development Done', to: 'DEVELOPMENT DONE' },
      { from: 'QA External', to: 'QA EXTERNAL' },
      { from: 'Staging', to: 'STAGING' },
      { from: 'Ready To Release', to: 'READY TO RELEASE' },
      { from: 'In Review', to: 'IN REVIEW' },
      { from: 'Open', to: 'OPEN' },
      { from: 'Hold', to: 'HOLD' },
      { from: 'Requisitions', to: 'REQUISITIONS' },
    ];

    let totalUpdated = 0;

    for (const { from, to } of statusUpdates) {
      const { data, error, count } = await supabase
        .from('issues')
        .update({ current_status: to })
        .eq('current_status', from)
        .select('id', { count: 'exact' });

      if (error) {
        console.error(`   ❌ Error actualizando "${from}":`, error.message);
      } else {
        const updated = count || 0;
        if (updated > 0) {
          console.log(`   ✅ "${from}" -> "${to}": ${updated} issues`);
          totalUpdated += updated;
        }
      }
    }

    console.log(`\n✅ Total actualizado: ${totalUpdated} issues`);

    // Verificar estados finales
    const { data: finalStatuses, error: finalError } = await supabase
      .from('issues')
      .select('current_status')
      .limit(1000);

    if (!finalError && finalStatuses) {
      const statusCounts = {};
      finalStatuses.forEach(issue => {
        const status = issue.current_status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log(`\n📊 Estados finales (muestra de 1000 issues):`);
      Object.keys(statusCounts).sort().forEach(status => {
        console.log(`   - "${status}": ${statusCounts[status]} issues`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
