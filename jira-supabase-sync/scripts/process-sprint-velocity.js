/**
 * Script para procesar y guardar datos del Velocity Report para todos los sprints
 * Puede ejecutarse manualmente o como parte del proceso de sincronización
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { processSprintVelocity } from '../src/processors/sprint-velocity-processor.js';
import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde el directorio raíz del proyecto
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

async function processAllSprintVelocity() {
  try {
    logger.info('🚀 Iniciando procesamiento de Velocity Report para todos los sprints...');

    // Obtener todos los sprints que tienen "Sprint" en el nombre
    // Procesar tanto cerrados como activos para tener datos completos
    const { data: sprints, error: sprintsError } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date, complete_date, state')
      .ilike('sprint_name', '%Sprint%')
      .not('start_date', 'is', null)
      .order('end_date', { ascending: false });

    if (sprintsError) {
      throw sprintsError;
    }

    if (!sprints || sprints.length === 0) {
      logger.warn('⚠️ No se encontraron sprints para procesar');
      return;
    }

    logger.info(`📊 Encontrados ${sprints.length} sprints para procesar`);

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Procesar cada sprint
    for (const sprint of sprints) {
      try {
        logger.info(`\n📋 Procesando sprint: ${sprint.sprint_name} (ID: ${sprint.id})`);
        const velocityData = await processSprintVelocity(sprint);
        
        if (velocityData) {
          successCount++;
          results.push({
            sprint: sprint.sprint_name,
            commitment: velocityData.commitment,
            completed: velocityData.completed,
            status: 'success'
          });
          logger.success(`✅ Sprint ${sprint.sprint_name} procesado: Commitment=${velocityData.commitment}, Completed=${velocityData.completed}`);
        } else {
          errorCount++;
          results.push({
            sprint: sprint.sprint_name,
            status: 'no_data'
          });
          logger.warn(`⚠️ Sprint ${sprint.sprint_name} no tiene datos suficientes`);
        }
      } catch (error) {
        errorCount++;
        results.push({
          sprint: sprint.sprint_name,
          status: 'error',
          error: error.message
        });
        logger.error(`❌ Error procesando sprint ${sprint.sprint_name}:`, error.message);
        // Continuar con el siguiente sprint aunque haya errores
      }
    }

    logger.info(`\n✅ Procesamiento completado:`);
    logger.info(`   ✅ Exitosos: ${successCount}`);
    logger.info(`   ⚠️  Sin datos: ${results.filter(r => r.status === 'no_data').length}`);
    logger.info(`   ❌ Errores: ${errorCount}`);
    logger.info(`   📊 Total: ${sprints.length}`);

    // Mostrar resumen de los primeros 10 resultados
    if (results.length > 0) {
      logger.info(`\n📈 RESUMEN DE VELOCITY (primeros 10):`);
      logger.info(`Sprint`.padEnd(30), `Commitment`.padEnd(12), `Completed`.padEnd(12), `Status`);
      logger.info('-'.repeat(70));
      results.slice(0, 10).forEach(r => {
        const commitment = r.commitment !== undefined ? String(r.commitment) : 'N/A';
        const completed = r.completed !== undefined ? String(r.completed) : 'N/A';
        logger.info(
          r.sprint.padEnd(30),
          commitment.padEnd(12),
          completed.padEnd(12),
          r.status
        );
      });
    }

  } catch (error) {
    logger.error('❌ Error fatal procesando Velocity Report:', error);
    throw error;
  }
}

// Si se ejecuta directamente (no como módulo)
if (import.meta.url === `file://${process.argv[1]}`) {
  processAllSprintVelocity()
    .then(() => {
      logger.success('✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      logger.error('❌ Script falló:', error);
      process.exit(1);
    });
}

export { processAllSprintVelocity };
