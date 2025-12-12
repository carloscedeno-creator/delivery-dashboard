/**
 * Script para probar las funciones administrativas con validación de sesión
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1OTU5OSwiZXhwIjoyMDgxMDM1NTk5fQ.3-u6Uy6aE2CTgIA4AEEFHEsddMUC8mrDDdae1JcNpFw';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testAdminFunctions() {
    console.log('🔐 Probando funciones administrativas con validación de sesión...\n');

    try {
        // 1. Obtener el user_id del admin
        console.log('1. Obteniendo usuario admin...');
        const { data: userData, error: userError } = await supabaseAdmin
            .from('app_users')
            .select('id, email, role')
            .eq('email', 'carlos.cedeno@agenticdream.com')
            .single();

        if (userError || !userData) {
            console.log(`   ❌ Error: ${userError?.message || 'Usuario no encontrado'}`);
            return;
        }

        console.log(`   ✅ Usuario encontrado: ${userData.email} (${userData.role})`);

        // 2. Crear una sesión de prueba
        console.log('\n2. Creando sesión de prueba...');
        const testToken = crypto.randomBytes(32).toString('base64');
        const { data: sessionId, error: sessionError } = await supabaseAdmin.rpc('create_session', {
            p_user_id: userData.id,
            p_token: testToken,
            p_expires_in_hours: 1
        });

        if (sessionError) {
            console.log(`   ❌ Error creando sesión: ${sessionError.message}`);
            return;
        }

        console.log(`   ✅ Sesión creada con ID: ${sessionId}`);

        // 3. Probar get_user_from_token
        console.log('\n3. Probando get_user_from_token...');
        const { data: tokenUserId, error: tokenError } = await supabaseAdmin.rpc('get_user_from_token', {
            p_token: testToken
        });

        if (tokenError) {
            console.log(`   ❌ Error: ${tokenError.message}`);
        } else {
            console.log(`   ✅ CORRECTO: get_user_from_token retornó user_id: ${tokenUserId}`);
            if (tokenUserId === userData.id) {
                console.log('   ✅ El user_id coincide con el admin');
            } else {
                console.log('   ⚠️  El user_id NO coincide');
            }
        }

        // 4. Probar get_all_users con el token
        console.log('\n4. Probando get_all_users con token de sesión...');
        const { data: usersData, error: usersError } = await supabaseAdmin.rpc('get_all_users', {
            p_session_token: testToken
        });

        if (usersError) {
            console.log(`   ❌ Error: ${usersError.message}`);
        } else {
            console.log(`   ✅ CORRECTO: get_all_users retornó ${usersData?.length || 0} usuarios`);
            if (usersData && usersData.length > 0) {
                console.log(`   📋 Primer usuario: ${usersData[0].email} (${usersData[0].role})`);
            }
        }

        // 5. Probar con token inválido (debe fallar)
        console.log('\n5. Probando get_all_users con token inválido (debe fallar)...');
        const { data: invalidData, error: invalidError } = await supabaseAdmin.rpc('get_all_users', {
            p_session_token: 'invalid_token_12345'
        });

        if (invalidError) {
            if (invalidError.message?.includes('Unauthorized') || invalidError.message?.includes('Invalid')) {
                console.log(`   ✅ CORRECTO: Token inválido rechazado: ${invalidError.message}`);
            } else {
                console.log(`   ⚠️  Error inesperado: ${invalidError.message}`);
            }
        } else {
            console.log('   ❌ PROBLEMA: Token inválido fue aceptado');
        }

        // Limpiar sesión de prueba
        console.log('\n6. Limpiando sesión de prueba...');
        const { error: logoutError } = await supabaseAdmin.rpc('logout_session', { p_token: testToken });
        if (logoutError) {
            console.log(`   ⚠️  Error al limpiar sesión: ${logoutError.message}`);
        } else {
            console.log('   ✅ Sesión limpiada');
        }

    } catch (error) {
        console.error('❌ Error fatal:', error);
    }

    console.log('\n✅ Pruebas completadas\n');
}

testAdminFunctions().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
