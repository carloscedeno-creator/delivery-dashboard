/**
 * Script inteligente para ejecutar SQL
 * Maneja correctamente bloques de funciones PostgreSQL
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

// Parser inteligente de SQL que maneja bloques $$ ... $$
function parseSQLStatements(sql) {
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    let i = 0;

    while (i < sql.length) {
        const char = sql[i];
        const nextChar = sql[i + 1];

        // Detectar inicio de bloque $$ ... $$
        if (char === '$' && nextChar === '$' && !inDollarQuote) {
            // Encontrar el tag del dollar quote (ej: $$, $tag$)
            let tagEnd = i + 2;
            while (tagEnd < sql.length && sql[tagEnd] !== '$') {
                tagEnd++;
            }
            dollarTag = sql.substring(i, tagEnd + 1);
            inDollarQuote = true;
            currentStatement += dollarTag;
            i = tagEnd + 1;
            continue;
        }

        // Detectar fin de bloque $$ ... $$
        if (inDollarQuote && sql.substring(i, i + dollarTag.length) === dollarTag) {
            currentStatement += dollarTag;
            i += dollarTag.length;
            inDollarQuote = false;
            dollarTag = '';
            continue;
        }

        currentStatement += char;

        // Si no estamos en un bloque $$, detectar fin de statement
        if (!inDollarQuote && char === ';') {
            const trimmed = currentStatement.trim();
            if (trimmed && !trimmed.startsWith('--')) {
                statements.push(trimmed);
            }
            currentStatement = '';
        }

        i++;
    }

    // Agregar último statement si existe
    const trimmed = currentStatement.trim();
    if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
    }

    return statements.filter(s => s.length > 0);
}

async function executeSQLStatement(statement) {
    try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            p_sql: statement
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function executeSQLFile(filePath, description) {
    console.log(`\n📝 ${description}...`);
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const fullPath = join(__dirname, filePath);
    const sql = readFileSync(fullPath, 'utf-8');

    // Parsear SQL correctamente
    const statements = parseSQLStatements(sql);

    console.log(`   📋 Encontrados ${statements.length} statements para ejecutar...`);

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Omitir comentarios y statements vacíos
        if (!statement || statement.trim().startsWith('--')) {
            continue;
        }

        const result = await executeSQLStatement(statement);
        
        if (result.success) {
            successCount++;
            if (i < 5 || i === statements.length - 1) {
                console.log(`   ✅ Statement ${i + 1}/${statements.length} ejecutado`);
            }
        } else {
            failCount++;
            // Solo mostrar errores importantes (no "function does not exist" para exec_sql)
            if (!result.error.includes('function exec_sql') && !result.error.includes('already exists')) {
                errors.push(`Statement ${i + 1}: ${result.error.substring(0, 80)}`);
            }
        }
    }

    if (successCount > 0) {
        console.log(`   ✅ ${successCount} statements ejecutados exitosamente`);
    }
    if (failCount > 0) {
        console.log(`   ⚠️  ${failCount} statements fallaron o ya existían`);
        if (errors.length > 0 && errors.length <= 5) {
            errors.forEach(err => console.log(`      ${err}`));
        }
    }

    return successCount > 0;
}

async function createAdminUser() {
    console.log('\n📝 Creando usuario admin...\n');
    
    const email = 'carlos.cedeno@agenticdream.com';
    const passwordHash = 'TWlyYW5kYSoxNA==';
    const displayName = 'Carlos Cedeño';
    const role = 'admin';

    try {
        // Intentar usar función create_user primero
        const { data: userData, error: userError } = await supabaseAdmin.rpc('create_user', {
            p_email: email,
            p_password_hash: passwordHash,
            p_display_name: displayName,
            p_role: role
        });

        if (userError) {
            // Usar INSERT directo
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

            console.log('✅ Usuario creado exitosamente!');
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
        if (error.code === 'PGRST205') {
            console.log('   Las tablas no existen aún.\n');
        }
        return false;
    }
}

async function main() {
    console.log('🚀 Ejecutando configuración completa de autenticación...\n');

    // Verificar función exec_sql
    console.log('📋 Verificando función exec_sql...');
    try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            p_sql: 'SELECT 1'
        });

        if (error && (error.code === '42883' || error.message?.includes('function exec_sql'))) {
            console.log('❌ Función exec_sql no existe.\n');
            console.log('📝 Por favor ejecuta primero en Supabase SQL Editor:\n');
            console.log('─'.repeat(60));
            console.log(`CREATE OR REPLACE FUNCTION exec_sql(p_sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result TEXT;
BEGIN
    EXECUTE p_sql;
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;`);
            console.log('─'.repeat(60));
            console.log('\n⏸️  Después de crear la función, ejecuta este script nuevamente.\n');
            return;
        } else {
            console.log('✅ Función exec_sql existe!\n');
        }
    } catch (error) {
        console.log('❌ Error verificando función:', error.message);
        return;
    }

    // Ejecutar schema
    console.log('📋 Creando tablas...');
    const schemaOk = await executeSQLFile('../docs/supabase/01_auth_schema.sql', 'Creando tablas de autenticación');
    
    if (!schemaOk) {
        console.log('\n⚠️  No se pudieron crear las tablas automáticamente.\n');
        return;
    }

    // Esperar un momento para que las tablas se creen
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Ejecutar funciones
    console.log('\n📋 Creando funciones...');
    await executeSQLFile('../docs/supabase/02_auth_functions.sql', 'Creando funciones de autenticación');

    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Crear usuario
    console.log('\n📋 Creando usuario admin...');
    const userCreated = await createAdminUser();

    if (userCreated) {
        console.log('\n🎉 ¡Configuración completa exitosa!');
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
