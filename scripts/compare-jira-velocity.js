/**
 * Script para comparar datos del Velocity Report de Jira con los datos en Supabase
 * 
 * Uso:
 * node scripts/compare-jira-velocity.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY no está configurado');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Datos del Velocity Report de Jira (del usuario)
const jiraVelocityData = [
  { sprint: 'ODSO Sprint 1', commitment: 0, completed: 8 },
  { sprint: 'ODSO Sprint 2', commitment: 16, completed: 5 },
  { sprint: 'ODSO Sprint 3', commitment: 20, completed: 12 },
  { sprint: 'ODSO Sprint 4', commitment: 27, completed: 23 },
  { sprint: 'ODSO Sprint 5', commitment: 39, completed: 24 },
  { sprint: 'ODSO Sprint 6', commitment: 45, completed: 29 },
  { sprint: 'ODSO Sprint 7', commitment: 12, completed: 12 },
  { sprint: 'Sprint 8', commitment: 36, completed: 22 },
  { sprint: 'ODSO Sprint 9', commitment: 18, completed: 40 },
  { sprint: 'ODSO Sprint 10', commitment: 16, completed: 31 },
  { sprint: 'ODSO Sprint 11', commitment: 34, completed: 46 },
  { sprint: 'ODSO Sprint 12', commitment: 55, completed: 37 },
];

async function compareVelocityData() {
  console.log('🔄 Comparando datos de Velocity Report de Jira con Supabase...\n');

  try {
    // Obtener todos los sprints de OBD
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, sprint_name, squad_id')
      .ilike('sprint_name', '%Sprint%')
      .order('sprint_name', { ascending: true });

    if (sprintsError) {
      console.error('❌ Error obteniendo sprints:', sprintsError);
      return;
    }

    console.log(`✅ Encontrados ${sprints.length} sprints en Supabase\n`);

    // Obtener métricas de sprints desde sprint_velocity (nueva tabla)
    const sprintNames = sprints.map(s => s.sprint_name);
    const { data: velocityData, error: velocityError } = await supabase
      .from('sprint_velocity')
      .select('*')
      .in('sprint_name', sprintNames)
      .order('sprint_name', { ascending: true });

    // También obtener métricas desde v_sprint_metrics_complete para comparación
    const { data: metrics, error: metricsError } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .in('sprint_name', sprintNames)
      .order('sprint_name', { ascending: true });

    if (metricsError) {
      console.error('❌ Error obteniendo métricas:', metricsError);
      return;
    }

    if (velocityError) {
      console.warn('⚠️ Error obteniendo velocity data:', velocityError.message);
    } else {
      console.log(`✅ Encontrados datos de velocity para ${velocityData?.length || 0} sprints`);
    }

    if (metricsError) {
      console.warn('⚠️ Error obteniendo métricas:', metricsError.message);
    } else {
      console.log(`✅ Encontradas métricas para ${metrics?.length || 0} sprints\n`);
    }

    // Crear mapa de velocity data por nombre de sprint
    const velocityMap = new Map();
    if (velocityData) {
      velocityData.forEach(v => {
        velocityMap.set(v.sprint_name, v);
      });
    }

    // Crear mapa de métricas por nombre de sprint (para referencia)
    const metricsMap = new Map();
    if (metrics) {
      metrics.forEach(m => {
        metricsMap.set(m.sprint_name, m);
      });
    }

    // Comparar datos
    console.log('📊 COMPARACIÓN DE DATOS:\n');
    console.log('Sprint'.padEnd(25), 'Jira Commitment'.padEnd(18), 'Jira Completed'.padEnd(18), 
                'Supabase SP'.padEnd(18), 'Match?'.padEnd(10), 'Diff');
    console.log('-'.repeat(100));

    let totalMatched = 0;
    let totalNotFound = 0;
    const differences = [];

    for (const jiraData of jiraVelocityData) {
      const supabaseVelocity = velocityMap.get(jiraData.sprint);
      const supabaseMetric = metricsMap.get(jiraData.sprint);
      
      if (!supabaseVelocity && !supabaseMetric) {
        console.log(
          jiraData.sprint.padEnd(25),
          String(jiraData.commitment).padEnd(18),
          String(jiraData.completed).padEnd(18),
          'NOT FOUND'.padEnd(18),
          '❌'.padEnd(10),
          'N/A'
        );
        totalNotFound++;
        differences.push({
          sprint: jiraData.sprint,
          issue: 'Sprint no encontrado en Supabase',
          jiraCommitment: jiraData.commitment,
          jiraCompleted: jiraData.completed,
          supabaseData: null
        });
      } else {
        // Usar datos de sprint_velocity si están disponibles, sino usar v_sprint_metrics_complete
        const supabaseCommitment = supabaseVelocity?.commitment ?? null;
        const supabaseCompleted = supabaseVelocity?.completed ?? null;
        
        // Si no hay datos en sprint_velocity, intentar desde metrics
        const fallbackCommitment = supabaseMetric?.total_story_points ?? null;
        const fallbackCompleted = supabaseMetric?.completed_story_points ?? null;
        
        const finalCommitment = supabaseCommitment ?? fallbackCommitment ?? 'N/A';
        const finalCompleted = supabaseCompleted ?? fallbackCompleted ?? 'N/A';
        
        const commitmentMatch = supabaseCommitment !== null && 
                               Math.abs(Number(supabaseCommitment) - jiraData.commitment) <= 1; // Tolerancia de 1 SP
        const completedMatch = supabaseCompleted !== null && 
                              Math.abs(Number(supabaseCompleted) - jiraData.completed) <= 1; // Tolerancia de 1 SP

        const match = commitmentMatch && completedMatch ? '✅' : '⚠️';
        
        if (match === '✅') {
          totalMatched++;
        } else {
          differences.push({
            sprint: jiraData.sprint,
            issue: 'Datos no coinciden',
            jiraCommitment: jiraData.commitment,
            jiraCompleted: jiraData.completed,
            supabaseVelocity: supabaseVelocity,
            supabaseMetric: supabaseMetric
          });
        }

        console.log(
          jiraData.sprint.padEnd(25),
          String(jiraData.commitment).padEnd(18),
          String(jiraData.completed).padEnd(18),
          `${finalCommitment}/${finalCompleted}`.padEnd(18),
          match.padEnd(10),
          commitmentMatch && completedMatch ? 'OK' : 'CHECK'
        );
      }
    }

    console.log('\n' + '='.repeat(100));
    console.log(`\n📈 RESUMEN:`);
    console.log(`   ✅ Coincidencias: ${totalMatched}/${jiraVelocityData.length}`);
    console.log(`   ❌ No encontrados: ${totalNotFound}`);
    console.log(`   ⚠️  Diferencias: ${differences.length}`);

    if (differences.length > 0) {
      console.log('\n⚠️  DIFERENCIAS DETALLADAS:\n');
      differences.forEach(diff => {
        console.log(`   Sprint: ${diff.sprint}`);
        console.log(`   Issue: ${diff.issue}`);
        console.log(`   Jira - Commitment: ${diff.jiraCommitment}, Completed: ${diff.jiraCompleted}`);
        if (diff.supabaseVelocity) {
          console.log(`   Supabase Velocity - Commitment: ${diff.supabaseVelocity.commitment}, Completed: ${diff.supabaseVelocity.completed}`);
          console.log(`   Supabase Velocity - Tickets: Commitment=${diff.supabaseVelocity.commitment_tickets}, Completed=${diff.supabaseVelocity.completed_tickets}, Total=${diff.supabaseVelocity.total_tickets}`);
        }
        if (diff.supabaseMetric) {
          console.log(`   Supabase Metrics - Campos disponibles:`, Object.keys(diff.supabaseMetric).join(', '));
          console.log(`   Supabase Metrics - Valores relevantes:`, {
            total_story_points: diff.supabaseMetric.total_story_points,
            completed_story_points: diff.supabaseMetric.completed_story_points
          });
        }
        if (!diff.supabaseVelocity && !diff.supabaseMetric) {
          console.log(`   ⚠️ No hay datos en Supabase para este sprint`);
        }
        console.log('');
      });
    }

    // Mostrar estructura de sprint_velocity para referencia
    if (velocityData && velocityData.length > 0) {
      console.log('\n📋 ESTRUCTURA DE sprint_velocity (primer registro):\n');
      const sample = velocityData[0];
      console.log(JSON.stringify(sample, null, 2));
    }

    // Mostrar estructura de v_sprint_metrics_complete para referencia
    if (metrics && metrics.length > 0) {
      console.log('\n📋 ESTRUCTURA DE v_sprint_metrics_complete (primer registro):\n');
      const sample = metrics[0];
      console.log(JSON.stringify(sample, null, 2));
    }

  } catch (error) {
    console.error('❌ Error en comparación:', error);
  }
}

// Ejecutar comparación
compareVelocityData()
  .then(() => {
    console.log('\n✅ Comparación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
