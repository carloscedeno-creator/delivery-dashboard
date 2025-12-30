/**
 * Script para forzar la sincronización de tickets específicos desde Jira
 * Útil cuando los estatus no están actualizados en Supabase
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Los módulos se importan dinámicamente dentro de la función

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

async function forceSyncIssues(issueKeys = ['ODSO-297', 'ODSO-313']) {
  try {
    // Importar módulos dinámicamente
    const syncDir = join(__dirname, '..', 'jira-supabase-sync', 'src');
    const { processIssue } = await import(join(syncDir, 'processors', 'issue-processor.js'));
    const jiraClientDefault = (await import(join(syncDir, 'clients', 'jira-client.js'))).default;
    const supabaseClient = (await import(join(syncDir, 'clients', 'supabase-client.js'))).default;
    const { config } = await import(join(syncDir, 'config.js'));

    console.log(`\n🔄 Forzando sincronización de tickets: ${issueKeys.join(', ')}\n`);

    // Determinar el proyecto del issue key
    const projectKey = issueKeys[0].split('-')[0]; // ODSO, OBD, etc.
    
    // Obtener o crear squad
    const squadId = await supabaseClient.getOrCreateSquad(
      projectKey,
      projectKey,
      config.jira.domain
    );

    console.log(`✅ Squad ID: ${squadId}\n`);

    for (const issueKey of issueKeys) {
      console.log(`📋 Sincronizando: ${issueKey}`);
      console.log('─'.repeat(50));

      try {
        // Obtener issue completo de Jira con changelog
        console.log(`  📥 Obteniendo datos de Jira...`);
        const jiraIssue = await jiraClientDefault.fetchIssueDetails(issueKey);
        
        if (!jiraIssue) {
          console.log(`  ❌ No se encontró el ticket en Jira`);
          continue;
        }

        // Mostrar estatus actual en Jira
        const jiraStatus = jiraIssue.fields?.status?.name || 'Unknown';
        console.log(`  ✅ Estatus en Jira: "${jiraStatus}"`);

        // Obtener estatus actual en Supabase antes de actualizar
        const supabase = supabaseClient.client;
        const { data: existingIssue } = await supabase
          .from('issues')
          .select('current_status, updated_date')
          .eq('issue_key', issueKey)
          .single();

        if (existingIssue) {
          console.log(`  📊 Estatus actual en Supabase: "${existingIssue.current_status}"`);
          console.log(`  📅 Última actualización: ${existingIssue.updated_date || 'N/A'}`);
        } else {
          console.log(`  ⚠️ Ticket no existe en Supabase, se creará`);
        }

        // Procesar y actualizar
        console.log(`  🔄 Procesando y actualizando...`);
        await processIssue(squadId, jiraIssue, jiraClientDefault);

        // Verificar estatus después de actualizar
        const { data: updatedIssue } = await supabase
          .from('issues')
          .select('current_status, updated_date')
          .eq('issue_key', issueKey)
          .single();

        if (updatedIssue) {
          console.log(`  ✅ Estatus actualizado en Supabase: "${updatedIssue.current_status}"`);
          if (jiraStatus !== updatedIssue.current_status) {
            console.log(`  ⚠️ ADVERTENCIA: El estatus en Jira ("${jiraStatus}") no coincide con Supabase ("${updatedIssue.current_status}")`);
          } else {
            console.log(`  ✅ Estatus coincide correctamente`);
          }
        }

        console.log(`  ✅ ${issueKey} sincronizado exitosamente\n`);

      } catch (error) {
        console.error(`  ❌ Error sincronizando ${issueKey}:`, error.message);
        if (error.response) {
          console.error(`     Status: ${error.response.status}`);
          console.error(`     Data:`, JSON.stringify(error.response.data, null, 2));
        }
        console.log('');
      }
    }

    console.log('✅ Sincronización forzada completada\n');

  } catch (error) {
    console.error('❌ Error general:', error);
    process.exit(1);
  }
}

// Ejecutar
const issueKeys = process.argv.slice(2);
if (issueKeys.length === 0) {
  console.log('📝 Uso: npm run force-sync-issues ODSO-297 ODSO-313');
  console.log('   O ejecutar con tickets específicos como argumentos');
  process.exit(0);
}

forceSyncIssues(issueKeys);




