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

    // Obtener métricas de sprints desde v_sprint_metrics_complete
    const sprintNames = sprints.map(s => s.sprint_name);
    const { data: metrics, error: metricsError } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .in('sprint_name', sprintNames)
      .order('sprint_name', { ascending: true });

    if (metricsError) {
      console.error('❌ Error obteniendo métricas:', metricsError);
      return;
    }

    console.log(`✅ Encontradas métricas para ${metrics.length} sprints\n`);

    // Crear mapa de métricas por nombre de sprint
    const metricsMap = new Map();
    metrics.forEach(m => {
      metricsMap.set(m.sprint_name, m);
    });

    // Comparar datos
    console.log('📊 COMPARACIÓN DE DATOS:\n');
    console.log('Sprint'.padEnd(25), 'Jira Commitment'.padEnd(18), 'Jira Completed'.padEnd(18), 
                'Supabase SP'.padEnd(18), 'Match?'.padEnd(10), 'Diff');
    console.log('-'.repeat(100));

    let totalMatched = 0;
    let totalNotFound = 0;
    const differences = [];

    for (const jiraData of jiraVelocityData) {
      const supabaseMetric = metricsMap.get(jiraData.sprint);
      
      if (!supabaseMetric) {
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
        // Buscar campos que puedan representar commitment y completed
        // Posibles campos: story_points, sp_committed, sp_done, total_story_points, etc.
        const supabaseSP = supabaseMetric.story_points || 
                          supabaseMetric.sp_done || 
                          supabaseMetric.total_story_points || 
                          supabaseMetric.completed_story_points || 
                          'N/A';
        
        const commitmentMatch = supabaseMetric.sp_committed === jiraData.commitment ||
                               supabaseMetric.committed_story_points === jiraData.commitment;
        const completedMatch = supabaseMetric.sp_done === jiraData.completed ||
                              supabaseMetric.completed_story_points === jiraData.completed ||
                              supabaseMetric.story_points === jiraData.completed;

        const match = commitmentMatch || completedMatch ? '✅' : '⚠️';
        
        if (match === '✅') {
          totalMatched++;
        } else {
          differences.push({
            sprint: jiraData.sprint,
            issue: 'Datos no coinciden',
            jiraCommitment: jiraData.commitment,
            jiraCompleted: jiraData.completed,
            supabaseData: supabaseMetric
          });
        }

        console.log(
          jiraData.sprint.padEnd(25),
          String(jiraData.commitment).padEnd(18),
          String(jiraData.completed).padEnd(18),
          String(supabaseSP).padEnd(18),
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
        if (diff.supabaseData) {
          console.log(`   Supabase - Campos disponibles:`, Object.keys(diff.supabaseData).join(', '));
          console.log(`   Supabase - Valores relevantes:`, {
            story_points: diff.supabaseData.story_points,
            sp_done: diff.supabaseData.sp_done,
            sp_committed: diff.supabaseData.sp_committed,
            total_story_points: diff.supabaseData.total_story_points,
            completed_story_points: diff.supabaseData.completed_story_points
          });
        }
        console.log('');
      });
    }

    // Mostrar estructura de v_sprint_metrics_complete para referencia
    if (metrics.length > 0) {
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
