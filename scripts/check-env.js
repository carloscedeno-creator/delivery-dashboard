#!/usr/bin/env node

/**
 * Script para verificar la configuración de variables de entorno
 * Ejecutar: node scripts/check-env.js
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const envPath = join(rootDir, '.env');
const envTemplatePath = join(rootDir, 'ENV_TEMPLATE.txt');

console.log('🔍 Verificando configuración de variables de entorno...\n');

// Verificar si existe .env
if (!existsSync(envPath)) {
  console.log('❌ Archivo .env NO encontrado');
  console.log(`   Ubicación esperada: ${envPath}\n`);
  
  if (existsSync(envTemplatePath)) {
    console.log('📋 Template encontrado en ENV_TEMPLATE.txt');
    console.log('   Pasos para crear .env:');
    console.log('   1. Copia ENV_TEMPLATE.txt a .env');
    console.log('   2. Reemplaza "tu_anon_key_aqui" con tu anon key real');
    console.log('   3. Obtén el anon key de: Supabase Dashboard > Settings > API > anon public key\n');
  }
  
  process.exit(1);
}

// Leer .env
let envContent;
try {
  envContent = readFileSync(envPath, 'utf-8');
} catch (error) {
  console.log(`❌ Error leyendo .env: ${error.message}`);
  process.exit(1);
}

// Verificar variables requeridas
const requiredVars = {
  'VITE_SUPABASE_URL': 'https://sywkskwkexwwdzrbwinp.supabase.co',
  'VITE_SUPABASE_ANON_KEY': null // Debe estar configurado pero no tiene valor por defecto
};

let allOk = true;
const envVars = {};

// Parsear .env
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

console.log('📝 Variables encontradas en .env:\n');

// Verificar cada variable
for (const [varName, defaultValue] of Object.entries(requiredVars)) {
  const value = envVars[varName];
  
  if (!value || value === '' || value === 'tu_anon_key_aqui') {
    console.log(`❌ ${varName}: NO configurada o valor inválido`);
    if (varName === 'VITE_SUPABASE_ANON_KEY') {
      console.log('   ⚠️  Debes obtener el anon key de Supabase Dashboard');
      console.log('   📍 Supabase Dashboard > Settings > API > anon public key\n');
    }
    allOk = false;
  } else {
    const displayValue = varName.includes('KEY') 
      ? `${value.substring(0, 20)}...${value.substring(value.length - 10)}` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
}

console.log('\n' + '='.repeat(60) + '\n');

if (allOk) {
  console.log('✅ Todas las variables están configuradas correctamente');
  console.log('   Puedes ejecutar: npm run build && npm run deploy\n');
  process.exit(0);
} else {
  console.log('❌ Faltan variables de entorno');
  console.log('   Configura el archivo .env antes de hacer deploy\n');
  process.exit(1);
}

