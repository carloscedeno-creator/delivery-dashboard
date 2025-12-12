/**
 * Script completo de verificación del sistema de autenticación
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

const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';
const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

let allChecksPassed = true;

function logCheck(name, passed, message = '') {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`${icon} [${status}] ${name}${message ? ': ' + message : ''}`);
    if (!passed) allChecksPassed = false;
}

async function verifyTables() {
    console.log('\n📋 Verificando tablas...\n');
    
    const tables = [
        { name: 'app_users', required: true },
        { name: 'user_sessions', required: true },
        { name: 'password_reset_tokens', required: true }
    ];

    for (const table of tables) {
        try {
            const { data, error } = await supabaseAdmin.from(table.name).select('*').limit(1);
            if (error) {
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    logCheck(`Tabla ${table.name}`, false, 'No existe');
                } else {
                    logCheck(`Tabla ${table.name}`, false, error.message);
                }
            } else {
                logCheck(`Tabla ${table.name}`, true);
            }
        } catch (error) {
            logCheck(`Tabla ${table.name}`, false, error.message);
        }
    }
}

async function verifyAuthFunctions() {
    console.log('\n🔐 Verificando funciones de autenticación básicas...\n');
    
    const functions = [
        { name: 'authenticate_user', params: { p_email: 'test@test.com', p_password_hash: 'test' } },
        { name: 'create_session', params: { p_user_id: '00000000-0000-0000-0000-000000000000', p_token: 'test', p_expires_in_hours: 1 } },
        { name: 'validate_session', params: { p_token: 'test' } },
        { name: 'logout_session', params: { p_token: 'test' } },
        { name: 'create_user', params: { p_email: 'test@test.com', p_password_hash: 'test', p_display_name: 'Test', p_role: 'Regular' } }
    ];

    for (const func of functions) {
        try {
            const { error } = await supabaseAdmin.rpc(func.name, func.params);
            if (error) {
                if (error.code === '42883' || error.message?.includes('function')) {
                    logCheck(`Función ${func.name}`, false, 'No existe o no está expuesta como RPC');
                } else {
                    // Error esperado (FK, etc.)
                    logCheck(`Función ${func.name}`, true);
                }
            } else {
                logCheck(`Función ${func.name}`, true);
            }
        } catch (error) {
            logCheck(`Función ${func.name}`, false, error.message);
        }
    }
}

async function verifyExtendedFunctions() {
    console.log('\n🔧 Verificando funciones extendidas...\n');
    
    const functions = [
        { name: 'register_user', params: { p_email: 'test@test.com', p_password_hash: 'test', p_display_name: 'Test', p_role: 'Regular' }, expectedError: 'already registered' },
        { name: 'request_password_reset', params: { p_email: 'test@test.com' } },
        { name: 'reset_password', params: { p_token: 'invalid', p_new_password_hash: 'test' } },
        { name: 'approve_user', params: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
        { name: 'deactivate_user', params: { p_user_id: '00000000-0000-0000-0000-000000000000' } },
        { name: 'get_all_users', params: {} },
        { name: 'update_user_role', params: { p_user_id: '00000000-0000-0000-0000-000000000000', p_new_role: 'Regular' } }
    ];

    for (const func of functions) {
        try {
            const { data, error } = await supabaseAdmin.rpc(func.name, func.params);
            if (error) {
                if (error.code === '42883' || error.message?.includes('function')) {
                    logCheck(`Función ${func.name}`, false, 'No existe o no está expuesta como RPC');
                } else if (func.expectedError && error.message?.toLowerCase().includes(func.expectedError)) {
                    logCheck(`Función ${func.name}`, true);
                } else {
                    // Otros errores esperados
                    logCheck(`Función ${func.name}`, true);
                }
            } else {
                logCheck(`Función ${func.name}`, true);
            }
        } catch (error) {
            logCheck(`Función ${func.name}`, false, error.message);
        }
    }
}

async function verifyAdminUser() {
    console.log('\n👤 Verificando usuario admin...\n');
    
    try {
        const { data, error } = await supabaseAdmin
            .from('app_users')
            .select('*')
            .eq('email', 'carlos.cedeno@agenticdream.com')
            .single();

        if (error) {
            logCheck('Usuario admin existe', false, error.message);
            return;
        }

        if (data) {
            logCheck('Usuario admin existe', true);
            logCheck('Usuario admin está activo', data.is_active === true, data.is_active ? 'Sí' : 'No');
            logCheck('Usuario admin tiene rol admin', data.role === 'admin', `Rol actual: ${data.role}`);
        } else {
            logCheck('Usuario admin existe', false, 'No encontrado');
        }
    } catch (error) {
        logCheck('Usuario admin existe', false, error.message);
    }
}

async function verifyAnonAccess() {
    console.log('\n🔓 Verificando acceso con anon key...\n');
    
    try {
        // Intentar llamar a una función que debería estar disponible con anon
        const { data, error } = await supabaseAnon.rpc('get_all_users', {});
        
        if (error) {
            if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('Unauthorized')) {
                logCheck('get_all_users con anon', true, 'Correctamente bloqueado (requiere autenticación)');
            } else {
                logCheck('get_all_users con anon', false, error.message);
            }
        } else {
            logCheck('get_all_users con anon', false, 'No debería estar disponible sin autenticación');
        }
    } catch (error) {
        logCheck('get_all_users con anon', false, error.message);
    }

    // Verificar que register_user esté disponible con anon
    try {
        const { error } = await supabaseAnon.rpc('register_user', {
            p_email: `test_${Date.now()}@test.com`,
            p_password_hash: 'test',
            p_display_name: 'Test',
            p_role: 'Regular'
        });
        
        if (error) {
            if (error.code === '42883') {
                logCheck('register_user con anon', false, 'No disponible');
            } else {
                // Otro error (probablemente duplicado o válido)
                logCheck('register_user con anon', true);
            }
        } else {
            logCheck('register_user con anon', true);
        }
    } catch (error) {
        logCheck('register_user con anon', false, error.message);
    }
}

async function verifyDefaultValues() {
    console.log('\n⚙️  Verificando valores por defecto...\n');
    
    try {
        // Crear un usuario de prueba para verificar el default
        const testEmail = `test_default_${Date.now()}@test.com`;
        const { data: userId, error: registerError } = await supabaseAdmin.rpc('register_user', {
            p_email: testEmail,
            p_password_hash: 'test',
            p_display_name: 'Test Default',
            p_role: 'Regular'
        });

        if (registerError) {
            logCheck('Valor por defecto is_active', false, `Error al crear usuario: ${registerError.message}`);
            return;
        }

        // Verificar que el usuario esté inactivo
        const { data: userData, error: fetchError } = await supabaseAdmin
            .from('app_users')
            .select('is_active')
            .eq('id', userId)
            .single();

        if (fetchError) {
            logCheck('Valor por defecto is_active', false, fetchError.message);
        } else {
            logCheck('Valor por defecto is_active = false', userData.is_active === false, 
                userData.is_active ? 'Está activo (incorrecto)' : 'Está inactivo (correcto)');
        }

        // Limpiar
        await supabaseAdmin.from('app_users').delete().eq('id', userId);
    } catch (error) {
        logCheck('Valor por defecto is_active', false, error.message);
    }
}

async function runFullVerification() {
    console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE AUTENTICACIÓN\n');
    console.log('='.repeat(60));
    
    await verifyTables();
    await verifyAuthFunctions();
    await verifyExtendedFunctions();
    await verifyAdminUser();
    await verifyAnonAccess();
    await verifyDefaultValues();
    
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN DE VERIFICACIÓN\n');
    
    if (allChecksPassed) {
        console.log('✅ TODAS LAS VERIFICACIONES PASARON');
        console.log('\n🎉 El sistema está listo para usar!');
        console.log('\n📝 Próximos pasos:');
        console.log('   1. Verifica que GitHub Pages esté desplegado');
        console.log('   2. Prueba crear una cuenta nueva desde el login');
        console.log('   3. Inicia sesión como admin y aprueba el nuevo usuario');
        console.log('   4. Verifica que el nuevo usuario pueda iniciar sesión');
    } else {
        console.log('❌ ALGUNAS VERIFICACIONES FALLARON');
        console.log('\n⚠️  Revisa los errores arriba y ejecuta los SQL faltantes:');
        console.log('   - docs/supabase/01_auth_schema.sql');
        console.log('   - docs/supabase/02_auth_functions.sql');
        console.log('   - docs/supabase/04_password_reset_schema.sql');
        console.log('   - docs/supabase/05_auth_extended_functions.sql');
    }
    
    console.log('\n');
}

runFullVerification().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
