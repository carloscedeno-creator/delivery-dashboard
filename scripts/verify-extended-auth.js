/**
 * Script para verificar las funciones extendidas de autenticación
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
    console.log('🔍 Verificando funciones extendidas de autenticación...\n');

    const functions = [
        {
            name: 'register_user',
            testParams: { p_email: 'test@test.com', p_password_hash: 'test', p_display_name: 'Test User', p_role: 'Regular' },
            expectedError: ['duplicate', 'already registered']
        },
        {
            name: 'request_password_reset',
            testParams: { p_email: 'test@test.com' },
            expectedError: null // Puede retornar null si el email no existe (por seguridad)
        },
        {
            name: 'reset_password',
            testParams: { p_token: 'invalid_token', p_new_password_hash: 'test' },
            expectedError: null // Retorna false si el token es inválido
        },
        {
            name: 'approve_user',
            testParams: { p_user_id: '00000000-0000-0000-0000-000000000000' },
            expectedError: null // Puede retornar false si el usuario no existe
        },
        {
            name: 'deactivate_user',
            testParams: { p_user_id: '00000000-0000-0000-0000-000000000000' },
            expectedError: null // Puede retornar false si el usuario no existe
        },
        {
            name: 'get_all_users',
            testParams: {},
            expectedError: null
        },
        {
            name: 'update_user_role',
            testParams: { p_user_id: '00000000-0000-0000-0000-000000000000', p_new_role: 'Regular' },
            expectedError: null // Puede retornar false si el usuario no existe
        }
    ];

    for (const func of functions) {
        try {
            const { data, error } = await supabaseAdmin.rpc(func.name, func.testParams);

            if (error) {
                if (error.code === '42883' || error.message?.includes('function')) {
                    console.log(`   ❌ ${func.name}: No existe o no está expuesta como RPC`);
                } else if (func.expectedError && func.expectedError.some(e => error.message?.toLowerCase().includes(e))) {
                    console.log(`   ✅ ${func.name}: Existe (error esperado: ${error.message.substring(0, 50)}...)`);
                } else if (error.code === '23503' || error.message?.includes('foreign key')) {
                    console.log(`   ✅ ${func.name}: Existe (error esperado por FK)`);
                } else {
                    console.log(`   ⚠️  ${func.name}: Error - ${error.message.substring(0, 60)}...`);
                }
            } else {
                if (data === false || data === null) {
                    console.log(`   ✅ ${func.name}: Existe y funciona (retornó ${data})`);
                } else if (Array.isArray(data)) {
                    console.log(`   ✅ ${func.name}: Existe y funciona (retornó ${data.length} registros)`);
                } else {
                    console.log(`   ✅ ${func.name}: Existe y funciona`);
                }
            }
        } catch (error) {
            console.log(`   ❌ ${func.name}: Error - ${error.message.substring(0, 60)}...`);
        }
    }

    // Verificar tabla password_reset_tokens
    console.log('\n📋 Verificando tabla password_reset_tokens...');
    try {
        const { data, error } = await supabaseAdmin.from('password_reset_tokens').select('*').limit(1);
        if (error) {
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
                console.log('   ❌ password_reset_tokens: No existe');
            } else {
                console.log(`   ⚠️  password_reset_tokens: Error - ${error.message.substring(0, 60)}...`);
            }
        } else {
            console.log('   ✅ password_reset_tokens: Existe');
        }
    } catch (error) {
        console.log(`   ❌ password_reset_tokens: Error - ${error.message.substring(0, 60)}...`);
    }

    // Verificar que is_active por defecto sea false
    console.log('\n📋 Verificando configuración de app_users...');
    try {
        const { data, error } = await supabaseAdmin.from('app_users').select('is_active').limit(1);
        if (error) {
            console.log(`   ⚠️  app_users: Error - ${error.message.substring(0, 60)}...`);
        } else {
            console.log('   ✅ app_users: Tabla accesible');
            console.log('   ℹ️  Nota: Verifica manualmente que is_active tenga DEFAULT false');
        }
    } catch (error) {
        console.log(`   ❌ app_users: Error - ${error.message.substring(0, 60)}...`);
    }

    console.log('\n✅ Verificación completada!\n');
}

verifyFunctions().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
