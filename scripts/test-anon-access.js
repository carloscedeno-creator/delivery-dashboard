/**
 * Script para probar acceso con anon key
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testAnonAccess() {
    console.log('🔓 Probando acceso con anon key...\n');

    // Probar get_all_users
    console.log('1. Probando get_all_users...');
    const { data: usersData, error: usersError } = await supabaseAnon.rpc('get_all_users', {});
    
    if (usersError) {
        if (usersError.code === '42501' || usersError.message?.includes('permission') || usersError.message?.includes('denied') || usersError.message?.includes('Unauthorized')) {
            console.log('   ✅ CORRECTO: get_all_users está bloqueado para anon');
        } else {
            console.log(`   ⚠️  Error inesperado: ${usersError.message}`);
        }
    } else {
        console.log('   ❌ PROBLEMA: get_all_users está accesible con anon key');
        console.log(`      Retornó ${usersData?.length || 0} usuarios`);
    }

    // Probar approve_user
    console.log('\n2. Probando approve_user...');
    const { data: approveData, error: approveError } = await supabaseAnon.rpc('approve_user', {
        p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (approveError) {
        if (approveError.code === '42501' || approveError.message?.includes('permission') || approveError.message?.includes('denied') || approveError.message?.includes('Unauthorized')) {
            console.log('   ✅ CORRECTO: approve_user está bloqueado para anon');
        } else {
            console.log(`   ⚠️  Error inesperado: ${approveError.message}`);
        }
    } else {
        console.log('   ❌ PROBLEMA: approve_user está accesible con anon key');
    }

    // Probar deactivate_user
    console.log('\n3. Probando deactivate_user...');
    const { data: deactivateData, error: deactivateError } = await supabaseAnon.rpc('deactivate_user', {
        p_user_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (deactivateError) {
        if (deactivateError.code === '42501' || deactivateError.message?.includes('permission') || deactivateError.message?.includes('denied') || deactivateError.message?.includes('Unauthorized')) {
            console.log('   ✅ CORRECTO: deactivate_user está bloqueado para anon');
        } else {
            console.log(`   ⚠️  Error inesperado: ${deactivateError.message}`);
        }
    } else {
        console.log('   ❌ PROBLEMA: deactivate_user está accesible con anon key');
    }

    // Probar update_user_role
    console.log('\n4. Probando update_user_role...');
    const { data: roleData, error: roleError } = await supabaseAnon.rpc('update_user_role', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_new_role: 'Regular'
    });
    
    if (roleError) {
        if (roleError.code === '42501' || roleError.message?.includes('permission') || roleError.message?.includes('denied') || roleError.message?.includes('Unauthorized')) {
            console.log('   ✅ CORRECTO: update_user_role está bloqueado para anon');
        } else {
            console.log(`   ⚠️  Error inesperado: ${roleError.message}`);
        }
    } else {
        console.log('   ❌ PROBLEMA: update_user_role está accesible con anon key');
    }

    // Probar register_user (debería estar disponible)
    console.log('\n5. Probando register_user (debería estar disponible)...');
    const { error: registerError } = await supabaseAnon.rpc('register_user', {
        p_email: `test_${Date.now()}@test.com`,
        p_password_hash: 'test',
        p_display_name: 'Test',
        p_role: 'Regular'
    });
    
    if (registerError) {
        if (registerError.code === '42883') {
            console.log('   ❌ PROBLEMA: register_user no está disponible');
        } else {
            console.log('   ✅ CORRECTO: register_user está disponible (error esperado)');
        }
    } else {
        console.log('   ✅ CORRECTO: register_user está disponible');
    }

    console.log('\n');
}

testAnonAccess().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
