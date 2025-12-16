/**
 * Servicio de sincronización automática de Notion → Supabase
 * Se ejecuta cada 30 minutos usando node-cron
 * Similar al patrón de sincronización de Jira
 */

import cron from 'node-cron';
import { syncAllInitiatives } from './sync-notion-initiatives.js';

let isRunning = false;
let lastSyncTime = null;
let syncCount = 0;

/**
 * Función principal de sincronización
 */
async function performSync() {
  if (isRunning) {
    console.log('⏸️  Sync already running, skipping...');
    return;
  }

  isRunning = true;
  syncCount++;
  const syncStartTime = Date.now();

  console.log('\n' + '='.repeat(60));
  console.log(`🔄 Starting automatic sync #${syncCount}`);
  console.log('='.repeat(60));

  try {
    await syncAllInitiatives();
    
    lastSyncTime = new Date();
    const duration = ((Date.now() - syncStartTime) / 1000).toFixed(1);
    
    console.log('\n✅ Sync completed successfully');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`🕐 Completed at: ${lastSyncTime.toISOString()}`);
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    isRunning = false;
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Función wrapper para ejecutar sync
 */
async function runSync() {
  try {
    await performSync();
  } catch (error) {
    console.error('Fatal error in sync:', error);
  }
}

// Configurar cron job: cada 30 minutos
// Formato: minuto hora día mes día-semana
const cronExpression = '*/30 * * * *'; // Cada 30 minutos

console.log('🚀 Notion Sync Service Starting...');
console.log(`📅 Schedule: Every 30 minutes (${cronExpression})`);
console.log('⏰ Initial sync will run in 5 seconds...\n');

// Ejecutar sincronización inicial después de 5 segundos
setTimeout(() => {
  runSync();
}, 5000);

// Programar sincronización automática cada 30 minutos
cron.schedule(cronExpression, () => {
  runSync();
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
  if (isRunning) {
    console.log('⏳ Waiting for current sync to complete...');
    // Esperar hasta 60 segundos para que termine la sincronización
    setTimeout(() => {
      console.log('✅ Shutdown complete');
      process.exit(0);
    }, 60000);
  } else {
    console.log('✅ Shutdown complete');
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  if (isRunning) {
    console.log('⏳ Waiting for current sync to complete...');
    setTimeout(() => {
      console.log('✅ Shutdown complete');
      process.exit(0);
    }, 60000);
  } else {
    console.log('✅ Shutdown complete');
    process.exit(0);
  }
});

// Mostrar estado cada hora
setInterval(() => {
  if (lastSyncTime) {
    const timeSinceLastSync = Math.floor((Date.now() - lastSyncTime.getTime()) / 1000 / 60);
    console.log(`\n📊 Service Status:`);
    console.log(`   - Total syncs: ${syncCount}`);
    console.log(`   - Last sync: ${lastSyncTime.toISOString()} (${timeSinceLastSync} minutes ago)`);
    console.log(`   - Currently running: ${isRunning ? 'Yes' : 'No'}\n`);
  }
}, 3600000); // Cada hora

console.log('✅ Service started. Press Ctrl+C to stop.\n');
