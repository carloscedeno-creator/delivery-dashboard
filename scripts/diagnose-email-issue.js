/**
 * Script de diagnóstico completo para el sistema de password reset
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = process.env.TEST_EMAIL || 'carlos.cedeno@agenticdream.com';

async function diagnoseEmailIssue() {
  console.log('🔍 Diagnóstico Completo del Sistema de Password Reset\n');
  console.log('='.repeat(60));

  // Test 1: Verificar que el usuario existe
  console.log('\n1️⃣ Verificando que el usuario existe...');
  try {
    const { data: userData, error: userError } = await supabase
      .from('app_users')
      .select('id, email, display_name, is_active')
      .eq('email', testEmail)
      .single();

    if (userError || !userData) {
      console.log('❌ Usuario no encontrado o error:', userError?.message);
      console.log('   Asegúrate de que el usuario esté creado y activo');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log(`   Email: ${userData.email}`);
    console.log(`   Display Name: ${userData.display_name}`);
    console.log(`   Activo: ${userData.is_active ? 'Sí' : 'No'}`);

    if (!userData.is_active) {
      console.log('⚠️  El usuario está inactivo. Necesita aprobación del admin.');
      return;
    }
  } catch (err) {
    console.log('❌ Error verificando usuario:', err.message);
    return;
  }

  // Test 2: Probar la función SQL request_password_reset
  console.log('\n2️⃣ Probando función SQL request_password_reset...');
  try {
    const { data: resetData, error: resetError } = await supabase.rpc('request_password_reset', {
      p_email: testEmail
    });

    if (resetError) {
      console.log('❌ Error en request_password_reset:', resetError.message);
      return;
    }

    if (!resetData || resetData.length === 0) {
      console.log('⚠️  No se generó token (usuario no existe o inactivo)');
      return;
    }

    const { token, display_name } = resetData[0];
    console.log('✅ Token generado correctamente');
    if (token) {
      console.log(`   Token: ${token.substring(0, 30)}...`);
    } else {
      console.log('   ⚠️  Token es null o undefined');
    }
    console.log(`   Display Name: ${display_name || 'N/A'}`);

    // Test 3: Probar la Edge Function
    console.log('\n3️⃣ Probando Edge Function send-password-reset-email...');
    try {
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-password-reset-email', {
        body: {
          email: testEmail,
          token: token,
          display_name: display_name
        }
      });

      if (emailError) {
        console.log('❌ Error al invocar Edge Function:');
        console.log('   Tipo:', emailError.name);
        console.log('   Mensaje:', emailError.message);
        console.log('   Status:', emailError.status);
        
        if (emailError.message && emailError.message.includes('non-2xx')) {
          console.log('\n⚠️  La función está desplegada pero devuelve error HTTP');
          console.log('   Esto generalmente significa:');
          console.log('   1. Las variables de entorno no están configuradas');
          console.log('   2. O no se hizo redeploy después de agregar las variables');
          console.log('\n📝 Pasos:');
          console.log('   1. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/settings/functions');
          console.log('   2. Verifica que existan: RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL');
          console.log('   3. Ve a: https://supabase.com/dashboard/project/sywkskwkexwwdzrbwinp/functions');
          console.log('   4. Haz clic en send-password-reset-email > Redeploy');
        }
        return;
      }

      if (emailData) {
        if (emailData.error) {
          console.log('⚠️  La función devolvió un error:');
          console.log('   Error:', emailData.error);
          
          if (emailData.error.includes('RESEND_API_KEY')) {
            console.log('\n📝 Solución: Configura RESEND_API_KEY en Supabase Dashboard');
          }
          return;
        }

        console.log('✅ Email enviado correctamente!');
        console.log('   Respuesta:', JSON.stringify(emailData, null, 2));
        console.log(`\n🎉 ¡Todo funciona! Revisa el inbox de ${testEmail}`);
        return;
      }

      console.log('⚠️  Respuesta inesperada de la función');
    } catch (funcError) {
      console.log('❌ Error inesperado al invocar función:', funcError.message);
    }
  } catch (err) {
    console.log('❌ Error en el flujo completo:', err.message);
  }
}

diagnoseEmailIssue()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Diagnóstico completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
