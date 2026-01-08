/**
 * Script to apply role_permission_config table migration
 * This creates the table needed for custom role permissions
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  console.error('   This script requires the service role key to create tables.');
  console.error('   Set it in your .env file or as an environment variable.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🔄 Applying role_permission_config migration...');
    
    // Read SQL file
    const sqlPath = join(__dirname, '../docs/supabase/12_create_role_permission_config.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Split SQL into individual statements (simple approach)
    // Note: This is a basic split - for complex SQL with functions, you might need to execute manually
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }
      
      try {
        console.log(`\n📌 Executing statement ${i + 1}/${statements.length}...`);
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        
        if (error) {
          // Try direct query if RPC doesn't work
          const { error: queryError } = await supabase.from('_temp').select('1').limit(0);
          
          if (queryError && queryError.code === 'PGRST116') {
            console.log('⚠️  Note: Some statements may need to be executed manually in Supabase SQL Editor');
            console.log('   Please run the SQL file: docs/supabase/12_create_role_permission_config.sql');
            break;
          }
        }
      } catch (err) {
        console.warn(`⚠️  Statement ${i + 1} may need manual execution:`, err.message);
      }
    }
    
    console.log('\n✅ Migration script completed');
    console.log('\n📋 Next steps:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste the contents of: docs/supabase/12_create_role_permission_config.sql');
    console.log('   3. Execute the SQL script');
    console.log('   4. Verify the table was created: SELECT * FROM role_permission_config LIMIT 1;');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.error('\n📋 Manual steps:');
    console.log('   1. Go to Supabase Dashboard > SQL Editor');
    console.log('   2. Copy and paste the contents of: docs/supabase/12_create_role_permission_config.sql');
    console.log('   3. Execute the SQL script');
    process.exit(1);
  }
}

applyMigration();

