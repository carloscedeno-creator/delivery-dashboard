/**
 * Script temporal para obtener TODOS los sprints de OBD desde los issues existentes
 * en la base de datos y actualizar la información de sprints
 */

import supabaseClient from '../src/clients/supabase-client.js';
import { logger } from '../src/utils/logger.js';

async function obtenerTodosSprintsOBDDesdeIssues() {
  try {
    logger.info('🔍 Extrayendo información de sprints de OBD desde issues existentes...');

    // Obtener todos los issues de OBD
    const { data: obdIssues, error: issuesError } = await supabaseClient.client
      .from('issues')
      .select('id, issue_key, sprint_history, current_sprint')
      .ilike('issue_key', 'obd-%')
      .limit(1000); // Limitar para análisis inicial

    if (issuesError) {
      logger.error('❌ Error obteniendo issues:', issuesError.message);
      return;
    }

    if (!obdIssues || obdIssues.length === 0) {
      logger.warn('⚠️ No se encontraron issues de OBD en la base de datos');
      return;
    }

    logger.info(`📊 Analizando ${obdIssues.length} issues de OBD...`);

    // Extraer información de sprints desde los issues
    const sprintsMap = new Map();

    for (const issue of obdIssues) {
      // Extraer sprints del campo current_sprint
      if (issue.current_sprint) {
        const sprintNames = Array.isArray(issue.current_sprint)
          ? issue.current_sprint
          : [issue.current_sprint];

        sprintNames.forEach(sprintName => {
          if (sprintName && sprintName.toLowerCase().includes('obd sprint')) {
            if (!sprintsMap.has(sprintName)) {
              sprintsMap.set(sprintName, {
                name: sprintName,
                issues: []
              });
            }
            sprintsMap.get(sprintName).issues.push(issue.issue_key);
          }
        });
      }

      // Extraer sprints del historial (sprint_history)
      if (issue.sprint_history) {
        const history = Array.isArray(issue.sprint_history) ? issue.sprint_history : [issue.sprint_history];
        history.forEach(entry => {
          if (entry && typeof entry === 'object' && entry.sprint_name) {
            const sprintName = entry.sprint_name;
            if (sprintName && sprintName.toLowerCase().includes('obd sprint')) {
              if (!sprintsMap.has(sprintName)) {
                sprintsMap.set(sprintName, {
                  name: sprintName,
                  start_date: entry.start_date,
                  end_date: entry.end_date,
                  complete_date: entry.complete_date,
                  state: entry.state || 'unknown',
                  issues: []
                });
              }
              if (!sprintsMap.get(sprintName).issues.includes(issue.issue_key)) {
                sprintsMap.get(sprintName).issues.push(issue.issue_key);
              }
            }
          }
        });
      }
    }

    const sprintsArray = Array.from(sprintsMap.values());
    logger.info(`🎯 Sprints de OBD encontrados en issues: ${sprintsArray.length}`);

    // Mostrar sprints encontrados
    sprintsArray.forEach((sprint, i) => {
      console.log(`${i+1}. ${sprint.name}: ${sprint.state || 'unknown'} (${sprint.start_date || '?'} → ${sprint.complete_date || sprint.end_date || '?'}) - ${sprint.issues.length} issues`);
    });

    // Generar IDs de sprints basados en el nombre (ya que no tenemos los IDs reales)
    logger.info('💾 Creando/actualizando sprints en base de datos...');

    let created = 0;
    let updated = 0;

    for (const sprint of sprintsArray) {
      // Generar ID basado en el nombre del sprint
      const sprintId = sprint.name.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');

      // Estimar fechas si no están disponibles
      let startDate = sprint.start_date;
      let endDate = sprint.end_date;
      let completeDate = sprint.complete_date;

      if (!startDate) {
        // Intentar estimar basado en el número del sprint
        const match = sprint.name.match(/sprint (\d+)/i);
        if (match) {
          const sprintNum = parseInt(match[1]);
          // Asumiendo que los sprints son de 2 semanas, empezando desde una fecha base
          const baseDate = new Date('2025-07-21'); // Fecha del Sprint 1 de OBD
          const weeksOffset = (sprintNum - 1) * 2;
          startDate = new Date(baseDate.getTime() + weeksOffset * 7 * 24 * 60 * 60 * 1000).toISOString();
          endDate = new Date(baseDate.getTime() + (weeksOffset + 2) * 7 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const sprintData = {
        id: sprintId,
        sprint_name: sprint.name,
        state: sprint.state || 'closed',
        start_date: startDate,
        end_date: endDate,
        complete_date: completeDate,
        goal: null,
        board_id: null
      };

      // Verificar si el sprint ya existe
      const { data: existing } = await supabaseClient.client
        .from('sprints')
        .select('id')
        .eq('id', sprintId)
        .single();

      if (existing) {
        // Actualizar
        const { error } = await supabaseClient.client
          .from('sprints')
          .update(sprintData)
          .eq('id', sprintId);

        if (!error) {
          updated++;
          logger.debug(`✅ Actualizado: ${sprint.name}`);
        } else {
          logger.warn(`⚠️ Error actualizando ${sprint.name}:`, error.message);
        }
      } else {
        // Crear
        const { error } = await supabaseClient.client
          .from('sprints')
          .insert(sprintData);

        if (!error) {
          created++;
          logger.debug(`✅ Creado: ${sprint.name}`);
        } else {
          logger.warn(`⚠️ Error creando ${sprint.name}:`, error.message);
        }
      }
    }

    logger.success(`✅ Proceso completado: ${created} sprints creados, ${updated} actualizados`);

    // Verificar resultado final
    const { data: finalSprints } = await supabaseClient.client
      .from('sprints')
      .select('sprint_name, state, start_date, end_date, complete_date')
      .ilike('sprint_name', '%obd%')
      .order('start_date', { ascending: true });

    console.log('\n📊 Estado FINAL de sprints OBD en base de datos:');
    finalSprints?.forEach((s, i) => {
      console.log(`${i+1}. ${s.sprint_name}: ${s.state} (${s.start_date?.split('T')[0] || '?'} → ${s.complete_date?.split('T')[0] || s.end_date?.split('T')[0] || '?'})`);
    });

    // Verificar si llegó al Sprint 14
    const sprint14Exists = finalSprints?.some(s => s.sprint_name.includes('Sprint 14'));
    if (sprint14Exists) {
      logger.success('🎉 ¡Sprint 14 encontrado!');
    } else {
      logger.warn('⚠️ Sprint 14 NO encontrado. Puede que necesitemos sincronización manual.');
    }

  } catch (error) {
    logger.error('❌ Error obteniendo sprints de OBD:', error.message);
  }
}

// Ejecutar
obtenerTodosSprintsOBDDesdeIssues();