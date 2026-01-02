/**
 * Servicio de sincronización completa diaria
 * Ejecuta una sincronización completa todos los días a las 12 AM EST (5 AM UTC)
 * 
 * EST (Eastern Standard Time) = UTC-5
 * EDT (Eastern Daylight Time) = UTC-4 (horario de verano)
 * 
 * Para simplificar, usamos 5 AM UTC que corresponde a:
 * - 12 AM EST (invierno)
 * - 1 AM EDT (verano)
 * 
 * Si necesitas exactamente 12 AM EST siempre, puedes usar:
 * - 5 AM UTC en invierno
 * - 4 AM UTC en verano (pero esto requiere detectar DST)
 */

import cron from 'node-cron';
import { logger } from './utils/logger.js';

// Importar la función de sincronización completa diaria
import runFullSyncDaily from './run-full-sync-daily.js';

// Configurar cron para las 12 AM EST (5 AM UTC)
// Formato cron: minuto hora día mes día-semana
// 5 AM UTC = 12 AM EST (invierno) o 1 AM EDT (verano)
const cronExpression = '0 5 * * *'; // 5:00 AM UTC todos los días

logger.info('🌙 Iniciando servicio de sincronización completa diaria');
logger.info(`📅 Programado para ejecutarse todos los días a las 12:00 AM EST (5:00 AM UTC)`);
logger.info(`⏰ Cron expression: ${cronExpression}`);

// Ejecutar inmediatamente al iniciar (opcional, comentar si no quieres)
// logger.info('🚀 Ejecutando sincronización completa inicial...');
// runFullSyncDaily().catch(error => {
//   logger.error('❌ Error en sincronización inicial:', error);
// });

// Programar ejecución diaria
cron.schedule(cronExpression, async () => {
  const now = new Date();
  logger.info('\n' + '='.repeat(60));
  logger.info(`⏰ Ejecutando sincronización completa diaria programada...`);
  logger.info(`📅 Fecha/Hora: ${now.toISOString()}`);
  logger.info('='.repeat(60));
  
  try {
    await runFullSyncDaily();
  } catch (error) {
    logger.error('❌ Error en sincronización completa diaria:', error);
  }
});

// Mantener el proceso vivo
logger.info('✅ Servicio de sincronización completa diaria iniciado');
logger.info('💡 El servicio ejecutará una sincronización completa todos los días a las 12 AM EST');
logger.info('👋 Presiona Ctrl+C para detener.');

process.on('SIGINT', () => {
  logger.info('👋 Deteniendo servicio de sincronización completa diaria...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 Deteniendo servicio de sincronización completa diaria...');
  process.exit(0);
});

