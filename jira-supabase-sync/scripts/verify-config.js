/**
 * Script para verificar la configuración del sincronizador
 * Verifica que todas las variables de entorno y configuración estén correctas
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde múltiples ubicaciones posibles ANTES de importar config
const envPaths = [
  join(__dirname, '..', '.env'),  // jira-supabase-sync/.env
  join(__dirname, '..', '..', '.env'),  // delivery-dashboard/.env
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
    console.log(`📄 Cargando .env desde: ${envPath}`);
    envLoaded = true;
  }
}

if (!envLoaded) {
  console.log('⚠️ No se encontró archivo .env, usando variables de entorno del sistema');
}

console.log('\n🔍 Verificando configuración del sincronizador...\n');
console.log('='.repeat(60));

// 1. Verificar variables de entorno básicas
console.log('\n📋 1. Variables de Entorno Básicas:');
console.log('-'.repeat(60));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectsConfig = process.env.PROJECTS_CONFIG;

let envErrors = [];

if (!supabaseUrl) {
  envErrors.push('❌ SUPABASE_URL: NO CONFIGURADO');
} else {
  console.log(`✅ SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
}

if (!supabaseKey) {
  envErrors.push('❌ SUPABASE_SERVICE_ROLE_KEY: NO CONFIGURADO');
} else {
  const masked = supabaseKey.length > 20 ? `${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 5)}` : '***';
  console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${masked}`);
}

// 2. Verificar configuración de proyectos
console.log('\n📦 2. Configuración de Proyectos:');
console.log('-'.repeat(60));

if (projectsConfig) {
  try {
    const projects = JSON.parse(projectsConfig);
    console.log(`✅ PROJECTS_CONFIG encontrado: ${projects.length} proyecto(s) configurado(s)`);
    
    projects.forEach((project, index) => {
      console.log(`\n   Proyecto ${index + 1}:`);
      console.log(`   - Key: ${project.projectKey || '❌ FALTA'}`);
      console.log(`   - Nombre: ${project.projectName || 'N/A'}`);
      console.log(`   - Dominio: ${project.jiraDomain || '❌ FALTA'}`);
      console.log(`   - Email: ${project.jiraEmail || '❌ FALTA'}`);
      
      if (!project.jiraApiToken) {
        envErrors.push(`❌ Proyecto ${index + 1} (${project.projectKey}): falta jiraApiToken`);
        console.log(`   - Token: ❌ NO CONFIGURADO`);
      } else {
        const tokenMasked = `${project.jiraApiToken.substring(0, 10)}...${project.jiraApiToken.substring(project.jiraApiToken.length - 5)}`;
        console.log(`   - Token: ✅ ${tokenMasked}`);
      }
      
      // Validar campos requeridos
      if (!project.projectKey) envErrors.push(`❌ Proyecto ${index + 1}: falta projectKey`);
      if (!project.jiraDomain) envErrors.push(`❌ Proyecto ${index + 1}: falta jiraDomain`);
      if (!project.jiraEmail) envErrors.push(`❌ Proyecto ${index + 1}: falta jiraEmail`);
    });
  } catch (error) {
    console.log(`❌ Error parseando PROJECTS_CONFIG: ${error.message}`);
    envErrors.push('Error parseando PROJECTS_CONFIG');
  }
} else {
  console.log('⚠️ PROJECTS_CONFIG no encontrado, usando configuración por defecto');
  console.log('💡 Para usar múltiples proyectos, configura el secret PROJECTS_CONFIG en GitHub');
  
  // Verificar variables legacy
  const jiraToken = process.env.JIRA_API_TOKEN || process.env.ADT_JIRA_API_TOKEN;
  if (!jiraToken) {
    envErrors.push('❌ JIRA_API_TOKEN: NO CONFIGURADO (necesario si no usas PROJECTS_CONFIG)');
  } else {
    const masked = jiraToken.length > 20 ? `${jiraToken.substring(0, 10)}...${jiraToken.substring(jiraToken.length - 5)}` : '***';
    console.log(`✅ JIRA_API_TOKEN: ${masked}`);
  }
}

// 3. Verificar conexión a Supabase
console.log('\n🔌 3. Conexión a Supabase:');
console.log('-'.repeat(60));

if (supabaseUrl && supabaseKey) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('squads')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error conectando a Supabase: ${error.message}`);
      envErrors.push('Error de conexión a Supabase');
    } else {
      console.log('✅ Conexión a Supabase: OK');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    envErrors.push('Error de conexión a Supabase');
  }
} else {
  console.log('⚠️ No se puede verificar conexión (faltan credenciales)');
}

// 4. Verificar conexión a Jira (solo si hay PROJECTS_CONFIG)
if (projectsConfig) {
  console.log('\n🌐 4. Conexión a Jira:');
  console.log('-'.repeat(60));
  
  try {
    const { createJiraClients } = await import('../src/clients/jira-client-factory.js');
    const { projects } = await import('../src/config/projects.js');
    const jiraClients = createJiraClients(projects);
    
    for (const project of projects) {
      const client = jiraClients.get(project.projectKey);
      if (!client) {
        console.log(`❌ ${project.projectKey}: No se pudo crear cliente`);
        envErrors.push(`Error creando cliente para ${project.projectKey}`);
        continue;
      }
      
      try {
        const jqlQuery = `project = "${project.projectKey.toUpperCase()}" ORDER BY created DESC`;
        const issues = await client.fetchAllIssues(jqlQuery);
        console.log(`✅ ${project.projectKey} (${project.jiraDomain}): OK - ${issues.length} issues encontrados`);
      } catch (error) {
        console.log(`❌ ${project.projectKey} (${project.jiraDomain}): ${error.message}`);
        envErrors.push(`Error conectando a Jira para ${project.projectKey}`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    envErrors.push('Error verificando conexiones a Jira');
  }
} else {
  console.log('\n🌐 4. Conexión a Jira:');
  console.log('-'.repeat(60));
  console.log('⚠️ No se puede verificar (PROJECTS_CONFIG no configurado)');
}

// Resumen final
console.log('\n' + '='.repeat(60));
if (envErrors.length === 0) {
  console.log('✅ ¡Configuración verificada correctamente!');
  console.log('✅ Todo está listo para sincronizar.');
  process.exit(0);
} else {
  console.log('❌ Se encontraron errores en la configuración:');
  envErrors.forEach(err => console.log(`   - ${err}`));
  console.log('\n💡 Revisa la configuración y vuelve a intentar.');
  process.exit(1);
}




