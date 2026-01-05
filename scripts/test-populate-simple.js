/**
 * Script simple de prueba para verificar conexión y población de datos
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || null;

console.log('🔍 Testing Supabase connection...');
console.log(`URL: ${supabaseUrl ? 'Set' : 'NOT SET'}`);
console.log(`Key: ${supabaseAnonKey ? 'Set' : 'NOT SET'}`);

if (!supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test connection
try {
  const { data, error } = await supabase
    .from('sprints')
    .select('id')
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Connection successful!');
  
  // Check if migrations were run
  console.log('\n📋 Checking migrations...');
  
  // Check deployments table
  const { data: deployments, error: depError } = await supabase
    .from('deployments')
    .select('id')
    .limit(1);
  
  if (depError && depError.code === '42P01') {
    console.log('❌ Deployments table does not exist - Run migrations first!');
  } else {
    console.log('✅ Deployments table exists');
  }
  
  // Check enps_responses table
  const { data: enps, error: enpsError } = await supabase
    .from('enps_responses')
    .select('id')
    .limit(1);
  
  if (enpsError && enpsError.code === '42P01') {
    console.log('❌ eNPS responses table does not exist - Run migrations first!');
  } else {
    console.log('✅ eNPS responses table exists');
  }
  
  // Check functions
  console.log('\n📋 Checking functions...');
  const { data: funcs, error: funcError } = await supabase.rpc('calculate_added_story_points', {
    p_sprint_id: '00000000-0000-0000-0000-000000000000'
  });
  
  if (funcError && funcError.message.includes('does not exist')) {
    console.log('❌ Functions do not exist - Run migrations first!');
  } else {
    console.log('✅ Functions exist');
  }
  
  console.log('\n✅ Test completed!');
  console.log('\n📝 Next steps:');
  console.log('   1. If tables/functions don\'t exist, run migrations in Supabase SQL Editor');
  console.log('   2. Then run: npm run populate-kpi-data');
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}

