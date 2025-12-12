/**
 * Script para ejecutar SQL usando Supabase Management API
 * Usa el service_role key para ejecutar SQL directamente
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'sb_secret_vSxKZgCYSWtqkJluJpYUvQ_tJOMsgy2';

// Crear cliente con service_role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSQLViaManagementAPI(sql, description) {
    console.log(`\n📝 ${description}...`);
    
    try {
        // Supabase Management API endpoint para ejecutar SQL
        // Usar el endpoint de PostgREST con service_role key
        const projectRef = supabaseUrl.split('//')[1].split('.')[0]; // Extraer project ref
        
        // Dividir SQL en statements individuales
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let successCount = 0;
        let failCount = 0;

        for (const statement of statements) {
            if (!statement) continue;
            
            try {
                // Intentar ejecutar usando fetch directo al endpoint de Supabase
                // El Management API de Supabase requiere autenticación especial
                const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': serviceRoleKey,
                        'Authorization': `Bearer ${serviceRoleKey}`
                    },
                    body: JSON.stringify({ query: statement })
                });

                if (response.ok) {
                    successCount++;
                } else {
                    // Intentar método alternativo: usar el cliente de Supabase directamente
                    // Pero esto no funcionará para CREATE TABLE
                    failCount++;
                    console.log(`   ⚠️  No se pudo ejecutar: ${statement.substring(0, 60)}...`);
                }
            } catch (error) {
                failCount++;
                // Ignorar errores individuales
            }
        }

        if (successCount > 0) {
            console.log(`   ✅ ${successCount} statements ejecutados`);
        }
        if (failCount > 0) {
            console.log(`   ⚠️  ${failCount} statements requieren ejecución manual`);
        }

        // Como Supabase no tiene un endpoint público para ejecutar SQL DDL,
        // necesitamos usar el SQL Editor o crear una función RPC especial
        return false;
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Ejecutando scripts SQL usando Management API...\n');
    console.log('⚠️  Nota: Supabase no permite ejecutar SQL DDL desde la API REST.');
    console.log('   Necesitamos usar el SQL Editor o crear una función RPC especial.\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Leer scripts SQL
    const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
    const functionsPath = join(__dirname, '../docs/supabase/02_auth_functions.sql');
    
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    const functionsSQL = readFileSync(functionsPath, 'utf-8');

    // Intentar ejecutar (aunque probablemente falle)
    await executeSQLViaManagementAPI(schemaSQL, 'Creando tablas de autenticación');
    await executeSQLViaManagementAPI(functionsSQL, 'Creando funciones de autenticación');

    console.log('\n📋 Como Supabase no permite ejecutar SQL DDL desde la API:');
    console.log('   1. Abre Supabase Dashboard → SQL Editor');
    console.log('   2. Ejecuta el contenido de: docs/supabase/01_auth_schema.sql');
    console.log('   3. Ejecuta el contenido de: docs/supabase/02_auth_functions.sql');
    console.log('   4. Luego ejecuta: node scripts/create-admin-carlos.js\n');

    // Intentar crear usuario (esto sí debería funcionar si las tablas existen)
    console.log('📝 Intentando crear usuario admin (si las tablas ya existen)...\n');
    
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
            if (error.code === 'PGRST205') {
                console.log('❌ Las tablas no existen aún.');
                console.log('   Por favor ejecuta los scripts SQL primero.\n');
            } else {
                throw error;
            }
        } else {
            console.log('✅ Usuario admin creado exitosamente!');
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
        console.log('⚠️  No se pudo crear el usuario:', error.message);
        console.log('   Las tablas probablemente no existen aún.\n');
    }
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
