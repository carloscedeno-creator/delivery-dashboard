/**
 * Script para crear tablas usando Supabase Management API
 * Usa el service_role key para ejecutar SQL
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const serviceRoleKey = 'sb_secret_vSxKZgCYSWtqkJluJpYUvQ_tJOMsgy2';

// Extraer project reference de la URL
const projectRef = supabaseUrl.split('//')[1].split('.')[0];

async function executeSQLViaManagementAPI(sql) {
    console.log('📝 Ejecutando SQL via Management API...\n');
    
    try {
        // Supabase Management API endpoint
        // Necesitamos usar el endpoint correcto del Management API
        const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
        
        const response = await fetch(managementApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            },
            body: JSON.stringify({
                query: sql
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ SQL ejecutado exitosamente');
            return true;
        } else {
            const errorText = await response.text();
            console.log('⚠️  Management API no disponible o requiere autenticación diferente');
            console.log(`   Error: ${response.status} - ${errorText}`);
            return false;
        }
    } catch (error) {
        console.log('⚠️  Error con Management API:', error.message);
        return false;
    }
}

async function main() {
    console.log('🚀 Creando tablas de autenticación...\n');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // Leer scripts SQL
    const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf-8');

    // Intentar ejecutar
    const success = await executeSQLViaManagementAPI(schemaSQL);

    if (!success) {
        console.log('\n📋 Como el Management API no está disponible:');
        console.log('   Por favor ejecuta manualmente en Supabase SQL Editor:\n');
        console.log('─'.repeat(60));
        console.log(schemaSQL);
        console.log('─'.repeat(60));
        console.log('\n   Después ejecuta: node scripts/create-admin-carlos.js\n');
    } else {
        console.log('\n✅ Tablas creadas! Ahora creando usuario...\n');
        // Ejecutar script para crear usuario
        const { exec } = await import('child_process');
        exec('node scripts/create-admin-carlos.js', (error, stdout, stderr) => {
            if (error) {
                console.error('Error:', error);
                return;
            }
            console.log(stdout);
        });
    }
}

main().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
