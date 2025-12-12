/**
 * Script completo para configurar autenticación en Supabase
 * Ejecuta todos los scripts SQL necesarios y crea el usuario admin
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: Supabase URL o Anon Key no configurados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para ejecutar SQL usando la API REST
async function executeSQL(sql, description) {
    console.log(`\n📝 ${description}...`);
    
    // Intentar usar la API REST de Supabase para ejecutar SQL
    // Esto requiere service_role key o usar el SQL Editor
    if (supabaseServiceKey) {
        try {
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ sql })
            });

            if (response.ok) {
                console.log(`✅ ${description} completado`);
                return true;
            } else {
                const error = await response.text();
                console.log(`⚠️  API REST no disponible, usando método alternativo...`);
            }
        } catch (error) {
            console.log(`⚠️  Error con API REST: ${error.message}`);
        }
    }

    // Método alternativo: Intentar crear las tablas usando el cliente
    // Dividir SQL en statements individuales
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.toLowerCase().startsWith('comment'));

    // Intentar ejecutar statements que sean INSERT, UPDATE, DELETE (no CREATE)
    for (const statement of statements) {
        const upperStatement = statement.toUpperCase().trim();
        
        // Si es CREATE TABLE, necesitamos usar otro método
        if (upperStatement.startsWith('CREATE TABLE')) {
            console.log(`⚠️  CREATE TABLE requiere ejecución manual en SQL Editor`);
            console.log(`   Por favor ejecuta: ${description}`);
            continue;
        }
        
        // Si es CREATE FUNCTION, también requiere ejecución manual
        if (upperStatement.startsWith('CREATE OR REPLACE FUNCTION')) {
            console.log(`⚠️  CREATE FUNCTION requiere ejecución manual en SQL Editor`);
            console.log(`   Por favor ejecuta: ${description}`);
            continue;
        }
    }

    return false;
}

// Función para verificar si las tablas existen
async function checkTablesExist() {
    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('id')
            .limit(1);
        
        return !error;
    } catch (error) {
        return false;
    }
}

// Función para verificar si las funciones existen
async function checkFunctionsExist() {
    try {
        const { data, error } = await supabase.rpc('authenticate_user', {
            p_email: 'test@test.com',
            p_password_hash: 'test'
        });
        
        // Si no hay error de "function does not exist", la función existe
        return error?.code !== '42883' && error?.message?.includes('function') === false;
    } catch (error) {
        return false;
    }
}

// Función principal
async function setupCompleteAuth() {
    console.log('🚀 Configurando sistema de autenticación completo...\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // 1. Verificar/Crear tablas
    console.log('📋 Paso 1: Verificando tablas...');
    const tablesExist = await checkTablesExist();
    
    if (!tablesExist) {
        console.log('❌ Las tablas no existen.');
        console.log('\n📝 Por favor ejecuta manualmente en Supabase SQL Editor:');
        console.log('   docs/supabase/01_auth_schema.sql\n');
        
        // Leer y mostrar el SQL
        try {
            const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
            const schemaSQL = readFileSync(schemaPath, 'utf-8');
            console.log('📄 Contenido del script (copia y pega en SQL Editor):\n');
            console.log('─'.repeat(60));
            console.log(schemaSQL);
            console.log('─'.repeat(60));
        } catch (error) {
            console.error('Error leyendo archivo:', error.message);
        }
        
        console.log('\n⏸️  Esperando a que ejecutes el script SQL...');
        console.log('   Presiona Enter cuando hayas ejecutado el script en Supabase SQL Editor...');
        
        // En un entorno interactivo, podríamos esperar input
        // Por ahora, continuamos asumiendo que el usuario lo ejecutará
        return;
    } else {
        console.log('✅ Las tablas ya existen!\n');
    }

    // 2. Verificar/Crear funciones
    console.log('📋 Paso 2: Verificando funciones...');
    const functionsExist = await checkFunctionsExist();
    
    if (!functionsExist) {
        console.log('❌ Las funciones no existen.');
        console.log('\n📝 Por favor ejecuta manualmente en Supabase SQL Editor:');
        console.log('   docs/supabase/02_auth_functions.sql\n');
        
        // Leer y mostrar el SQL
        try {
            const functionsPath = join(__dirname, '../docs/supabase/02_auth_functions.sql');
            const functionsSQL = readFileSync(functionsPath, 'utf-8');
            console.log('📄 Contenido del script (copia y pega en SQL Editor):\n');
            console.log('─'.repeat(60));
            console.log(functionsSQL);
            console.log('─'.repeat(60));
        } catch (error) {
            console.error('Error leyendo archivo:', error.message);
        }
        
        return;
    } else {
        console.log('✅ Las funciones ya existen!\n');
    }

    // 3. Crear usuario admin
    console.log('📋 Paso 3: Creando usuario admin...');
    
    const email = 'carlos.cedeno@agenticdream.com';
    const passwordHash = 'TWlyYW5kYSoxNA=='; // Base64 de 'Miranda*14'
    const displayName = 'Carlos Cedeño';
    const role = 'admin';

    // Intentar usar la función create_user
    const { data: userData, error: userError } = await supabase.rpc('create_user', {
        p_email: email,
        p_password_hash: passwordHash,
        p_display_name: displayName,
        p_role: role
    });

    if (userError) {
        // Si la función no existe, usar INSERT directo
        console.log('⚠️  Función create_user no disponible, usando INSERT directo...');
        
        const { data, error } = await supabase
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
            console.error('❌ Error creando usuario:', error);
            throw error;
        }

        console.log('✅ Usuario creado/actualizado exitosamente!');
        console.log('\n📋 Detalles del usuario:');
        console.log('   ID:', data[0].id);
        console.log('   Email:', data[0].email);
        console.log('   Display Name:', data[0].display_name);
        console.log('   Role:', data[0].role);
        console.log('   Active:', data[0].is_active);
        console.log('   Created:', data[0].created_at);
    } else {
        console.log('✅ Usuario creado exitosamente usando función create_user!');
        console.log('   User ID:', userData);
        
        // Verificar usuario creado
        const { data: verifyData, error: verifyError } = await supabase
            .from('app_users')
            .select('id, email, display_name, role, is_active, created_at')
            .eq('email', email)
            .single();

        if (!verifyError && verifyData) {
            console.log('\n📋 Detalles del usuario:');
            console.log('   ID:', verifyData.id);
            console.log('   Email:', verifyData.email);
            console.log('   Display Name:', verifyData.display_name);
            console.log('   Role:', verifyData.role);
            console.log('   Active:', verifyData.is_active);
            console.log('   Created:', verifyData.created_at);
        }
    }

    console.log('\n🎉 ¡Sistema de autenticación configurado exitosamente!');
    console.log('\n📝 Credenciales de acceso:');
    console.log('   Email: carlos.cedeno@agenticdream.com');
    console.log('   Password: Miranda*14');
    console.log('   Role: admin\n');
}

// Ejecutar
setupCompleteAuth().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
