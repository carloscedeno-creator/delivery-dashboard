/**
 * Buscar la tabla correcta de logs de sincronización
 */

import { supabase } from './analyze-supabase.js';

async function findSyncTable() {
  console.log('🔍 Buscando tabla de logs de sincronización\n');

  // Intentar diferentes nombres de tabla
  const possibleTables = [
    'data_sync_log',
    'sync_logs',
    'sync_log',
    'synchronization_logs',
    'jira_sync_logs'
  ];

  for (const tableName of possibleTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error && data !== null) {
        console.log(`✅ Tabla encontrada: ${tableName}`);
        
        // Obtener estructura
        const { data: sample } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (sample && sample.length > 0) {
          console.log('\nEstructura de la tabla:');
          console.log(Object.keys(sample[0]));
        }
        
        // Contar registros
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        console.log(`\nTotal de registros: ${count || 0}`);
        
        // Obtener últimos 5 registros
        const { data: recent } = await supabase
          .from(tableName)
          .select('*')
          .order('started_at', { ascending: false })
          .limit(5);
        
        if (recent && recent.length > 0) {
          console.log('\nÚltimos 5 registros:');
          console.table(recent.map(r => ({
            id: r.id,
            squad_id: r.squad_id,
            sync_type: r.sync_type,
            status: r.status,
            started_at: r.started_at?.split('T')[0] || 'N/A',
            issues_processed: r.issues_processed || 0
          })));
        }
        
        return tableName;
      }
    } catch (err) {
      // Tabla no existe, continuar
    }
  }

  console.log('❌ No se encontró ninguna tabla de logs de sincronización');
  return null;
}

findSyncTable()
  .then((tableName) => {
    if (tableName) {
      console.log(`\n✅ Usar tabla: ${tableName}`);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
