/**
 * Script simple para probar el Cloudflare Worker de Notion
 */

const NOTION_PROXY_URL = 'https://sheets-proxy.carlos-cedeno.workers.dev/notion';

async function testWorker() {
  console.log('🧪 Testing Notion Worker');
  console.log('='.repeat(60));
  
  // Test 1: getDatabasePages
  console.log('\n1️⃣ Testing getDatabasePages...');
  try {
    const url1 = `${NOTION_PROXY_URL}?action=getDatabasePages`;
    console.log(`   URL: ${url1}`);
    const response1 = await fetch(url1, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const text1 = await response1.text();
    console.log(`   Status: ${response1.status}`);
    console.log(`   Response (first 200 chars): ${text1.substring(0, 200)}`);
    
    if (response1.ok) {
      try {
        const data1 = JSON.parse(text1);
        console.log(`   ✅ Success! Found ${data1.results?.length || 0} pages`);
      } catch (e) {
        console.log(`   ⚠️  Response is not JSON: ${e.message}`);
      }
    } else {
      console.log(`   ❌ Error: ${text1}`);
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Test 2: searchPages
  console.log('\n2️⃣ Testing searchPages...');
  try {
    const url2 = `${NOTION_PROXY_URL}?action=searchPages&initiativeName=Strata`;
    console.log(`   URL: ${url2}`);
    const response2 = await fetch(url2);
    
    const text2 = await response2.text();
    console.log(`   Status: ${response2.status}`);
    console.log(`   Response (first 200 chars): ${text2.substring(0, 200)}`);
    
    if (response2.ok) {
      try {
        const data2 = JSON.parse(text2);
        console.log(`   ✅ Success! Found ${data2.results?.length || 0} pages`);
      } catch (e) {
        console.log(`   ⚠️  Response is not JSON: ${e.message}`);
      }
    } else {
      console.log(`   ❌ Error: ${text2}`);
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  console.log('\n✅ Tests completed\n');
}

testWorker().catch(console.error);
