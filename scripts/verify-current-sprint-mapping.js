/**
 * Script para verificar que current_sprint se está mapeando correctamente
 * Compara los nombres de sprint entre la tabla sprints y current_sprint en issues
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('   Necesitas: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyCurrentSprintMapping() {
  console.log('🔍 Verificando mapeo de current_sprint...\n');

  try {
    // 1. Obtener todos los sprints
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('id, sprint_name, squad_id')
      .order('sprint_name');

    if (sprintsError) throw sprintsError;

    console.log(`📋 Total de sprints en la base de datos: ${sprints.length}\n`);

    // 2. Obtener todos los current_sprint únicos de issues
    const { data: issues, error: issuesError } = await supabase
      .from('issues')
      .select('current_sprint, issue_key, assignee_id')
      .not('current_sprint', 'is', null);

    if (issuesError) throw issuesError;

    const uniqueCurrentSprints = [...new Set(issues.map(i => i.current_sprint).filter(Boolean))];
    console.log(`📋 Total de current_sprint únicos en issues: ${uniqueCurrentSprints.length}\n`);

    // 3. Comparar nombres
    const sprintNames = new Set(sprints.map(s => s.sprint_name.trim()));
    const currentSprintNames = new Set(uniqueCurrentSprints.map(s => s?.trim()).filter(Boolean));

    console.log('🔍 Comparando nombres...\n');

    // Sprints que están en la tabla sprints pero no en current_sprint
    const sprintsNotInIssues = [...sprintNames].filter(name => !currentSprintNames.has(name));
    if (sprintsNotInIssues.length > 0) {
      console.log('⚠️  Sprints en tabla "sprints" que NO aparecen en current_sprint:');
      sprintsNotInIssues.slice(0, 10).forEach(name => {
        console.log(`   - "${name}"`);
      });
      if (sprintsNotInIssues.length > 10) {
        console.log(`   ... y ${sprintsNotInIssues.length - 10} más`);
      }
      console.log('');
    }

    // current_sprint que no están en la tabla sprints
    const currentSprintsNotInSprints = [...currentSprintNames].filter(name => !sprintNames.has(name));
    if (currentSprintsNotInSprints.length > 0) {
      console.log('⚠️  current_sprint en issues que NO están en tabla "sprints":');
      currentSprintsNotInSprints.slice(0, 10).forEach(name => {
        const count = issues.filter(i => i.current_sprint?.trim() === name).length;
        console.log(`   - "${name}" (${count} issues)`);
      });
      if (currentSprintsNotInSprints.length > 10) {
        console.log(`   ... y ${currentSprintsNotInSprints.length - 10} más`);
      }
      console.log('');
    }

    // 4. Verificar coincidencias exactas
    const exactMatches = [...sprintNames].filter(name => currentSprintNames.has(name));
    console.log(`✅ Coincidencias exactas: ${exactMatches.length} de ${sprintNames.size} sprints\n`);

    // 5. Verificar un sprint específico (el más reciente)
    if (sprints.length > 0) {
      const recentSprint = sprints[sprints.length - 1];
      console.log(`🔍 Verificando sprint reciente: "${recentSprint.sprint_name}" (ID: ${recentSprint.id})\n`);

      const { data: sprintIssues, error: sprintIssuesError } = await supabase
        .from('issues')
        .select('issue_key, current_sprint, assignee_id')
        .eq('current_sprint', recentSprint.sprint_name.trim());

      if (sprintIssuesError) {
        console.error('❌ Error obteniendo issues del sprint:', sprintIssuesError);
      } else {
        console.log(`   Issues con current_sprint = "${recentSprint.sprint_name}": ${sprintIssues.length}`);
        
        // Verificar si hay issues con current_sprint similar pero no exacto
        const { data: similarIssues, error: similarError } = await supabase
          .from('issues')
          .select('issue_key, current_sprint')
          .ilike('current_sprint', `%${recentSprint.sprint_name}%`);

        if (!similarError && similarIssues) {
          const exactMatches = similarIssues.filter(i => i.current_sprint?.trim() === recentSprint.sprint_name.trim());
          const nonExact = similarIssues.filter(i => i.current_sprint?.trim() !== recentSprint.sprint_name.trim());
          
          if (nonExact.length > 0) {
            console.log(`\n   ⚠️  Issues con nombres similares pero no exactos:`);
            nonExact.slice(0, 5).forEach(issue => {
              console.log(`      - ${issue.issue_key}: "${issue.current_sprint}"`);
            });
          }
        }
      }
    }

    // 6. Verificar issues de un desarrollador específico
    const { data: developers, error: devsError } = await supabase
      .from('developers')
      .select('id, display_name')
      .eq('active', true)
      .limit(1);

    if (!devsError && developers && developers.length > 0) {
      const dev = developers[0];
      console.log(`\n🔍 Verificando issues del desarrollador: ${dev.display_name} (ID: ${dev.id})\n`);

      const { data: devIssues, error: devIssuesError } = await supabase
        .from('issues')
        .select('issue_key, current_sprint, current_status')
        .eq('assignee_id', dev.id)
        .limit(10);

      if (!devIssuesError && devIssues) {
        console.log(`   Total de issues del desarrollador (muestra de 10):`);
        devIssues.forEach(issue => {
          console.log(`      - ${issue.issue_key}: current_sprint="${issue.current_sprint}", status="${issue.current_status}"`);
        });
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  }
}

verifyCurrentSprintMapping();




