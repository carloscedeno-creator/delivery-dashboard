/**
 * Script final para ejecutar SQL automáticamente
 * Usa Management API de Supabase directamente
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

// Parser inteligente de SQL
function parseSQLStatements(sql) {
    const statements = [];
    let currentStatement = '';
    let inDollarQuote = false;
    let dollarTag = '';
    let i = 0;

    while (i < sql.length) {
        const char = sql[i];

        if (char === '$' && sql[i + 1] === '$' && !inDollarQuote) {
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

        if (inDollarQuote && sql.substring(i, i + dollarTag.length) === dollarTag) {
            currentStatement += dollarTag;
            i += dollarTag.length;
            inDollarQuote = false;
            dollarTag = '';
            continue;
        }

        currentStatement += char;

        if (!inDollarQuote && char === ';') {
            const trimmed = currentStatement.trim();
            if (trimmed && !trimmed.startsWith('--')) {
                statements.push(trimmed);
            }
            currentStatement = '';
        }

        i++;
    }

    const trimmed = currentStatement.trim();
    if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
    }

    return statements.filter(s => s.length > 0);
}

async function executeSQLViaManagementAPI(sql) {
    // Extraer project reference
    const projectRef = supabaseUrl.split('//')[1].split('.')[0];
    
    // Usar Management API de Supabase
    // El endpoint correcto es: https://api.supabase.com/v1/projects/{ref}/database/query
    // Pero requiere un access token diferente (no service_role key)
    
    // Alternativa: Usar el endpoint REST directo de Supabase con service_role
    // Pero esto no funciona para DDL
    
    // La única forma real es usar el SQL Editor o crear una función RPC especial
    // que ya esté creada en la BD
    
    console.log('⚠️  Supabase Management API requiere autenticación diferente.');
    console.log('   Usando método alternativo: función RPC exec_sql...\n');
    
    return false;
}

async function executeSQLViaRPC(sql, description) {
    console.log(`\n📝 ${description}...`);
    
    const statements = parseSQLStatements(sql);
    console.log(`   📋 Encontrados ${statements.length} statements`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (!statement || statement.trim().startsWith('--')) continue;

        try {
            // Intentar ejecutar usando exec_sql RPC
            const { data, error } = await supabaseAdmin.rpc('exec_sql', {
                p_sql: statement
            });

            if (error) {
                // Si la función no existe, mostrar instrucciones
                if (error.code === '42883' || error.message?.includes('function exec_sql')) {
                    console.log('\n❌ Función exec_sql no está disponible como RPC.');
                    console.log('   Necesitas ejecutar manualmente en SQL Editor:\n');
                    console.log('─'.repeat(60));
                    console.log(`CREATE OR REPLACE FUNCTION exec_sql(p_sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE p_sql;
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Exponer como RPC
GRANT EXECUTE ON FUNCTION exec_sql TO anon, authenticated, service_role;`);
                    console.log('─'.repeat(60));
                    console.log('\n⏸️  Después de crear la función, ejecuta este script nuevamente.\n');
                    return false;
                }
                
                failCount++;
                // Ignorar errores de "already exists"
                if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
                    if (i < 3) {
                        console.log(`   ⚠️  Statement ${i + 1}: ${error.message.substring(0, 60)}...`);
                    }
                } else {
                    successCount++; // "already exists" es éxito
                }
            } else {
                successCount++;
                if (i < 3 || i === statements.length - 1) {
                    console.log(`   ✅ Statement ${i + 1}/${statements.length} ejecutado`);
                }
            }
        } catch (error) {
            failCount++;
        }
    }

    if (successCount > 0) {
        console.log(`   ✅ ${successCount} statements ejecutados exitosamente`);
    }
    if (failCount > 0 && successCount === 0) {
        return false;
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
        console.log('\n📝 Credenciales:');
        console.log('   Email: carlos.cedeno@agenticdream.com');
        console.log('   Password: Miranda*14\n');
        return true;
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'PGRST205') {
            console.log('   Las tablas no existen aún.\n');
        }
        return false;
    }
}

async function main() {
    console.log('🚀 Configuración automática completa de autenticación...\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Verificar función exec_sql
    console.log('📋 Verificando función exec_sql...');
    try {
        const { data, error } = await supabaseAdmin.rpc('exec_sql', {
            p_sql: 'SELECT 1'
        });

        if (error && (error.code === '42883' || error.message?.includes('function exec_sql'))) {
            console.log('❌ Función exec_sql no está disponible como RPC.\n');
            console.log('📝 Para habilitar ejecución automática, ejecuta en Supabase SQL Editor:\n');
            console.log('─'.repeat(60));
            const functionSQL = `CREATE OR REPLACE FUNCTION exec_sql(p_sql TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE p_sql;
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql TO anon, authenticated, service_role;`;
            console.log(functionSQL);
            console.log('─'.repeat(60));
            console.log('\n⏸️  Después de crear la función, ejecuta este script nuevamente.\n');
            return;
        } else {
            console.log('✅ Función exec_sql disponible!\n');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
        return;
    }

    // Ejecutar schema
    const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    const schemaOk = await executeSQLViaRPC(schemaSQL, 'Creando tablas de autenticación');
    
    if (!schemaOk) {
        console.log('\n⚠️  No se pudieron crear las tablas automáticamente.\n');
        return;
    }

    // Esperar un momento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verificar que las tablas existen
    try {
        const { data, error } = await supabaseAdmin
            .from('app_users')
            .select('id')
            .limit(1);
        
        if (error && error.code === 'PGRST205') {
            console.log('⚠️  Las tablas aún no están disponibles. Esperando...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    } catch (error) {
        // Continuar
    }

    // Ejecutar funciones
    const functionsPath = join(__dirname, '../docs/supabase/02_auth_functions.sql');
    const functionsSQL = readFileSync(functionsPath, 'utf-8');
    await executeSQLViaRPC(functionsSQL, 'Creando funciones de autenticación');

    // Esperar
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Crear usuario
    const userCreated = await createAdminUser();

    if (userCreated) {
        console.log('\n🎉 ¡Configuración completa exitosa!\n');
    }
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
