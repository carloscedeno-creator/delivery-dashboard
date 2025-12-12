/**
 * Verificar configuración de sincronización para Core
 */

import { supabase } from './analyze-supabase.js';

async function checkSyncConfig() {
  console.log('🔍 Verificando configuración de sincronización\n');

  try {
    // 1. Buscar Core
    const { data: squads } = await supabase
      .from('squads')
      .select('id, squad_key, squad_name, jira_domain')
      .or('squad_name.ilike.%core%,squad_key.ilike.%core%');

    const coreSquad = squads[0];
    console.log(`🏢 Squad: ${coreSquad.squad_name} (${coreSquad.squad_key})`);
    console.log(`   ID: ${coreSquad.id}`);
    console.log(`   Dominio: ${coreSquad.jira_domain}\n`);

    // 2. Obtener configuración del squad
    console.log('='.repeat(80));
    console.log('1️⃣ Configuración del Squad (squad_config)');
    console.log('='.repeat(80));
    
    const { data: squadConfig, error: configError } = await supabase
      .from('squad_config')
      .select('*')
      .eq('squad_id', coreSquad.id)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('❌ Error obteniendo configuración:', configError);
    } else if (!squadConfig) {
      console.log('⚠️ No hay configuración personalizada para Core');
      console.log('   Se usará el JQL por defecto:');
      console.log(`   Project = "${coreSquad.squad_key}" AND issuetype != "Sub-task" ORDER BY created DESC`);
    } else {
      console.log('✅ Configuración encontrada:');
      console.log(`   JQL Query: ${squadConfig.jql_query || '(usando default)'}`);
      console.log(`   Última actualización: ${squadConfig.updated_at || 'N/A'}`);
    }

    // 3. Verificar última sincronización
    console.log('\n' + '='.repeat(80));
    console.log('2️⃣ Última Sincronización');
    console.log('='.repeat(80));
    
    // Intentar con ambos nombres de tabla
    let syncLogs = null;
    let syncError = null;
    
    const { data: logs1, error: err1 } = await supabase
      .from('data_sync_log')
      .select('*')
      .eq('squad_id', coreSquad.id)
      .order('started_at', { ascending: false })
      .limit(5);
    
    if (!err1 && logs1) {
      syncLogs = logs1;
    } else {
      const { data: logs2, error: err2 } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('squad_id', coreSquad.id)
        .order('started_at', { ascending: false })
        .limit(5);
      
      if (!err2 && logs2) {
        syncLogs = logs2;
      } else {
        syncError = err2 || err1;
      }
    }

    if (syncError) {
      console.error('❌ Error obteniendo logs de sincronización:', syncError);
    } else if (!syncLogs || syncLogs.length === 0) {
      console.log('⚠️ No hay registros de sincronización');
    } else {
      console.log(`Total de sincronizaciones registradas: ${syncLogs.length}`);
      console.log('\nÚltimas 5 sincronizaciones:');
      syncLogs.forEach((log, index) => {
        const started = new Date(log.started_at).toLocaleString();
        const duration = log.duration_seconds ? `${log.duration_seconds}s` : 'N/A';
        console.log(`\n${index + 1}. ${started}`);
        console.log(`   Tipo: ${log.sync_type}`);
        console.log(`   Estado: ${log.status}`);
        console.log(`   Issues procesados: ${log.issues_processed || 0}`);
        console.log(`   Duración: ${duration}`);
        if (log.error_message) {
          console.log(`   ⚠️ Error: ${log.error_message}`);
        }
      });
    }

    // 4. Verificar si ODSO-328 existe y sus características
    console.log('\n' + '='.repeat(80));
    console.log('3️⃣ Análisis de ODSO-328');
    console.log('='.repeat(80));
    
    console.log('Buscando ODSO-328 en Supabase...');
    const { data: odso328 } = await supabase
      .from('issues')
      .select('*')
      .eq('issue_key', 'ODSO-328')
      .limit(1);

    if (odso328 && odso328.length > 0) {
      const issue = odso328[0];
      console.log('✅ ODSO-328 encontrado en Supabase:');
      console.log(`   Summary: ${issue.summary}`);
      console.log(`   Status: ${issue.current_status}`);
      console.log(`   Squad ID: ${issue.squad_id}`);
      console.log(`   Assignee ID: ${issue.assignee_id}`);
      console.log(`   Created: ${issue.created_date}`);
      console.log(`   Updated: ${issue.updated_date}`);
      console.log(`   Initiative ID: ${issue.initiative_id || 'null'}`);
    } else {
      console.log('❌ ODSO-328 NO encontrado en Supabase');
      console.log('\nPosibles razones:');
      console.log('1. El ticket no cumple con el filtro JQL configurado');
      console.log('2. El ticket es muy reciente y aún no se ha sincronizado');
      console.log('3. El ticket está en un proyecto diferente');
      console.log('4. El ticket fue creado después de la última sincronización');
    }

    // 5. Verificar JQL query por defecto
    console.log('\n' + '='.repeat(80));
    console.log('4️⃣ Análisis del JQL Query');
    console.log('='.repeat(80));
    
    const defaultJQL = `Project = "${coreSquad.squad_key}" AND issuetype != "Sub-task" ORDER BY created DESC`;
    const customJQL = squadConfig?.jql_query || defaultJQL;
    
    console.log(`JQL Query usado: ${customJQL}`);
    console.log('\nEste query filtra:');
    console.log(`  ✅ Project = "${coreSquad.squad_key}" (solo tickets del proyecto ODSO)`);
    console.log(`  ✅ issuetype != "Sub-task" (excluye sub-tareas)`);
    console.log(`  ✅ ORDER BY created DESC (ordenado por fecha de creación)`);
    
    if (customJQL !== defaultJQL) {
      console.log('\n⚠️ Se está usando un JQL personalizado que podría estar filtrando tickets');
    }

    // 6. Verificar si hay tickets recientes que no se sincronizaron
    console.log('\n' + '='.repeat(80));
    console.log('5️⃣ Tickets Recientes de Core (últimos 7 días)');
    console.log('='.repeat(80));
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: recentIssues } = await supabase
      .from('issues')
      .select('issue_key, summary, created_date, updated_date, current_status')
      .eq('squad_id', coreSquad.id)
      .gte('created_date', dateStr)
      .order('created_date', { ascending: false })
      .limit(10);

    if (recentIssues && recentIssues.length > 0) {
      console.log(`Total tickets creados en últimos 7 días: ${recentIssues.length}`);
      console.table(recentIssues.map(i => ({
        key: i.issue_key,
        summary: i.summary?.substring(0, 50),
        created: i.created_date?.split('T')[0],
        updated: i.updated_date?.split('T')[0],
        status: i.current_status
      })));
    } else {
      console.log('⚠️ No hay tickets recientes en Supabase');
    }

    // 7. Recomendaciones
    console.log('\n' + '='.repeat(80));
    console.log('📊 RECOMENDACIONES');
    console.log('='.repeat(80));
    
    if (!odso328 || odso328.length === 0) {
      console.log('\n🔧 Para capturar ODSO-328:');
      console.log('1. Verificar que ODSO-328 cumple con el JQL query:');
      console.log(`   ${customJQL}`);
      console.log('2. Si el ticket es muy reciente, esperar la próxima sincronización');
      console.log('3. Forzar una sincronización completa ejecutando el servicio de sync');
      console.log('4. Verificar en Jira que ODSO-328:');
      console.log('   - Pertenece al proyecto ODSO');
      console.log('   - No es una Sub-task');
      console.log('   - Está asignado correctamente');
    }

    if (syncLogs && syncLogs.length > 0) {
      const lastSync = new Date(syncLogs[0].started_at);
      const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
      console.log(`\n⏰ Última sincronización: hace ${hoursSinceSync.toFixed(1)} horas`);
      
      if (hoursSinceSync > 1) {
        console.log('⚠️ La última sincronización fue hace más de 1 hora');
        console.log('   Considera ejecutar una sincronización manual');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

checkSyncConfig()
  .then(() => {
    console.log('\n✅ Análisis completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
