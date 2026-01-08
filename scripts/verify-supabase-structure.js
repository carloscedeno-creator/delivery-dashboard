/**
 * Script para verificar la estructura de Supabase
 * Verifica qué campos existen y qué falta para calcular los KPIs
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for Node.js (using process.env instead of import.meta.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || null;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function verifyStructure() {
  console.log('🔍 Verificando estructura de Supabase...\n');
  console.log('Supabase URL:', process.env.VITE_SUPABASE_URL || 'No configurado');
  console.log('Supabase Key:', process.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado');
  console.log('');

  if (!supabase) {
    console.error('❌ Supabase no está configurado');
    console.error('Verifica que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén en tu archivo .env');
    process.exit(1);
  }

  console.log('✅ Supabase configurado correctamente\n');

  // Verificar campos en tabla issues
  console.log('📋 Verificando tabla issues...');
  try {
    const { data: sampleIssue, error } = await supabase
      .from('issues')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error:', error);
    } else if (sampleIssue) {
      console.log('✅ Campos disponibles en issues:');
      console.log(Object.keys(sampleIssue).sort().join(', '));
      
      // Verificar campos críticos
      const criticalFields = {
        'issue_type': sampleIssue.issue_type ? '✅' : '❌',
        'dev_start_date': sampleIssue.dev_start_date ? '✅' : '❌',
        'dev_close_date': sampleIssue.dev_close_date ? '✅' : '❌',
        'resolved_date': sampleIssue.resolved_date ? '✅' : '❌',
        'current_status': sampleIssue.current_status ? '✅' : '❌',
        'current_story_points': sampleIssue.current_story_points ? '✅' : '❌'
      };
      
      console.log('\nCampos críticos:');
      Object.entries(criticalFields).forEach(([field, status]) => {
        console.log(`  ${status} ${field}`);
      });
    } else {
      console.log('⚠️ No hay issues en la base de datos');
    }
  } catch (err) {
    console.error('Error verificando issues:', err.message);
  }

  // Verificar tabla sprints
  console.log('\n📋 Verificando tabla sprints...');
  try {
    const { data: sampleSprint, error } = await supabase
      .from('sprints')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error:', error);
    } else if (sampleSprint) {
      console.log('✅ Campos disponibles en sprints:');
      console.log(Object.keys(sampleSprint).sort().join(', '));
      
      const criticalFields = {
        'start_date': sampleSprint.start_date ? '✅' : '❌',
        'end_date': sampleSprint.end_date ? '✅' : '❌',
        'state': sampleSprint.state ? '✅' : '❌',
        'planned_story_points': sampleSprint.planned_story_points ? '✅' : '❌',
        'planned_capacity_hours': sampleSprint.planned_capacity_hours ? '✅' : '❌'
      };
      
      console.log('\nCampos críticos:');
      Object.entries(criticalFields).forEach(([field, status]) => {
        console.log(`  ${status} ${field}`);
      });
    } else {
      console.log('⚠️ No hay sprints en la base de datos');
    }
  } catch (err) {
    console.error('Error verificando sprints:', err.message);
  }

  // Verificar tabla sprint_metrics
  console.log('\n📋 Verificando tabla sprint_metrics...');
  try {
    const { data: sampleMetric, error } = await supabase
      .from('sprint_metrics')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error:', error);
    } else if (sampleMetric) {
      console.log('✅ Campos disponibles en sprint_metrics:');
      console.log(Object.keys(sampleMetric).sort().join(', '));
      
      const criticalFields = {
        'total_story_points': sampleMetric.total_story_points !== undefined ? '✅' : '❌',
        'completed_story_points': sampleMetric.completed_story_points !== undefined ? '✅' : '❌',
        'added_story_points': sampleMetric.added_story_points !== undefined ? '✅' : '❌',
        'avg_lead_time_days': sampleMetric.avg_lead_time_days !== undefined ? '✅' : '❌',
        'actual_capacity_hours': sampleMetric.actual_capacity_hours !== undefined ? '✅' : '❌'
      };
      
      console.log('\nCampos críticos:');
      Object.entries(criticalFields).forEach(([field, status]) => {
        console.log(`  ${status} ${field}`);
      });
    } else {
      console.log('⚠️ No hay métricas de sprint en la base de datos');
    }
  } catch (err) {
    console.error('Error verificando sprint_metrics:', err.message);
  }

  // Verificar si existen tablas críticas faltantes
  console.log('\n📋 Verificando tablas faltantes...');
  const missingTables = ['deployments', 'pull_requests', 'enps_responses', 'issue_rework_history'];
  
  for (const tableName of missingTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log(`  ❌ Tabla ${tableName} NO existe`);
      } else if (error) {
        console.log(`  ⚠️ Error verificando ${tableName}:`, error.message);
      } else {
        console.log(`  ✅ Tabla ${tableName} existe`);
      }
    } catch (err) {
      console.log(`  ❌ Tabla ${tableName} NO existe (${err.message})`);
    }
  }

  // Verificar vista v_sprint_metrics_complete
  console.log('\n📋 Verificando vista v_sprint_metrics_complete...');
  try {
    const { data: sampleView, error } = await supabase
      .from('v_sprint_metrics_complete')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error:', error);
    } else if (sampleView) {
      console.log('✅ Campos disponibles en v_sprint_metrics_complete:');
      console.log(Object.keys(sampleView).sort().join(', '));
    } else {
      console.log('⚠️ No hay datos en la vista');
    }
  } catch (err) {
    console.error('Error verificando vista:', err.message);
  }

  console.log('\n✅ Verificación completada');
}

verifyStructure()
  .then(() => {
    console.log('\n✅ Verificación completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error durante la verificación:');
    console.error(error);
    process.exit(1);
  });

