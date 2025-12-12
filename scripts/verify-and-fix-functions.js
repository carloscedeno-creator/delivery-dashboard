/**
 * Script para verificar y crear las funciones de autenticación
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

async function verifyFunctions() {
    console.log('🔍 Verificando funciones de autenticación...\n');

    const functions = [
        'authenticate_user',
        'create_session',
        'validate_session',
        'logout_session',
        'create_user'
    ];

    for (const funcName of functions) {
        try {
            // Intentar llamar a la función con parámetros de prueba
            let testParams = {};
            if (funcName === 'authenticate_user') {
                testParams = { p_email: 'test@test.com', p_password_hash: 'test' };
            } else if (funcName === 'create_session') {
                testParams = { p_user_id: '00000000-0000-0000-0000-000000000000', p_token: 'test', p_expires_in_hours: 1 };
            } else if (funcName === 'validate_session') {
                testParams = { p_token: 'test' };
            } else if (funcName === 'logout_session') {
                testParams = { p_token: 'test' };
            } else if (funcName === 'create_user') {
                testParams = { p_email: 'test@test.com', p_password_hash: 'test', p_display_name: 'Test', p_role: 'Regular' };
            }

            const { data, error } = await supabaseAdmin.rpc(funcName, testParams);

            if (error) {
                if (error.code === '42883' || error.message?.includes('function') || error.code === 'P0001') {
                    console.log(`   ❌ ${funcName}: No existe o no está expuesta como RPC`);
                } else if (error.code === '23503' || error.message?.includes('foreign key')) {
                    console.log(`   ✅ ${funcName}: Existe (error esperado por FK)`);
                } else {
                    console.log(`   ⚠️  ${funcName}: Error - ${error.message.substring(0, 60)}...`);
                }
            } else {
                console.log(`   ✅ ${funcName}: Existe y funciona`);
            }
        } catch (error) {
            console.log(`   ❌ ${funcName}: Error - ${error.message.substring(0, 60)}...`);
        }
    }

    console.log('\n📋 Si alguna función no existe, ejecuta en Supabase SQL Editor:');
    console.log('   docs/supabase/02_auth_functions.sql\n');
}

verifyFunctions().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
