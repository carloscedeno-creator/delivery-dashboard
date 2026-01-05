import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

console.log('Testing Supabase connection...');
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL ? 'Set' : 'NOT SET');
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'NOT SET');

// Create Supabase client for Node.js (using process.env instead of import.meta.env)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || null;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

try {
  
  if (!supabase) {
    console.log('❌ Supabase client is null');
    process.exit(1);
  }
  
  console.log('✅ Supabase client created');
  
  // Test query
  const { data, error } = await supabase
    .from('issues')
    .select('id, issue_key, issue_type')
    .limit(1);
  
  if (error) {
    console.log('❌ Error querying issues:', error.message);
    console.log('Error code:', error.code);
  } else {
    console.log('✅ Successfully queried issues table');
    if (data && data.length > 0) {
      console.log('Sample issue fields:', Object.keys(data[0]).join(', '));
      console.log('Has issue_type?', data[0].issue_type ? 'YES' : 'NO');
    } else {
      console.log('⚠️ No issues found in database');
    }
  }
  
} catch (err) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
}

