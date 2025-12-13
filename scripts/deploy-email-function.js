/**
 * Script para desplegar la Edge Function de envío de emails
 * Requiere: supabase CLI instalado y autenticado
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const functionPath = join(process.cwd(), 'supabase', 'functions', 'send-password-reset-email');

console.log('📧 Desplegando Edge Function para envío de emails...\n');

// Verificar que existe la función
if (!existsSync(functionPath)) {
    console.error('❌ Error: No se encontró la función en:', functionPath);
    console.error('   Asegúrate de que el archivo existe antes de desplegar.');
    process.exit(1);
}

try {
    // Verificar que supabase CLI está instalado
    try {
        execSync('supabase --version', { stdio: 'ignore' });
    } catch (error) {
        console.error('❌ Error: Supabase CLI no está instalado');
        console.error('   Instala con: npm install -g supabase');
        process.exit(1);
    }

    // Desplegar la función
    console.log('🚀 Desplegando función send-password-reset-email...');
    execSync('supabase functions deploy send-password-reset-email', {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    console.log('\n✅ Función desplegada exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Configura las variables de entorno en Supabase Dashboard:');
    console.log('      - RESEND_API_KEY');
    console.log('      - RESEND_FROM_EMAIL');
    console.log('      - APP_URL');
    console.log('   2. Ejecuta el SQL: docs/supabase/06_update_request_password_reset.sql');
    console.log('   3. Prueba la funcionalidad desde la aplicación\n');

} catch (error) {
    console.error('❌ Error al desplegar:', error.message);
    console.error('\n💡 Asegúrate de:');
    console.error('   - Estar autenticado: supabase login');
    console.error('   - Tener el proyecto vinculado: supabase link --project-ref sywkskwkexwwdzrbwinp');
    process.exit(1);
}
