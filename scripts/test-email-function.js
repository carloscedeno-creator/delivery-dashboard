/**
 * Script para verificar que la Edge Function send-password-reset-email esté desplegada y funcione
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailFunction() {
  console.log('🧪 Probando Edge Function: send-password-reset-email\n');

  // Test 1: Verificar que la función existe (intentar invocarla)
  console.log('1️⃣ Verificando que la función esté desplegada...');
  try {
    const { data, error } = await supabase.functions.invoke('send-password-reset-email', {
      body: {
        email: 'test@example.com',
        token: 'test_token_123',
        display_name: 'Test User'
      }
    });

    // Si hay data, la función respondió (aunque puede tener error en el body)
    if (data) {
      console.log('\n✅ La función está desplegada y responde');
      console.log('   Respuesta:', JSON.stringify(data, null, 2));
      
      if (data.error) {
        console.log('\n⚠️  La función devolvió un error:');
        console.log('   Error:', data.error);
        
        if (data.error.includes('RESEND_API_KEY') || 
            data.error.includes('environment variable') ||
            data.error.includes('not set')) {
          console.log('\n✅ Diagnóstico: Falta configurar variables de entorno');
          console.log('\n📝 Pasos para configurar:');
          console.log('   1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions');
          console.log('   2. Agrega las variables:');
          console.log('      - RESEND_API_KEY (tu API key de Resend)');
          console.log('      - RESEND_FROM_EMAIL (ej: onboarding@resend.dev)');
          console.log('      - APP_URL (https://carloscedeno-creator.github.io/delivery-dashboard)');
          console.log('   3. Haz clic en "Redeploy" en la función');
        }
        return;
      }
      
      // Si no hay error en data, todo está bien
      console.log('\n🎉 ¡La función funciona correctamente!');
      return;
    }

    if (error) {
      // Si el error es 404, la función no está desplegada
      const errorMsg = error.message || JSON.stringify(error);
      if (error.status === 404 || errorMsg.includes('not found') || errorMsg.includes('404')) {
        console.log('\n❌ La función NO está desplegada');
        console.log('   Error:', errorMsg);
        console.log('\n📝 Pasos para desplegar:');
        console.log('   1. Ve a Supabase Dashboard > Edge Functions');
        console.log('   2. Usa el template "Send Emails"');
        console.log('   3. Nómbrala: send-password-reset-email');
        console.log('   4. Reemplaza el código con el de supabase/functions/send-password-reset-email/index.ts');
        console.log('   5. Haz clic en "Deploy"');
        return;
      }

      // Si el error es "non-2xx", la función está desplegada pero devolvió un error HTTP
      if (errorMsg.includes('non-2xx')) {
        console.log('\n✅ La función está desplegada, pero devolvió un error HTTP');
        console.log('   Esto generalmente significa que falta configurar variables de entorno');
        console.log('\n📝 Pasos para configurar:');
        console.log('   1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions');
        console.log('   2. Agrega las variables:');
        console.log('      - RESEND_API_KEY');
        console.log('      - RESEND_FROM_EMAIL');
        console.log('      - APP_URL');
        console.log('   3. Haz clic en "Redeploy" en la función');
        console.log('\n💡 También puedes revisar los logs de la función en Supabase Dashboard');
        return;
      }

      // Otro tipo de error
      console.log('\n⚠️  Error al invocar la función');
      console.log('   Error:', errorMsg);
      console.log('   Status:', error.status);
      console.log('   Full error:', JSON.stringify(error, null, 2));
      return;
    }

    // Si llegamos aquí sin error ni data, algo raro pasó
    console.log('\n⚠️  Respuesta inesperada (sin error ni data)');

  } catch (err) {
    console.log('\n❌ Error inesperado:', err.message);
    console.log('   Stack:', err.stack);
    return;
  }

  // Test 2: Verificar que el flujo completo funcione (con un email real si se proporciona)
  console.log('\n2️⃣ Verificando flujo completo de password reset...');
  
  const testEmail = process.env.TEST_EMAIL || 'carlos.cedeno@agenticdream.com';
  console.log(`   Usando email de prueba: ${testEmail}`);
  
  try {
    // Primero obtener el token de la función SQL
    const { data: resetData, error: resetError } = await supabase.rpc('request_password_reset', {
      p_email: testEmail
    });

    if (resetError) {
      console.log('⚠️  Error al obtener token de reset:', resetError.message);
      return;
    }

    if (!resetData || resetData.length === 0) {
      console.log('⚠️  No se pudo obtener token (usuario no existe o inactivo)');
      return;
    }

    const { token, display_name } = resetData[0];
    console.log('✅ Token obtenido correctamente');
    console.log(`   Display name: ${display_name}`);

    // Ahora invocar la Edge Function
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-password-reset-email', {
      body: {
        email: testEmail,
        token: token,
        display_name: display_name
      }
    });

    if (emailError) {
      console.log('❌ Error al enviar email:', emailError.message);
      if (emailError.message.includes('RESEND_API_KEY')) {
        console.log('\n⚠️  Necesitas configurar RESEND_API_KEY en Supabase Dashboard');
      }
      return;
    }

    console.log('✅ Email enviado correctamente');
    console.log('   Respuesta:', JSON.stringify(emailData, null, 2));
    console.log('\n🎉 ¡Todo funciona correctamente!');
    console.log(`   Revisa el inbox de ${testEmail} para ver el email de reset`);

  } catch (err) {
    console.log('❌ Error en el flujo completo:', err.message);
  }
}

// Ejecutar tests
testEmailFunction()
  .then(() => {
    console.log('\n✅ Tests completados');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
