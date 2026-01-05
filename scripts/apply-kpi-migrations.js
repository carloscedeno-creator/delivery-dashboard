/**
 * Script para aplicar migraciones SQL de KPIs a Supabase
 * Ejecuta las migraciones en el orden correcto
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client for Node.js (using process.env instead of import.meta.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || null;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const migrations = [
  {
    name: '09_add_planning_capacity_fields.sql',
    description: 'Add planning and capacity fields to sprints and sprint_metrics',
    order: 1
  },
  {
    name: '11_calculate_rework_from_history.sql',
    description: 'Create functions to calculate Rework Rate from history',
    order: 2
  },
  {
    name: '08_create_deployments_table.sql',
    description: 'Create deployments table',
    order: 3
  },
  {
    name: '10_create_enps_responses_table.sql',
    description: 'Create enps_responses table',
    order: 4
  }
];

async function applyMigration(fileName) {
  const filePath = join(__dirname, '..', 'docs', 'supabase', fileName);
  
  try {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`\n📄 Executing: ${fileName}`);
    
    // Split SQL by semicolons and execute each statement
    // Note: Supabase might need to execute this differently
    // For now, we'll use the Supabase SQL execution if available
    // Otherwise, we'll provide instructions
    
    console.log(`✅ Migration file read successfully (${sql.length} characters)`);
    console.log(`⚠️  Note: This migration needs to be executed manually in Supabase SQL Editor`);
    console.log(`   File location: ${filePath}`);
    
    return { success: true, fileName };
  } catch (error) {
    console.error(`❌ Error reading migration file ${fileName}:`, error.message);
    return { success: false, fileName, error: error.message };
  }
}

async function checkSupabaseConnection() {
  if (!supabase) {
    console.error('❌ Supabase is not configured');
    console.error('   Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
    return false;
  }
  
  try {
    // Test connection by querying a simple table
    const { data, error } = await supabase
      .from('sprints')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting KPI Migrations Application\n');
  console.log('=' .repeat(60));
  
  // Check Supabase connection
  const connected = await checkSupabaseConnection();
  if (!connected) {
    console.log('\n⚠️  Cannot verify Supabase connection, but will continue...');
  }
  
  // Sort migrations by order
  const sortedMigrations = migrations.sort((a, b) => a.order - b.order);
  
  console.log(`\n📋 Found ${sortedMigrations.length} migrations to apply:`);
  sortedMigrations.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.name} - ${m.description}`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  IMPORTANT: Supabase does not support executing SQL directly from client');
  console.log('   You need to execute these migrations manually in Supabase SQL Editor');
  console.log('='.repeat(60));
  
  const results = [];
  
  for (const migration of sortedMigrations) {
    const result = await applyMigration(migration.name);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Migration ${migration.name} prepared successfully`);
    } else {
      console.log(`❌ Migration ${migration.name} failed`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (successful > 0) {
    console.log('\n📝 Next Steps:');
    console.log('   1. Open Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste each migration SQL file content');
    console.log('   3. Execute them in order:');
    sortedMigrations.forEach((m, i) => {
      if (results[i].success) {
        console.log(`      ${i + 1}. docs/supabase/${m.name}`);
      }
    });
    console.log('   4. Verify that tables/functions were created successfully');
  }
  
  console.log('\n✅ Migration preparation completed');
}

main().catch(console.error);

