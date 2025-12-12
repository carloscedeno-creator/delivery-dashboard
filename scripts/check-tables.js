/**
 * Script para verificar qué tablas existen en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';
const serviceRoleKey = 'sb_secret_vSxKZgCYSWtqkJluJpYUvQ_tJOMsgy2';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function checkTables() {
    console.log('🔍 Verificando tablas en Supabase...\n');

    // Intentar listar tablas usando información del esquema
    // Nota: Esto requiere acceso a information_schema, que no está disponible desde el cliente
    
    // Intentar acceder a tablas conocidas
    const knownTables = ['app_users', 'user_sessions', 'issues', 'sprints', 'squads'];
    
    console.log('📋 Verificando tablas conocidas:\n');
    
    for (const tableName of knownTables) {
        try {
            const { data, error } = await supabaseAdmin
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error) {
                if (error.code === 'PGRST205') {
                    console.log(`   ❌ ${tableName}: No existe`);
                } else {
                    console.log(`   ⚠️  ${tableName}: Error (${error.code})`);
                }
            } else {
                console.log(`   ✅ ${tableName}: Existe`);
            }
        } catch (error) {
            console.log(`   ❌ ${tableName}: Error - ${error.message}`);
        }
    }
    
    console.log('\n📝 Intentando crear usuario admin directamente...\n');
    
    // Intentar crear usuario directamente
    const email = 'carlos.cedeno@agenticdream.com';
    const passwordHash = 'TWlyYW5kYSoxNA==';
    const displayName = 'Carlos Cedeño';
    const role = 'admin';

    try {
        const { data, error } = await supabaseAdmin
            .from('app_users')
            .upsert({
                email: email,
                password_hash: passwordHash,
                display_name: displayName,
                role: role,
                is_active: true
            }, {
                onConflict: 'email'
            })
            .select();

        if (error) {
            console.log('❌ Error:', error.message);
            console.log('   Code:', error.code);
            if (error.code === 'PGRST205') {
                console.log('\n📋 Las tablas de autenticación no existen.');
                console.log('   Por favor ejecuta en Supabase SQL Editor:');
                console.log('   - docs/supabase/01_auth_schema.sql');
                console.log('   - docs/supabase/02_auth_functions.sql\n');
            }
        } else {
            console.log('✅ Usuario creado exitosamente!');
            console.log('\n📋 Detalles:');
            console.log('   ID:', data[0].id);
            console.log('   Email:', data[0].email);
            console.log('   Display Name:', data[0].display_name);
            console.log('   Role:', data[0].role);
            console.log('\n📝 Credenciales:');
            console.log('   Email: carlos.cedeno@agenticdream.com');
            console.log('   Password: Miranda*14\n');
        }
    } catch (error) {
        console.error('❌ Error fatal:', error.message);
    }
}

checkTables().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
