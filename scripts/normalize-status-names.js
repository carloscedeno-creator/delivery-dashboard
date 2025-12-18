/**
 * Script para normalizar los nombres de estados en la base de datos
 * Convierte todos los estados a formato mayúsculas estándar
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Normaliza el nombre del estado
 */
function normalizeStatus(status) {
  if (!status || status === 'Unknown') return 'Unknown';
  
  const statusMap = {
    'to do': 'TO DO',
    'todo': 'TO DO',
    'to-do': 'TO DO',
    'in progress': 'IN PROGRESS',
    'in-progress': 'IN PROGRESS',
    'en progreso': 'IN PROGRESS',
    'done': 'DONE',
    'testing': 'TESTING',
    'test': 'TESTING',
    'blocked': 'BLOCKED',
    'security review': 'SECURITY REVIEW',
    'security-review': 'SECURITY REVIEW',
    'reopen': 'REOPEN',
    're-opened': 'REOPEN',
    'reopen': 'REOPEN',
    'compliance check': 'COMPLIANCE CHECK',
    'compliance-check': 'COMPLIANCE CHECK',
    'development done': 'DEVELOPMENT DONE',
    'development-done': 'DEVELOPMENT DONE',
    'qa': 'QA',
    'qa external': 'QA EXTERNAL',
    'qa-external': 'QA EXTERNAL',
    'staging': 'STAGING',
    'ready to release': 'READY TO RELEASE',
    'ready-to-release': 'READY TO RELEASE',
    'in review': 'IN REVIEW',
    'in-review': 'IN REVIEW',
    'open': 'OPEN',
    'hold': 'HOLD',
    'requisitions': 'REQUISITIONS',
  };

  const normalized = status.trim();
  const lowerStatus = normalized.toLowerCase();
  
  // Si está en el mapa, usar el valor mapeado
  if (statusMap[lowerStatus]) {
    return statusMap[lowerStatus];
  }
  
  // Si ya está completamente en mayúsculas, verificar si es un estado válido
  if (normalized === normalized.toUpperCase()) {
    // Estados válidos que ya están en mayúsculas (como "QA", "BLOCKED", etc.)
    const validUpperStates = ['QA', 'BLOCKED', 'DONE', 'TO DO', 'IN PROGRESS', 'TESTING', 
                              'SECURITY REVIEW', 'REOPEN', 'STAGING', 'OPEN', 'HOLD', 
                              'IN REVIEW', 'REQUISITIONS', 'DEVELOPMENT DONE', 'QA EXTERNAL', 
                              'READY TO RELEASE', 'COMPLIANCE CHECK'];
    
    if (validUpperStates.includes(normalized)) {
      return normalized;
    }
  }
  
  // Convertir a mayúsculas por defecto (maneja casos como "Blocked", "Security Review", etc.)
  return normalized.toUpperCase();
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log('🔄 Normalizando estados en la base de datos...\n');

    // Obtener todos los estados únicos
    const { data: issues, error: fetchError } = await supabase
      .from('issues')
      .select('id, issue_key, current_status');

    if (fetchError) throw fetchError;

    console.log(`📊 Issues encontrados: ${issues?.length || 0}`);

    // Agrupar por estado actual
    const statusGroups = {};
    (issues || []).forEach(issue => {
      const status = issue.current_status || 'Unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(issue);
    });

    console.log(`\n📋 Estados únicos encontrados: ${Object.keys(statusGroups).length}`);
    Object.keys(statusGroups).sort().forEach(status => {
      console.log(`   - "${status}": ${statusGroups[status].length} issues`);
    });

    // Normalizar y actualizar
    let updated = 0;
    let unchanged = 0;

    for (const [oldStatus, issueList] of Object.entries(statusGroups)) {
      const newStatus = normalizeStatus(oldStatus);
      
      if (oldStatus !== newStatus) {
        console.log(`\n🔄 Normalizando "${oldStatus}" -> "${newStatus}" (${issueList.length} issues)`);
        
        const issueIds = issueList.map(i => i.id);
        
        const { error: updateError } = await supabase
          .from('issues')
          .update({ current_status: newStatus })
          .in('id', issueIds);

        if (updateError) {
          console.error(`   ❌ Error actualizando:`, updateError);
        } else {
          updated += issueIds.length;
          console.log(`   ✅ Actualizados ${issueIds.length} issues`);
        }
      } else {
        unchanged += issueList.length;
      }
    }

    // Segunda pasada: actualizar cualquier estado que aún no esté completamente en mayúsculas
    console.log(`\n🔄 Segunda pasada: normalizando estados restantes...`);
    const { data: remainingIssues, error: remainingError } = await supabase
      .from('issues')
      .select('id, issue_key, current_status');

    if (!remainingError && remainingIssues) {
      const secondPassUpdates = {};
      
      remainingIssues.forEach(issue => {
        const status = issue.current_status || 'Unknown';
        const normalized = normalizeStatus(status);
        
        if (status !== normalized) {
          if (!secondPassUpdates[normalized]) {
            secondPassUpdates[normalized] = [];
          }
          secondPassUpdates[normalized].push({
            oldStatus: status,
            issueId: issue.id
          });
        }
      });

      for (const [newStatus, updates] of Object.entries(secondPassUpdates)) {
        const issueIds = updates.map(u => u.issueId);
        const oldStatus = updates[0].oldStatus;
        
        console.log(`   🔄 "${oldStatus}" -> "${newStatus}" (${issueIds.length} issues)`);
        
        const { error: updateError } = await supabase
          .from('issues')
          .update({ current_status: newStatus })
          .in('id', issueIds);

        if (!updateError) {
          updated += issueIds.length;
        }
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Normalización completada:`);
    console.log(`   - Issues actualizados: ${updated}`);
    console.log(`   - Issues sin cambios: ${unchanged}`);
    console.log(`   - Total: ${updated + unchanged}`);

    // Mostrar resumen de estados finales
    const { data: finalIssues, error: finalError } = await supabase
      .from('issues')
      .select('current_status');

    if (!finalError && finalIssues) {
      const finalStatusGroups = {};
      finalIssues.forEach(issue => {
        const status = issue.current_status || 'Unknown';
        finalStatusGroups[status] = (finalStatusGroups[status] || 0) + 1;
      });

      console.log(`\n📊 Estados finales normalizados:`);
      Object.keys(finalStatusGroups).sort().forEach(status => {
        console.log(`   - "${status}": ${finalStatusGroups[status]} issues`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
