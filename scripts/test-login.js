/**
 * Script para probar el login con credenciales específicas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Cargar variables de entorno
dotenv.config({ path: join(rootDir, '.env') });
dotenv.config({ path: join(__dirname, '../jira-supabase-sync/.env') });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function testLogin() {
    console.log('🔐 Probando login...\n');
    
    const email = 'carlos.cedeno@agenticdream.com';
    const password = 'Miranda*14';
    const passwordHash = btoa(password);
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password (plain): ${password}`);
    console.log(`🔑 Password Hash (base64): ${passwordHash}`);
    console.log(`🔑 Password Hash esperado en DB: TWlyYW5kYSoxNA==`);
    console.log(`✅ Hash coincide: ${passwordHash === 'TWlyYW5kYSoxNA=='}\n`);
    
    try {
        console.log('🔄 Llamando authenticate_user RPC...');
        const { data, error } = await supabase.rpc('authenticate_user', {
            p_email: email.trim().toLowerCase(),
            p_password_hash: passwordHash
        });
        
        if (error) {
            console.error('❌ Error en authenticate_user:', error);
            console.error('   Código:', error.code);
            console.error('   Mensaje:', error.message);
            console.error('   Detalles:', error.details);
            console.error('   Hint:', error.hint);
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('❌ No se retornaron datos - credenciales inválidas');
            return;
        }
        
        const user = data[0];
        console.log('✅ Login exitoso!');
        console.log('\n📋 Datos del usuario:');
        console.log(`   ID: ${user.user_id}`);
        console.log(`   Email: ${user.user_email || user.email}`);
        console.log(`   Display Name: ${user.display_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Is Active: ${user.is_active}`);
        console.log(`   Raw data:`, JSON.stringify(user, null, 2));
        
        // Probar crear sesión
        console.log('\n🔄 Probando crear sesión...');
        const token = 'test_token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        
        const { data: sessionData, error: sessionError } = await supabase.rpc('create_session', {
            p_user_id: user.user_id,
            p_token: token,
            p_expires_in_hours: 24
        });
        
        if (sessionError) {
            console.error('❌ Error creando sesión:', sessionError);
        } else {
            console.log('✅ Sesión creada exitosamente!');
            console.log(`   Session ID: ${sessionData}`);
            console.log(`   Token: ${token}`);
        }
        
    } catch (error) {
        console.error('❌ Error inesperado:', error);
        console.error('   Stack:', error.stack);
    }
}

testLogin().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
