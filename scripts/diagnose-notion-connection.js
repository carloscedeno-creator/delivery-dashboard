/**
 * Script de diagnóstico para verificar la conexión con Notion
 */

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Para Edge Functions, usar anon key está bien (solo lectura)
// Para scripts de sincronización, usar service_role key (lectura + escritura)
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 
  (SUPABASE_URL 
    ? `${SUPABASE_URL}/functions/v1/notion-proxy`
    : 'https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy');

async function diagnose() {
  console.log('🔍 Diagnosing Notion Connection');
  console.log('='.repeat(60));
  console.log('');

  // Test 1: Verificar que la Edge Function responde
  console.log('1️⃣ Testing Edge Function availability...');
  try {
    // Probar primero con POST y body JSON
    let testResponse = await fetch(NOTION_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        action: 'searchPages',
        initiativeName: 'Test'
      })
    });
    
    // Si falla, probar con GET y query params
    if (!testResponse.ok) {
      const url = new URL(NOTION_PROXY_URL);
      url.searchParams.set('action', 'searchPages');
      url.searchParams.set('initiativeName', 'Test');
      
      testResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
    }

    const testText = await testResponse.text();
    console.log(`   Status: ${testResponse.status}`);
    console.log(`   Response: ${testText.substring(0, 200)}${testText.length > 200 ? '...' : ''}`);

    if (testResponse.status === 500) {
      try {
        const error = JSON.parse(testText);
        if (error.error === 'NOTION_API_TOKEN not configured') {
          console.log('\n   ⚠️  NOTION_API_TOKEN not configured in Supabase secrets');
          console.log('   💡 Go to: Supabase Dashboard > Settings > Edge Functions > Secrets');
          console.log('   💡 Add secret: NOTION_API_TOKEN = your-token');
          return;
        }
      } catch (e) {
        // Not JSON
      }
    }

    if (testResponse.status === 401 || testText.includes('Unauthorized')) {
      console.log('\n   ⚠️  Unauthorized error');
      console.log('   Possible causes:');
      console.log('   1. NOTION_API_TOKEN is incorrect');
      console.log('   2. Integration does not have proper permissions');
      console.log('   3. Token has expired');
      console.log('\n   💡 Check:');
      console.log('   - Verify token in Supabase secrets matches Notion integration token');
      console.log('   - Verify integration has access to databases in Notion');
      return;
    }

    if (testResponse.ok) {
      try {
        const data = JSON.parse(testText);
        console.log(`   ✅ Success! Edge Function is working`);
        console.log(`   Found ${data.results?.length || 0} pages for "Test"`);
        if (data.results && data.results.length > 0) {
          console.log(`   Sample page: ${data.results[0].properties?.Name?.title?.[0]?.plain_text || 'Unknown'}`);
        }
        return;
      } catch (e) {
        console.log(`   ⚠️  Response is not valid JSON`);
      }
    }

  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }

  console.log('\n✅ Diagnosis completed\n');
}

diagnose().catch(console.error);
