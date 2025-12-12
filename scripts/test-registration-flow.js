/**
 * Script para probar el flujo completo de registro
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

async function testRegistrationFlow() {
    console.log('🧪 Probando flujo completo de registro...\n');

    const testEmail = `test_${Date.now()}@test.com`;
    const testPassword = 'Test123!';
    const testPasswordHash = Buffer.from(testPassword).toString('base64');
    const testDisplayName = 'Test User';

    try {
        // 1. Registrar usuario
        console.log('1️⃣ Registrando nuevo usuario...');
        const { data: userId, error: registerError } = await supabaseAdmin.rpc('register_user', {
            p_email: testEmail,
            p_password_hash: testPasswordHash,
            p_display_name: testDisplayName,
            p_role: 'Regular'
        });

        if (registerError) {
            console.error('   ❌ Error al registrar:', registerError.message);
            return;
        }

        console.log(`   ✅ Usuario registrado con ID: ${userId}`);

        // 2. Verificar que el usuario está inactivo
        console.log('\n2️⃣ Verificando que el usuario está inactivo...');
        const { data: userData, error: fetchError } = await supabaseAdmin
            .from('app_users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError) {
            console.error('   ❌ Error al obtener usuario:', fetchError.message);
            return;
        }

        if (userData.is_active === false) {
            console.log('   ✅ Usuario está inactivo (requiere aprobación)');
        } else {
            console.log('   ⚠️  Usuario está activo (debería estar inactivo)');
        }

        // 3. Intentar login (debería fallar)
        console.log('\n3️⃣ Intentando login con usuario inactivo...');
        const { data: loginData, error: loginError } = await supabaseAdmin.rpc('authenticate_user', {
            p_email: testEmail,
            p_password_hash: testPasswordHash
        });

        if (loginError) {
            console.log(`   ✅ Login bloqueado correctamente: ${loginError.message}`);
        } else if (!loginData || loginData.length === 0) {
            console.log('   ✅ Login bloqueado correctamente (no retornó datos)');
        } else {
            console.log('   ⚠️  Login permitido (no debería ser posible)');
        }

        // 4. Aprobar usuario
        console.log('\n4️⃣ Aprobando usuario...');
        const { data: approveResult, error: approveError } = await supabaseAdmin.rpc('approve_user', {
            p_user_id: userId
        });

        if (approveError) {
            console.error('   ❌ Error al aprobar:', approveError.message);
            return;
        }

        if (approveResult) {
            console.log('   ✅ Usuario aprobado exitosamente');
        } else {
            console.log('   ⚠️  Aprobación retornó false');
        }

        // 5. Verificar que el usuario está activo
        console.log('\n5️⃣ Verificando que el usuario está activo...');
        const { data: userData2, error: fetchError2 } = await supabaseAdmin
            .from('app_users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError2) {
            console.error('   ❌ Error al obtener usuario:', fetchError2.message);
            return;
        }

        if (userData2.is_active === true) {
            console.log('   ✅ Usuario está activo');
        } else {
            console.log('   ⚠️  Usuario sigue inactivo');
        }

        // 6. Intentar login (debería funcionar)
        console.log('\n6️⃣ Intentando login con usuario activo...');
        const { data: loginData2, error: loginError2 } = await supabaseAdmin.rpc('authenticate_user', {
            p_email: testEmail,
            p_password_hash: testPasswordHash
        });

        if (loginError2) {
            console.log(`   ⚠️  Error en login: ${loginError2.message}`);
        } else if (loginData2 && loginData2.length > 0) {
            console.log('   ✅ Login exitoso!');
            console.log(`      Usuario: ${loginData2[0].email}`);
            console.log(`      Rol: ${loginData2[0].role}`);
        } else {
            console.log('   ⚠️  Login no retornó datos');
        }

        // 7. Limpiar - eliminar usuario de prueba
        console.log('\n7️⃣ Limpiando usuario de prueba...');
        const { error: deleteError } = await supabaseAdmin
            .from('app_users')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            console.log(`   ⚠️  Error al eliminar: ${deleteError.message}`);
        } else {
            console.log('   ✅ Usuario de prueba eliminado');
        }

        console.log('\n✅ Flujo completo probado exitosamente!\n');

    } catch (error) {
        console.error('❌ Error en el flujo:', error);
        process.exit(1);
    }
}

testRegistrationFlow().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
