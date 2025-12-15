/**
 * Script para listar todas las bases de datos de Notion accesibles
 */

import dotenv from 'dotenv';
dotenv.config();

// Usar Supabase Edge Function
const NOTION_PROXY_URL = process.env.VITE_NOTION_PROXY_URL || 
  (process.env.VITE_SUPABASE_URL 
    ? `${process.env.VITE_SUPABASE_URL}/functions/v1/notion-proxy`
    : 'https://sywkskwkexwwdzrbwinp.supabase.co/functions/v1/notion-proxy');

async function listDatabases() {
  try {
    console.log('📊 Listing accessible Notion databases...');
    console.log('='.repeat(60));
    console.log('');

    const url = `${NOTION_PROXY_URL}?action=listDatabases`;
    
    // Incluir header de autorización si está disponible
    const headers = {
      'Content-Type': 'application/json'
    };
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseAnonKey) {
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const error = JSON.parse(errorText);
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const databases = data.results || [];

    console.log(`✅ Found ${databases.length} accessible database(s)\n`);

    if (databases.length === 0) {
      console.log('⚠️  No databases found. Check:');
      console.log('   - Integration has access to databases');
      console.log('   - NOTION_API_TOKEN is correct');
      return;
    }

    databases.forEach((db, index) => {
      console.log(`${index + 1}. ${db.title?.[0]?.plain_text || 'Untitled'}`);
      console.log(`   ID: ${db.id}`);
      console.log(`   URL: ${db.url || 'N/A'}`);
      console.log(`   Created: ${db.created_time}`);
      console.log(`   Last Edited: ${db.last_edited_time}`);
      console.log('');
    });

    console.log('💡 Tip:');
    console.log('   You can use these database IDs in NOTION_DATABASE_ID secret');
    console.log('   Or leave it empty to search in all databases automatically\n');

  } catch (error) {
    console.error('❌ Error listing databases:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check NOTION_API_TOKEN is configured in Supabase secrets');
    console.error('2. Verify Edge Function is deployed');
    console.error('3. Check integration has access to databases');
    process.exit(1);
  }
}

listDatabases()
  .then(() => {
    console.log('✅ Listing completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
