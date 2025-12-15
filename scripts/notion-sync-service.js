/**
 * Servicio de sincronización automática Notion → Supabase
 * Se ejecuta cada 30 minutos (igual que Jira)
 */

import dotenv from 'dotenv';
import cron from 'node-cron';
import { syncAllInitiatives } from './sync-notion-all-initiatives.js';

dotenv.config();

// Configuración
const SYNC_INTERVAL_MINUTES = parseInt(process.env.NOTION_SYNC_INTERVAL_MINUTES || '30');
const RUN_ON_START = process.env.NOTION_SYNC_RUN_ON_START !== 'false'; // Por defecto ejecutar al iniciar

let isRunning = false;
let lastSyncTime = null;
let syncCount = 0;

// Función wrapper para ejecutar sync
async function runSync() {
  if (isRunning) {
    console.log('⏸️  Sync already running, skipping...');
    return;
  }

  isRunning = true;
  syncCount++;
  const syncStartTime = Date.now();

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 [Sync #${syncCount}] Starting Notion synchronization`);
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    // Importar y ejecutar la función de sincronización
    const { syncAllInitiatives } = await import('./sync-notion-all-initiatives.js');
    
    // Ejecutar sincronización
    await syncAllInitiatives();

    const duration = ((Date.now() - syncStartTime) / 1000).toFixed(1);
    lastSyncTime = new Date();

    console.log(`\n✅ Sync #${syncCount} completed in ${duration}s`);
    console.log(`📅 Next sync in ${SYNC_INTERVAL_MINUTES} minutes\n`);

  } catch (error) {
    console.error(`\n❌ Error in sync #${syncCount}:`, error);
    console.error('Stack:', error.stack);
  } finally {
    isRunning = false;
  }
}

// Configurar cron job
const cronExpression = `*/${SYNC_INTERVAL_MINUTES} * * * *`;
console.log('🚀 Starting Notion Sync Service');
console.log(`📅 Cron schedule: ${cronExpression} (every ${SYNC_INTERVAL_MINUTES} minutes)`);
console.log(`🔄 Run on start: ${RUN_ON_START ? 'Yes' : 'No'}`);

// Ejecutar al iniciar si está configurado
if (RUN_ON_START) {
  console.log('\n🆕 Running initial sync...');
  runSync().catch(error => {
    console.error('❌ Error in initial sync:', error);
  });
}

// Programar ejecuciones periódicas
cron.schedule(cronExpression, () => {
  runSync().catch(error => {
    console.error('❌ Error in scheduled sync:', error);
  });
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  console.log(`📊 Total syncs performed: ${syncCount}`);
  if (lastSyncTime) {
    console.log(`📅 Last sync: ${lastSyncTime.toISOString()}`);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  console.log(`📊 Total syncs performed: ${syncCount}`);
  if (lastSyncTime) {
    console.log(`📅 Last sync: ${lastSyncTime.toISOString()}`);
  }
  process.exit(0);
});

// Mantener el proceso vivo
console.log('\n✅ Notion Sync Service is running...');
console.log('💡 Press Ctrl+C to stop\n');
