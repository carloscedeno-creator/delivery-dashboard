/**
 * Script para calcular métricas analíticas en Supabase
 * Replica la lógica de cálculo de Google Apps Script
 * 
 * Uso:
 *   node scripts/calculate-metrics.js [projectKey]
 * 
 * Ejemplo:
 *   node scripts/calculate-metrics.js OBD
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno');
  console.error('   Necesitas: VITE_SUPABASE_URL (o SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Estados objetivo (igual que en Google Apps Script)
const TARGET_STATUSES = ['To Do', 'Reopen', 'In Progress', 'QA', 'Blocked', 'Done'];

/**
 * Mapea un estado de Jira a un estado objetivo normalizado
 * Replica la lógica de mapToTargetStatus() de Google Apps Script
 */
function mapToTargetStatus(jiraStatus) {
  if (!jiraStatus || jiraStatus === 'N/A (Sin Foto)') return 'QA';
  
  const normStatus = jiraStatus.trim().toLowerCase();
  
  if (normStatus === 'done' || normStatus === 'development done' || 
      normStatus === 'resolved' || normStatus === 'closed' || normStatus === 'finished') {
    return 'Done';
  }
  if (normStatus === 'blocked' || normStatus === 'impediment') {
    return 'Blocked';
  }
  if (normStatus.includes('in progress') || normStatus === 'in development' || 
      normStatus === 'doing' || normStatus === 'desarrollo') {
    return 'In Progress';
  }
  if (normStatus.includes('reopen')) {
    return 'Reopen';
  }
  if (normStatus.includes('qa') || normStatus.includes('test') || 
      normStatus.includes('review') || normStatus.includes('staging') || 
      normStatus.includes('testing') || normStatus.includes('compliance check')) {
    return 'QA';
  }
  if (normStatus === 'to do' || normStatus === 'backlog' || normStatus.includes('pendiente')) {
    return 'To Do';
  }
  
  return 'QA'; // Default
}

/**
 * Obtiene el estado histórico de un ticket para un sprint específico
 * Replica getHistoricalStatusForSprint()
 */
function getHistoricalStatusForSprint(issue, sprint, sprintFotoDate) {
  // Si no hay foto (sprint activo), usar estado actual
  if (!sprintFotoDate && sprint.state === 'active') {
    return issue.current_status || 'N/A';
  }
  
  // Si hay foto, usar status_at_sprint_close de issue_sprints
  if (sprintFotoDate && issue.status_at_sprint_close) {
    return issue.status_at_sprint_close;
  }
  
  // Fallback: estado actual
  return issue.current_status || 'N/A (Sin Foto)';
}

/**
 * Obtiene los Story Points iniciales de un ticket para un sprint
 * Replica getInitialSPForSprint()
 */
function getInitialSPForSprint(issue, sprint) {
  // Usar story_points_at_start de issue_sprints si está disponible
  if (issue.story_points_at_start !== null && issue.story_points_at_start !== undefined) {
    return issue.story_points_at_start;
  }
  
  // Si el ticket fue creado después del inicio del sprint: 0 SP
  if (issue.created_date && sprint.start_date) {
    const createdDate = new Date(issue.created_date);
    const sprintStart = new Date(sprint.start_date);
    if (createdDate > sprintStart) {
      return 0;
    }
  }
  
  // Fallback: usar SP actual (para tickets antiguos)
  return issue.current_story_points || 0;
}

/**
 * Calcula métricas de un sprint
 */
async function calculateSprintMetrics(projectKey = 'OBD') {
  console.log(`\n📊 Calculando métricas de sprint para proyecto: ${projectKey}`);
  
  try {
    // 1. Obtener proyecto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, project_name')
      .eq('project_key', projectKey.toUpperCase())
      .single();
    
    if (projectError || !project) {
      throw new Error(`Proyecto ${projectKey} no encontrado`);
    }
    
    console.log(`✅ Proyecto encontrado: ${project.project_name}`);
    
    // 2. Obtener todos los sprints del proyecto
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', project.id)
      .order('end_date', { ascending: false, nullsFirst: false });
    
    if (sprintsError) throw sprintsError;
    if (!sprints || sprints.length === 0) {
      console.log('⚠️ No se encontraron sprints');
      return;
    }
    
    console.log(`📅 Encontrados ${sprints.length} sprints`);
    
    // 3. Para cada sprint, calcular métricas
    for (const sprint of sprints) {
      console.log(`\n🔄 Procesando sprint: ${sprint.sprint_name}`);
      
      // Obtener todos los issues de este sprint
      const { data: sprintIssues, error: issuesError } = await supabase
        .from('issue_sprints')
        .select(`
          *,
          issue:issues(*),
          sprint:sprints(*)
        `)
        .eq('sprint_id', sprint.id);
      
      if (issuesError) {
        console.error(`❌ Error obteniendo issues del sprint:`, issuesError);
        continue;
      }
      
      if (!sprintIssues || sprintIssues.length === 0) {
        console.log(`   ⚠️ No hay issues en este sprint`);
        continue;
      }
      
      console.log(`   📋 ${sprintIssues.length} issues encontrados`);
      
      // Determinar fecha de "foto" del sprint
      let sprintFotoDate = null;
      let isActive = false;
      
      if (sprint.complete_date) {
        sprintFotoDate = new Date(sprint.complete_date);
      } else if (sprint.state === 'closed' && sprint.end_date) {
        sprintFotoDate = new Date(sprint.end_date);
      } else if (sprint.end_date && new Date(sprint.end_date) < new Date()) {
        sprintFotoDate = new Date(sprint.end_date);
      } else if (sprint.state === 'active') {
        isActive = true;
      }
      
      // Inicializar contadores
      const statusCounts = {};
      TARGET_STATUSES.forEach(s => statusCounts[s] = 0);
      
      let totalSP = 0;
      let completedSP = 0;
      let completedTickets = 0;
      let impediments = 0;
      let leadTimeSum = 0;
      let leadTimeCount = 0;
      let ticketsWithSP = 0;
      let ticketsNoSP = 0;
      
      // Procesar cada issue
      for (const sprintIssue of sprintIssues) {
        const issue = sprintIssue.issue;
        if (!issue) continue;
        
        // Obtener estado para este sprint
        const status = getHistoricalStatusForSprint(
          { 
            current_status: issue.current_status,
            status_at_sprint_close: sprintIssue.status_at_sprint_close 
          },
          sprint,
          sprintFotoDate
        );
        
        const mappedStatus = mapToTargetStatus(status);
        if (statusCounts.hasOwnProperty(mappedStatus)) {
          statusCounts[mappedStatus]++;
        }
        
        // Story Points
        const sp = issue.current_story_points || 0;
        totalSP += sp;
        
        if (sp > 0) {
          ticketsWithSP++;
        } else {
          ticketsNoSP++;
        }
        
        // Métricas de completación
        if (mappedStatus === 'Done') {
          completedSP += sp;
          completedTickets++;
        }
        
        // Impedimentos
        if (mappedStatus === 'Blocked') {
          impediments++;
        }
        
        // Lead Time
        if (issue.dev_start_date && issue.dev_close_date) {
          const startDate = new Date(issue.dev_start_date);
          const closeDate = new Date(issue.dev_close_date);
          const leadTime = (closeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          if (leadTime >= 0) {
            leadTimeSum += leadTime;
            leadTimeCount++;
          }
        }
      }
      
      const carryoverSP = totalSP - completedSP;
      const pendingTickets = sprintIssues.length - completedTickets;
      const avgLeadTime = leadTimeCount > 0 ? (leadTimeSum / leadTimeCount) : null;
      const completionPercentage = sprintIssues.length > 0 
        ? (completedTickets / sprintIssues.length) * 100 
        : 0;
      
      // Guardar métricas en sprint_metrics
      const metricsData = {
        sprint_id: sprint.id,
        calculated_at: new Date().toISOString(),
        total_story_points: totalSP,
        completed_story_points: completedSP,
        carryover_story_points: carryoverSP,
        total_tickets: sprintIssues.length,
        completed_tickets: completedTickets,
        pending_tickets: pendingTickets,
        impediments: impediments,
        avg_lead_time_days: avgLeadTime,
        completion_percentage: completionPercentage,
        tickets_to_do: statusCounts['To Do'] || 0,
        tickets_in_progress: statusCounts['In Progress'] || 0,
        tickets_qa: statusCounts['QA'] || 0,
        tickets_blocked: statusCounts['Blocked'] || 0,
        tickets_done: statusCounts['Done'] || 0,
        tickets_reopen: statusCounts['Reopen'] || 0,
        tickets_with_sp: ticketsWithSP,
        tickets_no_sp: ticketsNoSP,
      };
      
      const { error: metricsError } = await supabase
        .from('sprint_metrics')
        .upsert(metricsData, {
          onConflict: 'sprint_id,calculated_at',
        });
      
      if (metricsError) {
        console.error(`   ❌ Error guardando métricas:`, metricsError);
      } else {
        console.log(`   ✅ Métricas guardadas para ${sprint.sprint_name}`);
        console.log(`      - Total SP: ${totalSP}, Completados: ${completedSP}, Carryover: ${carryoverSP}`);
        console.log(`      - Tickets: ${sprintIssues.length} total, ${completedTickets} completados`);
        console.log(`      - Lead Time promedio: ${avgLeadTime ? avgLeadTime.toFixed(2) : 'N/A'} días`);
      }
    }
    
    console.log(`\n✅ Cálculo de métricas de sprint completado`);
    
  } catch (error) {
    console.error('❌ Error calculando métricas de sprint:', error);
    throw error;
  }
}

/**
 * Calcula métricas por desarrollador y sprint
 */
async function calculateDeveloperMetrics(projectKey = 'OBD') {
  console.log(`\n👥 Calculando métricas de desarrolladores para proyecto: ${projectKey}`);
  
  try {
    // 1. Obtener proyecto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('project_key', projectKey.toUpperCase())
      .single();
    
    if (projectError || !project) {
      throw new Error(`Proyecto ${projectKey} no encontrado`);
    }
    
    // 2. Obtener todos los sprints
    const { data: sprints, error: sprintsError } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', project.id)
      .order('end_date', { ascending: false, nullsFirst: false });
    
    if (sprintsError) throw sprintsError;
    if (!sprints || sprints.length === 0) {
      console.log('⚠️ No se encontraron sprints');
      return;
    }
    
    // 3. Para cada sprint, calcular métricas por desarrollador
    for (const sprint of sprints) {
      console.log(`\n🔄 Procesando sprint: ${sprint.sprint_name}`);
      
      // Obtener issues del sprint con desarrolladores
      const { data: sprintIssues, error: issuesError } = await supabase
        .from('issue_sprints')
        .select(`
          *,
          issue:issues(
            *,
            assignee:developers(*)
          ),
          sprint:sprints(*)
        `)
        .eq('sprint_id', sprint.id);
      
      if (issuesError) {
        console.error(`❌ Error obteniendo issues:`, issuesError);
        continue;
      }
      
      if (!sprintIssues || sprintIssues.length === 0) continue;
      
      // Agrupar por desarrollador
      const devMetrics = {};
      
      for (const sprintIssue of sprintIssues) {
        const issue = sprintIssue.issue;
        if (!issue) continue;
        
        const developerId = issue.assignee_id;
        const developerName = issue.assignee?.display_name || 'Unassigned';
        
        if (!devMetrics[developerId]) {
          devMetrics[developerId] = {
            developer_id: developerId,
            developer_name: developerName,
            tickets: [],
            workload: 0,
            velocity: 0,
            completedTickets: 0,
            leadTimeSum: 0,
            leadTimeCount: 0,
            statusCounts: {},
          };
          TARGET_STATUSES.forEach(s => devMetrics[developerId].statusCounts[s] = 0);
        }
        
        devMetrics[developerId].tickets.push({ issue, sprintIssue });
        
        // Obtener estado
        let sprintFotoDate = null;
        if (sprint.complete_date) {
          sprintFotoDate = new Date(sprint.complete_date);
        } else if (sprint.state === 'closed' && sprint.end_date) {
          sprintFotoDate = new Date(sprint.end_date);
        } else if (sprint.end_date && new Date(sprint.end_date) < new Date()) {
          sprintFotoDate = new Date(sprint.end_date);
        }
        
        const status = getHistoricalStatusForSprint(
          {
            current_status: issue.current_status,
            status_at_sprint_close: sprintIssue.status_at_sprint_close
          },
          sprint,
          sprintFotoDate
        );
        
        const mappedStatus = mapToTargetStatus(status);
        if (devMetrics[developerId].statusCounts.hasOwnProperty(mappedStatus)) {
          devMetrics[developerId].statusCounts[mappedStatus]++;
        }
        
        // Workload (SP inicial)
        const initialSP = getInitialSPForSprint(issue, sprint);
        devMetrics[developerId].workload += initialSP;
        
        // Velocity (SP completados)
        if (mappedStatus === 'Done') {
          const currentSP = issue.current_story_points || 0;
          devMetrics[developerId].velocity += currentSP;
          devMetrics[developerId].completedTickets++;
        }
        
        // Lead Time
        if (issue.dev_start_date && issue.dev_close_date && mappedStatus === 'Done') {
          const startDate = new Date(issue.dev_start_date);
          const closeDate = new Date(issue.dev_close_date);
          const leadTime = (closeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          if (leadTime >= 0) {
            devMetrics[developerId].leadTimeSum += leadTime;
            devMetrics[developerId].leadTimeCount++;
          }
        }
      }
      
      // Guardar métricas por desarrollador
      for (const [developerId, metrics] of Object.entries(devMetrics)) {
        const carryover = metrics.workload - metrics.velocity;
        const avgLeadTime = metrics.leadTimeCount > 0 
          ? (metrics.leadTimeSum / metrics.leadTimeCount) 
          : null;
        
        const metricsData = {
          developer_id: developerId,
          sprint_id: sprint.id,
          calculated_at: new Date().toISOString(),
          workload_sp: metrics.workload,
          velocity_sp: metrics.velocity,
          carryover_sp: carryover,
          tickets_assigned: metrics.tickets.length,
          tickets_completed: metrics.completedTickets,
          avg_lead_time_days: avgLeadTime,
          tickets_to_do: metrics.statusCounts['To Do'] || 0,
          tickets_in_progress: metrics.statusCounts['In Progress'] || 0,
          tickets_qa: metrics.statusCounts['QA'] || 0,
          tickets_blocked: metrics.statusCounts['Blocked'] || 0,
          tickets_done: metrics.statusCounts['Done'] || 0,
          tickets_reopen: metrics.statusCounts['Reopen'] || 0,
        };
        
        const { error: metricsError } = await supabase
          .from('developer_sprint_metrics')
          .upsert(metricsData, {
            onConflict: 'developer_id,sprint_id,calculated_at',
          });
        
        if (metricsError) {
          console.error(`   ❌ Error guardando métricas de ${metrics.developer_name}:`, metricsError);
        } else {
          console.log(`   ✅ ${metrics.developer_name}: Workload=${metrics.workload}SP, Velocity=${metrics.velocity}SP, Carryover=${carryover}SP`);
        }
      }
    }
    
    console.log(`\n✅ Cálculo de métricas de desarrolladores completado`);
    
  } catch (error) {
    console.error('❌ Error calculando métricas de desarrolladores:', error);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  const projectKey = process.argv[2] || 'OBD';
  
  console.log('🚀 Iniciando cálculo de métricas analíticas');
  console.log(`📊 Proyecto: ${projectKey}`);
  console.log(`🔗 Supabase: ${supabaseUrl}`);
  
  try {
    await calculateSprintMetrics(projectKey);
    await calculateDeveloperMetrics(projectKey);
    
    console.log('\n✅ ✅ ✅ Cálculo completo finalizado exitosamente');
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { calculateSprintMetrics, calculateDeveloperMetrics, mapToTargetStatus };


