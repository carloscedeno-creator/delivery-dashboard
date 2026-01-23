/**
 * Script para crear manualmente los sprints faltantes de OBD
 * Basado en el patrón observado: sprints de 2 semanas
 */

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';
import { randomUUID } from 'crypto';

async function crearSprintsOBDFaltantes() {
  try {
    logger.info('🔧 Creando sprints faltantes de OBD manualmente...');

    // Sprints existentes (desde la base de datos)
    const { data: existingSprints } = await supabaseClient.client
      .from('sprints')
      .select('sprint_name, start_date, end_date')
      .ilike('sprint_name', '%obd%')
      .order('start_date', { ascending: true });

    console.log('📊 Sprints existentes actualmente:');
    existingSprints?.forEach((s, i) => {
      console.log(`${i+1}. ${s.sprint_name}: ${s.start_date?.split('T')[0]} → ${s.end_date?.split('T')[0]}`);
    });

    // Patrón observado: sprints de 2 semanas
    // Sprint 1: 2025-07-21 → 2025-08-04
    // Sprint 2: 2025-08-04 → 2025-08-18
    // Sprint 3: 2025-08-18 → 2025-09-02

    const baseStartDate = new Date('2025-07-21'); // Inicio del Sprint 1
    const sprintDurationWeeks = 2;

    // Calcular qué sprints faltan hasta el 14
    const existingSprintNumbers = existingSprints?.map(s => {
      const match = s.sprint_name.match(/sprint (\d+)/i);
      return match ? parseInt(match[1]) : 0;
    }).filter(n => n > 0) || [];

    const maxExisting = existingSprintNumbers.length > 0 ? Math.max(...existingSprintNumbers) : 0;
    const targetSprint = 14; // Según el usuario

    console.log(`\n🎯 Faltan sprints del ${maxExisting + 1} al ${targetSprint}`);

    let created = 0;
    let skipped = 0;

    // Crear sprints faltantes
    for (let sprintNum = maxExisting + 1; sprintNum <= targetSprint; sprintNum++) {
      const weeksOffset = (sprintNum - 1) * sprintDurationWeeks;
      const startDate = new Date(baseStartDate.getTime() + weeksOffset * 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + sprintDurationWeeks * 7 * 24 * 60 * 60 * 1000);

      // Para sprints futuros, determinar el estado
      const today = new Date('2026-01-23'); // Fecha actual
      let state = 'closed';
      if (startDate > today) {
        state = 'future';
      } else if (startDate <= today && endDate >= today) {
        state = 'active';
      }

      // Para sprints pasados, asumir que terminaron en la fecha de fin
      const completeDate = (state === 'closed' && endDate < today) ? endDate.toISOString() : null;

      const sprintData = {
        id: randomUUID(),
        squad_id: null, // Se asignará después si es necesario
        sprint_name: `OBD Sprint ${sprintNum}`,
        sprint_key: `OBD Sprint ${sprintNum}`,
        state: state,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        complete_date: completeDate,
        goal: null,
        planned_story_points: null,
        planned_capacity_hours: null
      };

      try {
        const { error } = await supabaseClient.client
          .from('sprints')
          .insert(sprintData);

        if (error) {
          if (error.code === '23505') { // Duplicate key
            logger.warn(`⚠️ Sprint ${sprintNum} ya existe, omitiendo...`);
            skipped++;
          } else {
            logger.error(`❌ Error creando Sprint ${sprintNum}:`, error.message);
          }
        } else {
          logger.success(`✅ Creado: OBD Sprint ${sprintNum} (${state})`);
          created++;
        }
      } catch (insertError) {
        logger.error(`💥 Error crítico creando Sprint ${sprintNum}:`, insertError.message);
      }
    }

    logger.success(`✅ Proceso completado: ${created} sprints creados, ${skipped} omitidos`);

    // Verificar resultado final
    const { data: finalSprints } = await supabaseClient.client
      .from('sprints')
      .select('sprint_name, state, start_date, end_date, complete_date')
      .ilike('sprint_name', '%obd%')
      .order('start_date', { ascending: true });

    console.log('\n📊 Estado FINAL de TODOS los sprints OBD:');
    finalSprints?.forEach((s, i) => {
      const start = s.start_date?.split('T')[0] || '?';
      const end = s.complete_date?.split('T')[0] || s.end_date?.split('T')[0] || '?';
      console.log(`${i+1}. ${s.sprint_name}: ${s.state} (${start} → ${end})`);
    });

    // Verificar si tenemos hasta el Sprint 14
    const hasSprint14 = finalSprints?.some(s => s.sprint_name.includes('Sprint 14'));
    if (hasSprint14) {
      logger.success('🎉 ¡Éxito! Ahora tenemos hasta el Sprint 14 de OBD!');
    } else {
      logger.error('❌ Error: Sprint 14 no fue creado');
    }

  } catch (error) {
    logger.error('❌ Error creando sprints faltantes:', error.message);
  }
}

// Ejecutar
crearSprintsOBDFaltantes();