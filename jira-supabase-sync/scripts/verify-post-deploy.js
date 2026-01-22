/**
 * Script de verificación post-deploy
 * Valida que la sincronización mejorada está funcionando correctamente
 * 
 * Uso: node scripts/verify-post-deploy.js --squad "CORE INFRA" --sprint "Sprint 13"
 */

import dotenv from 'dotenv';
import { logger } from '../src/utils/logger.js';
import supabaseClient from '../src/clients/supabase-client.js';
import { createJiraClients } from '../src/clients/jira-client-factory.js';
import { projects, validateProjects } from '../src/config/projects.js';

dotenv.config();

async function verifySyncImprovements(squadName, sprintName) {
  try {
    logger.info('🔍 Verificación Post-Deploy de Mejoras de Sincronización');
    logger.info('='.repeat(60));
    
    // 1. Verificar que fetchSprintIssues funciona con paginación
    logger.info('\n📋 1. Verificando fetchSprintIssues con paginación...');
    
    // Obtener squad y sprint
    const { data: squads } = await supabaseClient.client
      .from('squads')
      .select('id, squad_name')
      .ilike('squad_name', `%${squadName}%`)
      .limit(1);
    
    if (!squads || squads.length === 0) {
      logger.error(`❌ No se encontró squad: ${squadName}`);
      return;
    }
    
    const squad = squads[0];
    logger.info(`   ✅ Squad encontrado: ${squad.squad_name} (ID: ${squad.id})`);
    
    const { data: sprints } = await supabaseClient.client
      .from('sprints')
      .select('id, sprint_key, sprint_name, start_date, end_date')
      .eq('squad_id', squad.id)
      .ilike('sprint_name', `%${sprintName}%`)
      .limit(1);
    
    if (!sprints || sprints.length === 0) {
      logger.error(`❌ No se encontró sprint: ${sprintName}`);
      return;
    }
    
    const sprint = sprints[0];
    logger.info(`   ✅ Sprint encontrado: ${sprint.sprint_name} (Key: ${sprint.sprint_key})`);
    
    // 2. Verificar que fetchSprintIssues puede obtener todos los issues
    if (sprint.sprint_key) {
      logger.info(`\n📥 2. Probando fetchSprintIssues con sprint ID: ${sprint.sprint_key}...`);
      
      // Encontrar el proyecto correspondiente
      const project = projects.find(p => 
        p.projectKey.toUpperCase() === squad.squad_name.toUpperCase()
      );
      
      if (!project) {
        logger.warn(`   ⚠️ No se encontró proyecto configurado para ${squad.squad_name}`);
        logger.info(`   💡 Continuando con verificación de datos en Supabase...`);
      } else {
        const jiraClients = createJiraClients([project]);
        const jiraClient = jiraClients.get(project.projectKey);
        
        if (jiraClient) {
          try {
            const sprintIssues = await jiraClient.fetchSprintIssues(sprint.sprint_key);
            logger.info(`   ✅ fetchSprintIssues obtuvo ${sprintIssues.length} issues`);
            
            if (sprintIssues.length > 100) {
              logger.success(`   ✅ Paginación funcionando correctamente (${sprintIssues.length} > 100)`);
            } else {
              logger.info(`   ℹ️ Sprint tiene ${sprintIssues.length} issues (no requiere paginación)`);
            }
          } catch (error) {
            logger.warn(`   ⚠️ Error probando fetchSprintIssues: ${error.message}`);
          }
        }
      }
    }
    
    // 3. Verificar datos en Supabase
    logger.info(`\n📊 3. Verificando datos en Supabase para ${sprint.sprint_name}...`);
    
    const { data: issueSprints, error: issueSprintsError } = await supabaseClient.client
      .from('issue_sprints')
      .select(`
        issue_id,
        status_at_sprint_close,
        story_points_at_start,
        story_points_at_close,
        issues!inner(issue_key, status)
      `)
      .eq('sprint_id', sprint.id);
    
    if (issueSprintsError) {
      logger.error(`   ❌ Error obteniendo issue_sprints: ${issueSprintsError.message}`);
      return;
    }
    
    logger.info(`   ✅ Total de tickets en Supabase: ${issueSprints.length}`);
    
    // Contar tickets en Done
    const doneTickets = issueSprints.filter(
      is => is.status_at_sprint_close === 'Done' || is.issues?.status === 'Done'
    );
    
    logger.info(`   ✅ Tickets en Done: ${doneTickets.length}`);
    
    // Verificar que hay story_points_at_start (para Planning Accuracy)
    const ticketsWithSP = issueSprints.filter(
      is => is.story_points_at_start !== null && is.story_points_at_start !== undefined
    );
    
    logger.info(`   ✅ Tickets con Story Points al inicio: ${ticketsWithSP.length}`);
    
    // 4. Verificar sprint_velocity table
    logger.info(`\n📈 4. Verificando sprint_velocity table...`);
    
    const { data: velocity, error: velocityError } = await supabaseClient.client
      .from('sprint_velocity')
      .select('*')
      .eq('sprint_id', sprint.id)
      .limit(1);
    
    if (velocityError) {
      logger.warn(`   ⚠️ Error obteniendo sprint_velocity: ${velocityError.message}`);
      logger.info(`   💡 Esto es normal si el sprint aún no ha sido procesado`);
    } else if (velocity && velocity.length > 0) {
      const v = velocity[0];
      logger.info(`   ✅ Sprint Velocity encontrado:`);
      logger.info(`      - Commitment: ${v.commitment} SP`);
      logger.info(`      - Completed: ${v.completed} SP`);
      logger.info(`      - Planning Accuracy: ${v.completed > 0 && v.commitment > 0 ? ((v.completed / v.commitment) * 100).toFixed(2) : 'N/A'}%`);
    } else {
      logger.info(`   ℹ️ No hay datos de velocity aún (se generan después de sync completa)`);
    }
    
    // 5. Resumen
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 RESUMEN DE VERIFICACIÓN');
    logger.info('='.repeat(60));
    logger.info(`✅ Squad: ${squad.squad_name}`);
    logger.info(`✅ Sprint: ${sprint.sprint_name}`);
    logger.info(`✅ Tickets en Supabase: ${issueSprints.length}`);
    logger.info(`✅ Tickets en Done: ${doneTickets.length}`);
    logger.info(`✅ Tickets con SP al inicio: ${ticketsWithSP.length}`);
    
    if (doneTickets.length > 0) {
      logger.success(`\n✅ La sincronización está capturando tickets en Done correctamente`);
    } else {
      logger.warn(`\n⚠️ No se encontraron tickets en Done. Esto puede ser normal si el sprint aún no tiene tickets completados.`);
    }
    
    logger.info('\n💡 Próximos pasos:');
    logger.info('   1. Monitorear próxima ejecución del workflow de GitHub Actions');
    logger.info('   2. Verificar logs en GitHub Actions para confirmar que usa el nuevo código');
    logger.info('   3. Ejecutar este script nuevamente después de la próxima sync para validar mejoras');
    
  } catch (error) {
    logger.error('❌ Error en verificación:', error);
    process.exit(1);
  }
}

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
let squadName = null;
let sprintName = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--squad' && args[i + 1]) {
    squadName = args[i + 1];
  }
  if (args[i] === '--sprint' && args[i + 1]) {
    sprintName = args[i + 1];
  }
}

if (!squadName || !sprintName) {
  logger.error('❌ Uso: node scripts/verify-post-deploy.js --squad "CORE INFRA" --sprint "Sprint 13"');
  process.exit(1);
}

// Validar configuración
try {
  validateProjects();
} catch (error) {
  logger.warn(`⚠️ Advertencia en configuración: ${error.message}`);
}

verifySyncImprovements(squadName, sprintName);
