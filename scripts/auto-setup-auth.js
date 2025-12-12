/**
 * Script automático para configurar autenticación
 * Crea la función exec_sql y luego ejecuta todos los scripts SQL
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1OTU5OSwiZXhwIjoyMDgxMDM1NTk5fQ.3-u6Uy6aE2CTgIA4AEEFHEsddMUC8mrDDdae1JcNpFw';

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

        let successCount = 0;
        let failCount = 0;

        for (const statement of statements) {
            if (!statement) continue;
            
            try {
                // Intentar ejecutar usando la función exec_sql si existe
                const { data, error } = await supabaseAdmin.rpc('exec_sql', {
                    p_sql: statement
                });

                if (error) {
                    // Si la función no existe, intentar crear la función primero
                    if (error.code === '42883' || error.message?.includes('function exec_sql')) {
                        console.log('   ⚠️  Función exec_sql no existe, creándola primero...');
                        
                        // Crear la función exec_sql usando SQL directo
                        // Esto requiere que podamos ejecutar SQL, pero es un catch-22
                        // Necesitamos ejecutar manualmente la función una vez
                        console.log('   📋 Por favor ejecuta primero en Supabase SQL Editor:');
                        console.log('      docs/supabase/00_create_exec_sql_function.sql\n');
                        return false;
                    }
                    
                    failCount++;
                    console.log(`   ⚠️  Error: ${error.message.substring(0, 60)}...`);
                } else {
                    successCount++;
                }
            } catch (error) {
                failCount++;
                console.log(`   ⚠️  Error ejecutando statement: ${error.message.substring(0, 60)}...`);
            }
        }

        if (successCount > 0) {
            console.log(`   ✅ ${successCount} statements ejecutados`);
        }
        if (failCount > 0 && successCount === 0) {
            return false;
        }

        return successCount > 0;
    } catch (error) {
        console.error(`❌ Error:`, error.message);
        return false;
    }
}

async function createExecSQLFunction() {
    console.log('📝 Creando función exec_sql...\n');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const functionPath = join(__dirname, '../docs/supabase/00_create_exec_sql_function.sql');
    const functionSQL = readFileSync(functionPath, 'utf-8');

    // Intentar ejecutar usando fetch directo con service_role
    try {
        // Usar el endpoint REST de Supabase para ejecutar la función
        // Primero necesitamos crear la función manualmente una vez
        console.log('⚠️  La función exec_sql necesita crearse manualmente la primera vez.');
        console.log('   Ejecuta en Supabase SQL Editor:\n');
        console.log('─'.repeat(60));
        console.log(functionSQL);
        console.log('─'.repeat(60));
        console.log('\n   Después de crear la función, este script podrá ejecutar SQL automáticamente.\n');
        return false;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

async function createAdminUser() {
    console.log('📝 Creando usuario admin...\n');
    
    const email = 'carlos.cedeno@agenticdream.com';
    const passwordHash = 'TWlyYW5kYSoxNA==';
    const displayName = 'Carlos Cedeño';
    const role = 'admin';

    try {
        const { data: userData, error: userError } = await supabaseAdmin.rpc('create_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_display_name: displayName,
            p_role: role
        });

        if (userError) {
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
                throw error;
            }

            console.log('✅ Usuario creado/actualizado exitosamente!');
            console.log('\n📋 Detalles:');
            console.log('   ID:', data[0].id);
            console.log('   Email:', data[0].email);
            console.log('   Display Name:', data[0].display_name);
            console.log('   Role:', data[0].role);
            return true;
        } else {
            console.log('✅ Usuario creado usando función create_user!');
            const { data: verifyData } = await supabaseAdmin
                .from('app_users')
                .select('*')
                .eq('email', email)
                .single();
            
            if (verifyData) {
                console.log('\n📋 Detalles:');
                console.log('   ID:', verifyData.id);
                console.log('   Email:', verifyData.email);
                console.log('   Role:', verifyData.role);
            }
            return true;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Configurando sistema de autenticación automáticamente...\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Paso 1: Verificar/Crear función exec_sql
    console.log('📋 Paso 1: Verificando función exec_sql...');
    try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            p_sql: 'SELECT 1'
        });

        if (error && (error.code === '42883' || error.message?.includes('function exec_sql'))) {
            console.log('❌ Función exec_sql no existe.\n');
            await createExecSQLFunction();
            console.log('\n⏸️  Después de crear la función exec_sql, ejecuta este script nuevamente.\n');
            return;
        } else {
            console.log('✅ Función exec_sql existe!\n');
        }
    } catch (error) {
        console.log('❌ Error verificando función:', error.message);
        await createExecSQLFunction();
        return;
    }

    // Paso 2: Verificar/Crear tablas
    console.log('📋 Paso 2: Verificando tablas...');
    try {
        const { data, error } = await supabaseAdmin
            .from('app_users')
            .select('id')
            .limit(1);
        
        if (error && error.code === 'PGRST205') {
            console.log('❌ Las tablas no existen. Creándolas...\n');
            
            const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
            const schemaSQL = readFileSync(schemaPath, 'utf-8');
            
            const schemaOk = await executeSQL(schemaSQL, 'Creando tablas de autenticación');
            if (!schemaOk) {
                console.log('\n⚠️  No se pudieron crear las tablas automáticamente.');
                console.log('   Por favor ejecuta manualmente: docs/supabase/01_auth_schema.sql\n');
                return;
            }
        } else {
            console.log('✅ Las tablas ya existen!\n');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    // Paso 3: Verificar/Crear funciones
    console.log('📋 Paso 3: Verificando funciones...');
    try {
        const { data, error } = await supabaseAdmin.rpc('authenticate_user', {
            p_email: 'test@test.com',
            p_password_hash: 'test'
        });

        if (error && (error.code === '42883' || error.message?.includes('function authenticate_user'))) {
            console.log('❌ Las funciones no existen. Creándolas...\n');
            
            const functionsPath = join(__dirname, '../docs/supabase/02_auth_functions.sql');
            const functionsSQL = readFileSync(functionsPath, 'utf-8');
            
            const functionsOk = await executeSQL(functionsSQL, 'Creando funciones de autenticación');
            if (!functionsOk) {
                console.log('\n⚠️  No se pudieron crear las funciones automáticamente.');
                console.log('   Por favor ejecuta manualmente: docs/supabase/02_auth_functions.sql\n');
                return;
            }
        } else {
            console.log('✅ Las funciones ya existen!\n');
        }
    } catch (error) {
        // Ignorar errores de autenticación (esperado)
        console.log('✅ Las funciones existen (error esperado en test).\n');
    }

    // Paso 4: Crear usuario admin
    console.log('📋 Paso 4: Creando usuario admin...');
    const userCreated = await createAdminUser();
    
    if (userCreated) {
        console.log('\n🎉 ¡Sistema de autenticación configurado exitosamente!');
        console.log('\n📝 Credenciales:');
        console.log('   Email: carlos.cedeno@agenticdream.com');
        console.log('   Password: Miranda*14');
        console.log('   Role: admin\n');
    }
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
