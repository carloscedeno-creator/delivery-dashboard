/**
 * Script para normalizar TODOS los estados a mayúsculas usando SQL directo
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
    console.log('🔄 Normalizando TODOS los estados a mayúsculas...\n');

    // Primero, obtener todos los estados únicos
    const { data: statuses, error: statusError } = await supabase
      .from('issues')
      .select('current_status')
      .not('current_status', 'is', null);

    if (statusError) throw statusError;

    const uniqueStatuses = [...new Set(statuses.map(s => s.current_status))];
    console.log(`📊 Estados únicos encontrados: ${uniqueStatuses.length}\n`);

    // Normalizar cada estado
    let totalUpdated = 0;
    const statusMap = {};

    for (const status of uniqueStatuses) {
      if (!status) continue;
      
      // Normalizar a mayúsculas
      const normalized = status.trim().toUpperCase();
      
      // Mapeos especiales
      const specialMaps = {
        'TO DO': 'TO DO',
        'TODO': 'TO DO',
        'IN PROGRESS': 'IN PROGRESS',
        'INPROGRESS': 'IN PROGRESS',
        'DONE': 'DONE',
        'TESTING': 'TESTING',
        'BLOCKED': 'BLOCKED',
        'SECURITY REVIEW': 'SECURITY REVIEW',
        'REOPEN': 'REOPEN',
        'RE-OPEN': 'REOPEN',
        'REOPENED': 'REOPEN',
        'DEVELOPMENT DONE': 'DEVELOPMENT DONE',
        'QA EXTERNAL': 'QA EXTERNAL',
        'STAGING': 'STAGING',
        'READY TO RELEASE': 'READY TO RELEASE',
        'IN REVIEW': 'IN REVIEW',
        'OPEN': 'OPEN',
        'HOLD': 'HOLD',
        'REQUISITIONS': 'REQUISITIONS',
        'COMPLIANCE CHECK': 'COMPLIANCE CHECK',
      };

      const finalStatus = specialMaps[normalized] || normalized;
      
      if (status !== finalStatus) {
        statusMap[status] = finalStatus;
      }
    }

    console.log(`📋 Estados a normalizar: ${Object.keys(statusMap).length}\n`);

    // Actualizar cada estado
    for (const [oldStatus, newStatus] of Object.entries(statusMap)) {
      const { count, error } = await supabase
        .from('issues')
        .update({ current_status: newStatus })
        .eq('current_status', oldStatus)
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error(`   ❌ Error actualizando "${oldStatus}":`, error.message);
      } else {
        const updated = count || 0;
        if (updated > 0) {
          console.log(`   ✅ "${oldStatus}" -> "${newStatus}": ${updated} issues`);
          totalUpdated += updated;
        }
      }
    }

    console.log(`\n✅ Total actualizado: ${totalUpdated} issues`);

    // Verificar estados finales
    const { data: finalStatuses, error: finalError } = await supabase
      .from('issues')
      .select('current_status')
      .not('current_status', 'is', null)
      .limit(1000);

    if (!finalError && finalStatuses) {
      const statusCounts = {};
      finalStatuses.forEach(issue => {
        const status = issue.current_status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      console.log(`\n📊 Estados finales normalizados (muestra de 1000 issues):`);
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
