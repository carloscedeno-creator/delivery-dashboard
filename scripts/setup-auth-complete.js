/**
 * Script completo para configurar autenticación usando service_role key
 * Ejecuta SQL y crea el usuario admin
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1OTU5OSwiZXhwIjoyMDgxMDM1NTk5fQ.3-u6Uy6aE2CTgIA4AEEFHEsddMUC8mrDDdae1JcNpFw';

// Crear cliente con service_role key
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSQLViaRPC(sql) {
    console.log('📝 Intentando ejecutar SQL via RPC...\n');
    
    try {
        // Intentar crear una función RPC temporal que ejecute SQL
        // Primero necesitamos crear la función en la BD
        
        // Dividir SQL en statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        // Como Supabase no permite ejecutar SQL DDL desde la API REST,
        // necesitamos usar el SQL Editor o crear una función especial
        
        console.log('⚠️  Supabase no permite ejecutar SQL DDL desde la API REST.');
        console.log('   Necesitamos ejecutar el SQL manualmente en SQL Editor.\n');
        
        return false;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

async function createAdminUser() {
    console.log('📝 Creando usuario admin...\n');
    
    const email = 'carlos.cedeno@agenticdream.com';
    const passwordHash = 'TWlyYW5kYSoxNA=='; // Base64 de 'Miranda*14'
    const displayName = 'Carlos Cedeño';
    const role = 'admin';

    try {
        // Intentar usar la función create_user primero
        const { data: userData, error: userError } = await supabaseAdmin.rpc('create_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_display_name: displayName,
            p_role: role
        });

        if (userError) {
            // Si la función no existe, usar INSERT directo
            console.log('⚠️  Función create_user no disponible, usando INSERT directo...\n');
            
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
                    console.log('   Por favor ejecuta primero en Supabase SQL Editor:\n');
                    
                    const __filename = fileURLToPath(import.meta.url);
                    const __dirname = dirname(__filename);
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
                    return false;
                }
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
        return false;
    }
}

async function main() {
    console.log('🚀 Configurando sistema de autenticación completo...\n');

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
            
            const __filename = fileURLToPath(import.meta.url);
            const __dirname = dirname(__filename);
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
