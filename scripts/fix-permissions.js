/**
 * Script para corregir permisos de funciones administrativas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1OTU5OSwiZXhwIjoyMDgxMDM1NTk5fQ.3-u6Uy6aE2CTgIA4AEEFHEsddMUC8mrDDdae1JcNpFw';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function fixPermissions() {
    console.log('🔧 Corrigiendo permisos de funciones administrativas...\n');

    const revokeStatements = [
        'REVOKE EXECUTE ON FUNCTION get_all_users FROM anon;',
        'REVOKE EXECUTE ON FUNCTION approve_user FROM anon;',
        'REVOKE EXECUTE ON FUNCTION deactivate_user FROM anon;',
        'REVOKE EXECUTE ON FUNCTION update_user_role FROM anon;'
    ];

    const grantStatements = [
        'GRANT EXECUTE ON FUNCTION get_all_users TO authenticated, service_role;',
        'GRANT EXECUTE ON FUNCTION approve_user TO authenticated, service_role;',
        'GRANT EXECUTE ON FUNCTION deactivate_user TO authenticated, service_role;',
        'GRANT EXECUTE ON FUNCTION update_user_role TO authenticated, service_role;'
    ];

    // Intentar ejecutar usando exec_sql si existe
    try {
        console.log('Intentando usar exec_sql...');
        for (const stmt of [...revokeStatements, ...grantStatements]) {
            const { data, error } = await supabaseAdmin.rpc('exec_sql', { p_sql: stmt });
            if (error) {
                console.log(`   ⚠️  Error ejecutando: ${stmt.substring(0, 50)}...`);
                console.log(`      ${error.message}`);
            } else {
                console.log(`   ✅ Ejecutado: ${stmt.substring(0, 50)}...`);
            }
        }
    } catch (error) {
        console.log('   ⚠️  exec_sql no disponible, necesitas ejecutar manualmente en Supabase SQL Editor');
    }

    console.log('\n📋 Si exec_sql no funcionó, ejecuta esto en Supabase SQL Editor:\n');
    console.log('-- Revocar permisos de anon');
    revokeStatements.forEach(stmt => console.log(stmt));
    console.log('\n-- Otorgar permisos correctos');
    grantStatements.forEach(stmt => console.log(stmt));
    console.log('\n');
}

fixPermissions().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
