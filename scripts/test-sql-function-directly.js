/**
 * Script para probar directamente la función SQL request_password_reset
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sywkskwkexwwdzrbwinp.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5d2tza3drZXh3d2R6cmJ3aW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTk1OTksImV4cCI6MjA4MTAzNTU5OX0.bv147P9N53qjlt22SJKFMsI3R-Rce179Kev_V_UPMy0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testEmail = process.env.TEST_EMAIL || 'carlos.cedeno@agenticdream.com';

async function testSQLFunction() {
  console.log('🔍 Probando función SQL request_password_reset directamente\n');
  console.log('='.repeat(60));

  try {
    console.log(`Email de prueba: ${testEmail}\n`);

    // Llamar a la función
    const { data, error } = await supabase.rpc('request_password_reset', {
      p_email: testEmail
    });

    console.log('📊 Resultado completo:');
    console.log('   Data:', JSON.stringify(data, null, 2));
    console.log('   Error:', error ? JSON.stringify(error, null, 2) : 'null');
    console.log('   Tipo de data:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('   Longitud:', Array.isArray(data) ? data.length : 'N/A');

    if (error) {
      console.log('\n❌ Error en la función SQL:');
      console.log('   Mensaje:', error.message);
      console.log('   Detalles:', error.details);
      console.log('   Hint:', error.hint);
      return;
    }

    if (!data) {
      console.log('\n⚠️  Data es null o undefined');
      console.log('   Esto puede significar que la función no retornó nada');
      return;
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        console.log('\n⚠️  Array vacío');
        console.log('   Esto puede significar:');
        console.log('   1. El usuario no existe');
        console.log('   2. El usuario está inactivo');
        console.log('   3. La función no está retornando correctamente');
      } else {
        console.log('\n✅ Array con datos:');
        data.forEach((item, index) => {
          console.log(`   Item ${index}:`, JSON.stringify(item, null, 2));
          if (item.token) {
            console.log(`   ✅ Token encontrado: ${item.token.substring(0, 30)}...`);
          } else {
            console.log(`   ⚠️  Token es null o undefined`);
          }
          if (item.display_name) {
            console.log(`   ✅ Display Name: ${item.display_name}`);
          } else {
            console.log(`   ⚠️  Display Name es null o undefined`);
          }
        });
      }
    } else {
      console.log('\n⚠️  Data no es un array');
      console.log('   Tipo:', typeof data);
      console.log('   Valor:', data);
    }

  } catch (err) {
    console.log('\n❌ Error inesperado:', err.message);
    console.log('   Stack:', err.stack);
  }
}

testSQLFunction()
  .then(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
