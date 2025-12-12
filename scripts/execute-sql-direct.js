/**
 * Script para ejecutar SQL directamente en Supabase usando Management API
 * Requiere SUPABASE_SERVICE_ROLE_KEY en .env
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurado en .env');
    console.error('   Para ejecutar SQL DDL necesitas el service_role key de Supabase');
    console.error('   Puedes encontrarlo en: Supabase Dashboard > Settings > API > service_role key\n');
    process.exit(1);
}

async function executeSQL(sql, description) {
    console.log(`\n📝 ${description}...`);
    
    try {
        // Usar la API REST de Supabase para ejecutar SQL
        // Nota: Esto requiere el service_role key
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            // Intentar método alternativo usando el endpoint de query
            const response2 = await fetch(`${supabaseUrl}/rest/v1/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceRoleKey,
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Prefer': 'return=representation'
                },
                body: sql
            });

            if (!response2.ok) {
                const errorText = await response2.text();
                throw new Error(`HTTP ${response2.status}: ${errorText}`);
            }
        }

        console.log(`✅ ${description} completado`);
        return true;
    } catch (error) {
        console.error(`❌ Error ejecutando ${description}:`, error.message);
        
        // Si falla, mostrar el SQL para ejecución manual
        console.log(`\n📄 Por favor ejecuta manualmente en Supabase SQL Editor:\n`);
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
        return false;
    }
}

async function main() {
    console.log('🚀 Ejecutando scripts SQL en Supabase...\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Leer scripts SQL
    const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
    const functionsPath = join(__dirname, '../docs/supabase/02_auth_functions.sql');
    
    const schemaSQL = readFileSync(schemaPath, 'utf-8');
    const functionsSQL = readFileSync(functionsPath, 'utf-8');

    // Ejecutar scripts
    const schemaOk = await executeSQL(schemaSQL, 'Creando tablas de autenticación');
    if (!schemaOk) {
        console.log('\n⚠️  No se pudo ejecutar el schema automáticamente.');
        console.log('   Por favor ejecuta el SQL mostrado arriba en Supabase SQL Editor.\n');
        return;
    }

    const functionsOk = await executeSQL(functionsSQL, 'Creando funciones de autenticación');
    if (!functionsOk) {
        console.log('\n⚠️  No se pudo ejecutar las funciones automáticamente.');
        console.log('   Por favor ejecuta el SQL mostrado arriba en Supabase SQL Editor.\n');
        return;
    }

    console.log('\n✅ Todos los scripts SQL ejecutados exitosamente!');
    console.log('   Ahora puedes ejecutar: node scripts/create-admin-carlos.js\n');
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
