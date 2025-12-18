/**
 * Script para corregir los estados de los issues del sprint ODSO Sprint 11
 * Basado en los estados actuales en Jira
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

// Correcciones de estados basadas en Jira
const statusCorrections = {
  'ODSO-205': 'DONE',
  'ODSO-308': 'TESTING',
  'ODSO-309': 'BLOCKED',
  'ODSO-311': 'TESTING',
  'ODSO-312': 'IN PROGRESS',
  'ODSO-316': 'IN PROGRESS',
};

async function main() {
  try {
    console.log('🔄 Corrigiendo estados de issues del sprint...\n');

    let totalUpdated = 0;
    const results = [];

    for (const [issueKey, correctStatus] of Object.entries(statusCorrections)) {
      console.log(`📝 Actualizando ${issueKey}: -> "${correctStatus}"`);
      
      // Buscar el issue
      const { data: issue, error: findError } = await supabase
        .from('issues')
        .select('id, issue_key, current_status')
        .eq('issue_key', issueKey)
        .single();

      if (findError || !issue) {
        console.log(`   ⚠️ Issue no encontrado: ${issueKey}`);
        results.push({ issueKey, success: false, error: 'Not found' });
        continue;
      }

      if (issue.current_status === correctStatus) {
        console.log(`   ✅ Ya está correcto: "${issue.current_status}"`);
        results.push({ issueKey, success: true, skipped: true });
        continue;
      }

      // Actualizar el estado
      const { error: updateError } = await supabase
        .from('issues')
        .update({ 
          current_status: correctStatus,
          updated_date: new Date().toISOString()
        })
        .eq('id', issue.id);

      if (updateError) {
        console.log(`   ❌ Error: ${updateError.message}`);
        results.push({ issueKey, success: false, error: updateError.message });
      } else {
        console.log(`   ✅ Actualizado: "${issue.current_status}" -> "${correctStatus}"`);
        totalUpdated++;
        results.push({ issueKey, success: true, oldStatus: issue.current_status, newStatus: correctStatus });
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Corrección completada:`);
    console.log(`   - Issues actualizados: ${totalUpdated}`);
    console.log(`   - Issues ya correctos: ${results.filter(r => r.success && r.skipped).length}`);
    console.log(`   - Errores: ${results.filter(r => !r.success).length}`);

    // Verificar resultados
    console.log(`\n📊 Verificación de estados actualizados:\n`);
    for (const [issueKey, expectedStatus] of Object.entries(statusCorrections)) {
      const { data: issue } = await supabase
        .from('issues')
        .select('issue_key, current_status')
        .eq('issue_key', issueKey)
        .single();

      if (issue) {
        const matches = (issue.current_status || '').toUpperCase() === expectedStatus.toUpperCase();
        const marker = matches ? '✅' : '❌';
        console.log(`   ${marker} ${issueKey}: "${issue.current_status}" (esperado: "${expectedStatus}")`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
