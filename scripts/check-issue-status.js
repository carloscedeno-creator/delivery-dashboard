/**
 * Script para verificar y comparar estatus de tickets específicos
 * entre Jira y Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkIssueStatus(issueKeys = ['ODSO-297', 'ODSO-313']) {
  try {
    console.log(`\n🔍 Verificando estatus de tickets: ${issueKeys.join(', ')}\n`);

    for (const issueKey of issueKeys) {
      console.log(`\n📋 Ticket: ${issueKey}`);
      console.log('─'.repeat(50));

      // Obtener de Supabase
      const { data: issue, error } = await supabase
        .from('issues')
        .select('*, initiatives(squads(squad_name))')
        .eq('issue_key', issueKey)
        .single();

      if (error) {
        console.log(`  ❌ No encontrado en Supabase: ${error.message}`);
        continue;
      }

      console.log(`  ✅ Encontrado en Supabase:`);
      console.log(`     - Estatus actual: "${issue.current_status}"`);
      console.log(`     - Story Points: ${issue.current_story_points || 0}`);
      console.log(`     - Assignee ID: ${issue.assignee_id || 'N/A'}`);
      console.log(`     - Squad: ${issue.initiatives?.[0]?.squads?.squad_name || 'N/A'}`);
      console.log(`     - Última actualización: ${issue.updated_date || issue.updated_at || 'N/A'}`);

      // Verificar si hay historial de estatus
      const { data: statusHistory, error: historyError } = await supabase
        .from('issue_history')
        .select('*')
        .eq('issue_id', issue.id)
        .eq('field_name', 'status')
        .order('changed_at', { ascending: false })
        .limit(5);

      if (!historyError && statusHistory && statusHistory.length > 0) {
        console.log(`\n  📜 Historial de estatus (últimos 5):`);
        statusHistory.forEach((entry, idx) => {
          console.log(`     ${idx + 1}. ${entry.from_value} → ${entry.to_value} (${new Date(entry.changed_at).toLocaleString()})`);
        });
      }

      // Verificar en qué sprints está
      const { data: sprintIssues, error: sprintError } = await supabase
        .from('issue_sprints')
        .select('*, sprints(sprint_name, sprint_key)')
        .eq('issue_id', issue.id);

      if (!sprintError && sprintIssues && sprintIssues.length > 0) {
        console.log(`\n  🏃 Sprints asociados:`);
        sprintIssues.forEach(si => {
          console.log(`     - ${si.sprints?.sprint_name || si.sprints?.sprint_key || 'N/A'} (estatus al cierre: ${si.status_at_sprint_close || 'N/A'})`);
        });
      }
    }

    // Verificar última sincronización
    console.log(`\n\n🔄 Últimas sincronizaciones:`);
    console.log('─'.repeat(50));
    
    const { data: syncLogs, error: syncError } = await supabase
      .from('data_sync_log')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(5);

    if (!syncError && syncLogs && syncLogs.length > 0) {
      syncLogs.forEach((log, idx) => {
        console.log(`\n  ${idx + 1}. ${log.sync_type} - ${log.status}`);
        console.log(`     - Inicio: ${new Date(log.sync_started_at).toLocaleString()}`);
        if (log.sync_completed_at) {
          console.log(`     - Fin: ${new Date(log.sync_completed_at).toLocaleString()}`);
        }
        console.log(`     - Issues procesados: ${log.issues_count || 0}`);
        if (log.error_message) {
          console.log(`     - Error: ${log.error_message}`);
        }
      });
    } else {
      console.log('  ⚠️ No se encontraron registros de sincronización');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar
const issueKeys = process.argv.slice(2);
checkIssueStatus(issueKeys.length > 0 ? issueKeys : ['ODSO-297', 'ODSO-313']);





