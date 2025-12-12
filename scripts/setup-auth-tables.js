/**
 * Script para crear las tablas de autenticación en Supabase
 * Ejecuta el schema SQL directamente
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

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: Supabase URL o Anon Key no configurados');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAuthTables() {
    console.log('🚀 Configurando tablas de autenticación...\n');

    try {
        // Leer el archivo SQL del schema
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const schemaPath = join(__dirname, '../docs/supabase/01_auth_schema.sql');
        
        console.log('📖 Leyendo schema SQL...');
        const schemaSQL = readFileSync(schemaPath, 'utf-8');
        
        // Dividir en statements individuales
        const statements = schemaSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Ejecutando ${statements.length} statements...\n`);

        // Ejecutar cada statement usando rpc o directamente
        // Nota: Supabase no permite ejecutar SQL arbitrario desde el cliente
        // Necesitamos usar el SQL Editor o la API REST directamente
        
        console.log('⚠️  Nota: No se puede ejecutar SQL DDL directamente desde el cliente JavaScript.');
        console.log('📋 Por favor, ejecuta manualmente en Supabase SQL Editor:\n');
        console.log('   1. Abre Supabase Dashboard');
        console.log('   2. Ve a SQL Editor');
        console.log('   3. Ejecuta: docs/supabase/01_auth_schema.sql');
        console.log('   4. Ejecuta: docs/supabase/02_auth_functions.sql');
        console.log('   5. Luego ejecuta: node scripts/create-admin-carlos.js\n');
        
        // Intentar verificar si las tablas ya existen
        const { data: tables, error: tablesError } = await supabase
            .from('app_users')
            .select('id')
            .limit(1);

        if (!tablesError) {
            console.log('✅ Las tablas ya existen! Continuando con creación de usuario...\n');
            return true;
        } else {
            console.log('❌ Las tablas no existen. Por favor ejecuta los scripts SQL primero.\n');
            return false;
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        return false;
    }
}

// Ejecutar
setupAuthTables();
