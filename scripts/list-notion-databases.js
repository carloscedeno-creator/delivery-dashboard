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
    console.log('📊 Listing All Accessible Notion Databases');
    console.log('='.repeat(60));
    console.log('');

    const url = `${NOTION_PROXY_URL}?action=listDatabases`;
    
    // Incluir header de autorización si está disponible
    const headers = {};
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (supabaseAnonKey) {
      headers['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify({})
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
      throw new Error(`Error: ${errorMessage}`);
    }

    const data = await response.json();
    const databases = data.results || [];

    console.log(`✅ Found ${databases.length} accessible database(s)\n`);

    if (databases.length === 0) {
      console.log('⚠️  No databases found. Check:');
      console.log('   - NOTION_API_TOKEN is configured correctly');
      console.log('   - Integration has access to databases');
      console.log('   - Databases are shared with the integration');
      return;
    }

    // Mostrar información de cada base de datos
    databases.forEach((db, index) => {
      console.log(`\n📊 Database ${index + 1}:`);
      console.log('-'.repeat(60));
      console.log(`ID: ${db.id}`);
      
      // Extraer título de la base de datos
      const title = db.title?.[0]?.plain_text || 
                    db.title?.[0]?.text?.content || 
                    'Untitled';
      console.log(`Title: ${title}`);
      
      console.log(`URL: ${db.url || 'N/A'}`);
      console.log(`Created: ${db.created_time || 'N/A'}`);
      console.log(`Last Edited: ${db.last_edited_time || 'N/A'}`);
      
      // Mostrar propiedades si están disponibles
      if (db.properties) {
        const propNames = Object.keys(db.properties);
        console.log(`Properties: ${propNames.length} properties`);
        if (propNames.length > 0) {
          console.log(`   ${propNames.slice(0, 5).join(', ')}${propNames.length > 5 ? '...' : ''}`);
        }
      }
    });

    // Resumen
    console.log('\n\n📋 Summary');
    console.log('='.repeat(60));
    console.log(`Total databases: ${databases.length}`);
    console.log('\n💡 To search in a specific database, use:');
    console.log('   node scripts/test-notion-search.js "Initiative Name" --database-id DATABASE_ID');
    console.log('\n💡 To search in ALL databases (default), use:');
    console.log('   node scripts/test-notion-search.js "Initiative Name"');

  } catch (error) {
    console.error('\n❌ Error listing databases:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check NOTION_API_TOKEN is configured in Supabase secrets');
    console.error('2. Verify Edge Function is deployed');
    console.error('3. Check integration has access to databases');
    process.exit(1);
  }
}

// Ejecutar
listDatabases()
  .then(() => {
    console.log('\n✅ Listing completed\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
