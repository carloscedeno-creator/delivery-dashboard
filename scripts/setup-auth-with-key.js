/**
 * Script para ejecutar SQL directamente en Supabase usando Management API
 * Usa el service_role key proporcionado
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_vSxKZgCYSWtqkJluJpYUvQ_tJOMsgy2';

if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurado');
    process.exit(1);
}

// Crear cliente con service_role key para operaciones administrativas
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSQL(sql, description) {
    console.log(`\n📝 ${description}...`);
    
    try {
        // Dividir SQL en statements individuales
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        // Ejecutar cada statement usando rpc o directamente
        for (const statement of statements) {
            if (!statement) continue;
            
            try {
                // Intentar ejecutar usando rpc si es posible
                // Para CREATE statements, necesitamos usar el método directo
                if (statement.toUpperCase().includes('CREATE') || 
                    statement.toUpperCase().includes('ALTER') ||
                    statement.toUpperCase().includes('COMMENT') ||
                    statement.toUpperCase().includes('CREATE POLICY')) {
                    
                    // Usar fetch directo con service_role key
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': serviceRoleKey,
                            'Authorization': `Bearer ${serviceRoleKey}`
                        },
                        body: JSON.stringify({ query: statement })
                    });

                    if (!response.ok) {
                        // Método alternativo: usar el endpoint de query directo
                        // Supabase no tiene un endpoint público para ejecutar SQL arbitrario
                        // Necesitamos usar el SQL Editor o crear una función RPC
                        console.log(`   ⚠️  Statement requiere ejecución manual: ${statement.substring(0, 50)}...`);
                        continue;
                    }
                }
            } catch (error) {
                console.log(`   ⚠️  Error ejecutando statement: ${error.message}`);
            }
        }

        // Como Supabase no permite ejecutar SQL DDL desde la API REST directamente,
        // vamos a intentar crear las tablas usando el cliente de Supabase
        // pero esto tampoco funcionará para CREATE TABLE
        
        console.log(`⚠️  Supabase no permite ejecutar SQL DDL desde la API REST.`);
        console.log(`   Usando método alternativo: crear tablas mediante el cliente...`);
        
        return false;
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        return false;
    }
}

// Función para crear tablas usando el cliente (método alternativo)
async function createTablesDirectly() {
    console.log('\n📝 Creando tablas directamente...');
    
    try {
        // Intentar crear tabla app_users usando el cliente
        // Nota: Esto no funcionará porque Supabase no permite CREATE TABLE desde el cliente
        // Necesitamos usar el SQL Editor
        
        console.log('⚠️  No se puede crear tablas desde el cliente JavaScript.');
        console.log('   Por favor ejecuta los scripts SQL en Supabase SQL Editor.\n');
        
        return false;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

// Función para crear usuario (esto sí funciona)
async function createAdminUser() {
    console.log('\n📝 Creando usuario admin...');
    
    const email = 'carlos.cedeno@agenticdream.com';
    const passwordHash = 'TWlyYW5kYSoxNA=='; // Base64 de 'Miranda*14'
    const displayName = 'Carlos Cedeño';
    const role = 'admin';

    try {
        // Intentar usar la función create_user
        const { data: userData, error: userError } = await supabaseAdmin.rpc('create_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_display_name: displayName,
            p_role: role
        });

        if (userError) {
            // Si la función no existe, usar INSERT directo
            console.log('⚠️  Función create_user no disponible, usando INSERT directo...');
            
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
            return true;
        } else {
            console.log('✅ Usuario creado exitosamente usando función create_user!');
            console.log('   User ID:', userData);
            
            // Verificar usuario creado
            const { data: verifyData, error: verifyError } = await supabaseAdmin
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
            return true;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'PGRST205') {
            console.log('\n⚠️  Las tablas no existen aún.');
            console.log('   Por favor ejecuta primero en Supabase SQL Editor:');
            console.log('   - docs/supabase/01_auth_schema.sql');
            console.log('   - docs/supabase/02_auth_functions.sql\n');
        }
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Configurando sistema de autenticación con service_role key...\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Verificar si las tablas existen
    console.log('📋 Verificando si las tablas existen...');
    try {
        const { data, error } = await supabaseAdmin
            .from('app_users')
            .select('id')
            .limit(1);
        
        if (error && error.code === 'PGRST205') {
            console.log('❌ Las tablas no existen.\n');
            console.log('📝 Por favor ejecuta primero en Supabase SQL Editor:\n');
            
            // Mostrar SQL del schema
            const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
            const schemaSQL = readFileSync(schemaPath, 'utf-8');
            console.log('📄 01_auth_schema.sql:');
            console.log('─'.repeat(60));
            console.log(schemaSQL);
            console.log('─'.repeat(60));
            console.log('\n📄 02_auth_functions.sql:');
            const functionsPath = join(__dirname, '../docs/supabase/02_auth_functions.sql');
            const functionsSQL = readFileSync(functionsPath, 'utf-8');
            console.log('─'.repeat(60));
            console.log(functionsSQL);
            console.log('─'.repeat(60));
            console.log('\n⏸️  Después de ejecutar los scripts SQL, ejecuta este script nuevamente.\n');
            return;
        } else if (error) {
            throw error;
        } else {
            console.log('✅ Las tablas ya existen!\n');
        }
    } catch (error) {
        console.error('❌ Error verificando tablas:', error.message);
        return;
    }

    // Crear usuario admin
    const userCreated = await createAdminUser();
    
    if (userCreated) {
        console.log('\n🎉 ¡Sistema de autenticación configurado exitosamente!');
        console.log('\n📝 Credenciales de acceso:');
        console.log('   Email: carlos.cedeno@agenticdream.com');
        console.log('   Password: Miranda*14');
        console.log('   Role: admin\n');
    }
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
