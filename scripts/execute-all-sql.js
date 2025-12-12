/**
 * Script para ejecutar todos los SQL usando Management API de Supabase
 * Usa el service_role key para ejecutar SQL directamente
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1OTU5OSwiZXhwIjoyMDgxMDM1NTk5fQ.3-u6Uy6aE2CTgIA4AEEFHEsddMUC8mrDDdae1JcNpFw';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSQLStatement(statement) {
    try {
        // Intentar usar el endpoint de Supabase para ejecutar SQL
        // Usar el endpoint REST con service_role key
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ p_sql: statement })
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorText = await response.text();
            return { success: false, error: errorText };
        }
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

    // Dividir en statements
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let failCount = 0;

    for (const statement of statements) {
        if (!statement) continue;
        
        const result = await executeSQLStatement(statement);
        if (result.success) {
            successCount++;
        } else {
            failCount++;
            // Solo mostrar errores importantes
            if (!result.error.includes('function exec_sql')) {
                console.log(`   ⚠️  ${statement.substring(0, 50)}...`);
            }
        }
    }

    if (successCount > 0) {
        console.log(`   ✅ ${successCount} statements ejecutados`);
    }
    if (failCount > 0) {
        console.log(`   ⚠️  ${failCount} statements fallaron`);
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
        console.log('   Active:', data[0].is_active);
        console.log('\n📝 Credenciales:');
        console.log('   Email: carlos.cedeno@agenticdream.com');
        console.log('   Password: Miranda*14\n');
        return true;
    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Ejecutando todos los scripts SQL automáticamente...\n');

    // Paso 1: Crear función exec_sql (si no existe)
    console.log('📋 Paso 1: Creando función exec_sql...');
    const execSQLFunction = `
CREATE OR REPLACE FUNCTION exec_sql(p_sql TEXT)
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
$$;
    `.trim();

    // Intentar crear la función usando el cliente directamente
    // Como no podemos ejecutar DDL, necesitamos que el usuario ejecute esto manualmente primero
    console.log('⚠️  La función exec_sql necesita crearse manualmente la primera vez.');
    console.log('   Ejecuta en Supabase SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log(execSQLFunction);
    console.log('─'.repeat(60));
    console.log('\n   Después de crear la función, este script podrá ejecutar SQL automáticamente.\n');
    
    // Verificar si la función existe
    try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            p_sql: 'SELECT 1'
        });

        if (error && (error.code === '42883' || error.message?.includes('function exec_sql'))) {
            console.log('⏸️  Esperando a que crees la función exec_sql...\n');
            return;
        } else {
            console.log('✅ Función exec_sql existe! Continuando...\n');
        }
    } catch (error) {
        console.log('⏸️  Esperando a que crees la función exec_sql...\n');
        return;
    }

    // Paso 2: Ejecutar schema
    console.log('📋 Paso 2: Creando tablas...');
    const schemaOk = await executeSQLFile('../docs/supabase/01_auth_schema.sql', 'Creando tablas de autenticación');
    
    if (!schemaOk) {
        console.log('\n⚠️  No se pudieron crear las tablas.');
        console.log('   Verifica que la función exec_sql esté creada.\n');
        return;
    }

    // Paso 3: Ejecutar funciones
    console.log('\n📋 Paso 3: Creando funciones...');
    await executeSQLFile('../docs/supabase/02_auth_functions.sql', 'Creando funciones de autenticación');

    // Paso 4: Crear usuario
    console.log('\n📋 Paso 4: Creando usuario admin...');
    await createAdminUser();

    console.log('\n🎉 ¡Configuración completa!\n');
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
