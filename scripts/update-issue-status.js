/**
 * Script para actualizar manualmente los estatus de tickets en Supabase
 * Útil cuando el sincronizador no puede acceder por permisos
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateIssueStatus(issueKey, newStatus) {
  try {
    console.log(`\n🔄 Actualizando estatus de ${issueKey} a "${newStatus}"...`);
    
    // Buscar el issue
    const { data: issue, error: findError } = await supabase
      .from('issues')
      .select('id, issue_key, current_status')
      .eq('issue_key', issueKey)
      .single();
    
    if (findError || !issue) {
      console.error(`❌ Issue ${issueKey} no encontrado:`, findError?.message);
      return false;
    }
    
    console.log(`   📊 Estatus actual: "${issue.current_status}"`);
    console.log(`   📊 Nuevo estatus: "${newStatus}"`);
    
    if (issue.current_status === newStatus) {
      console.log(`   ✅ El estatus ya es correcto, no se necesita actualizar`);
      return true;
    }
    
    // Actualizar estatus usando service role key para bypass RLS si es necesario
    const supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey);
    
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('issues')
      .update({ 
        current_status: newStatus,
        updated_date: new Date().toISOString()
      })
      .eq('id', issue.id)
      .select('issue_key, current_status')
      .single();
    
    if (updateError) {
      console.error(`   ❌ Error actualizando:`, updateError.message);
      console.error(`   📋 Detalles:`, JSON.stringify(updateError, null, 2));
      return false;
    }
    
    console.log(`   ✅ Estatus actualizado correctamente`);
    if (updated) {
      console.log(`   📊 Nuevo estatus en DB: "${updated.current_status}"`);
      if (updated.current_status !== newStatus) {
        console.warn(`   ⚠️ ADVERTENCIA: El estatus no coincide. Esperado: "${newStatus}", Obtenido: "${updated.current_status}"`);
      }
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error actualizando ${issueKey}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Actualizando estatus de tickets manualmente...\n');
  
  // Basado en lo que viste en Jira:
  // ODSO-313: Status "DONE" (verde)
  // ODSO-297: Status "SECURITY REVIEW" (azul) - pero puede tener múltiples estatus
  
  const updates = [
    { issueKey: 'ODSO-313', status: 'Done' },
    { issueKey: 'ODSO-297', status: 'Security Review' }, // O puede ser "In Progress" si ese es el estatus principal
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const update of updates) {
    const success = await updateIssueStatus(update.issueKey, update.status);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN:');
  console.log('='.repeat(60));
  console.log(`✅ Actualizados: ${successCount}`);
  console.log(`❌ Fallidos: ${failCount}`);
  
  // Verificar los estatus finales
  console.log('\n🔍 Verificando estatus finales...');
  for (const update of updates) {
    const { data: issue } = await supabase
      .from('issues')
      .select('issue_key, current_status')
      .eq('issue_key', update.issueKey)
      .single();
    
    if (issue) {
      console.log(`   ${issue.issue_key}: "${issue.current_status}"`);
    }
  }
}

main();

