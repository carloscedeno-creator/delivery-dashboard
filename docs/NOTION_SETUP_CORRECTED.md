# 📊 Setup Correcto para Acceso a Notion

## 🔍 Situación Actual

El código está configurado para usar un proxy (`https://sheets-proxy.carlos-cedeno.workers.dev/notion`), pero **este proxy no existe o no está configurado**.

## ✅ Solución: Supabase Edge Function como Proxy

Ya que estás usando **Supabase**, la mejor solución es crear una **Supabase Edge Function** que actúe como proxy para Notion, manteniendo las credenciales seguras en el backend.

## 🚀 Opción 1: Supabase Edge Function (Recomendado)

### Ventajas:
- ✅ Ya tienes Supabase configurado
- ✅ Las credenciales se mantienen en el backend (secrets)
- ✅ No necesitas servicios externos
- ✅ Integración directa con tu base de datos

### Pasos:

1. **Crear Edge Function en Supabase:**
   - Ir a Supabase Dashboard > Edge Functions
   - Crear nueva función: `notion-proxy`

2. **Código de la Edge Function:**
   ```typescript
   // supabase/functions/notion-proxy/index.ts
   import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
   import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

   const NOTION_API_TOKEN = Deno.env.get('NOTION_API_TOKEN')
   const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID')

   serve(async (req) => {
     // CORS
     if (req.method === 'OPTIONS') {
       return new Response(null, { status: 204 })
     }

     const url = new URL(req.url)
     const action = url.searchParams.get('action')

     if (!NOTION_API_TOKEN || !NOTION_DATABASE_ID) {
       return new Response(
         JSON.stringify({ error: 'Notion credentials not configured' }),
         { status: 500, headers: { 'Content-Type': 'application/json' } }
       )
     }

     try {
       let notionUrl = ''
       let response

       switch (action) {
         case 'getDatabasePages':
           notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`
           const filter = req.method === 'POST' ? await req.json() : null
           response = await fetch(notionUrl, {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${NOTION_API_TOKEN}`,
               'Notion-Version': '2022-06-28',
               'Content-Type': 'application/json'
             },
             body: filter ? JSON.stringify({ filter }) : JSON.stringify({})
           })
           break

         case 'searchPages':
           const initiativeName = url.searchParams.get('initiativeName')
           notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`
           const searchFilter = {
             property: 'Initiative', // Ajustar según tu base de datos
             title: {
               contains: initiativeName
             }
           }
           response = await fetch(notionUrl, {
             method: 'POST',
             headers: {
               'Authorization': `Bearer ${NOTION_API_TOKEN}`,
               'Notion-Version': '2022-06-28',
               'Content-Type': 'application/json'
             },
             body: JSON.stringify({ filter: searchFilter })
           })
           break

         case 'getPageBlocks':
           const pageId = url.searchParams.get('pageId')
           if (!pageId) {
             return new Response(
               JSON.stringify({ error: 'Missing pageId parameter' }),
               { status: 400, headers: { 'Content-Type': 'application/json' } }
             )
           }
           // Obtener bloques con paginación
           const allBlocks = []
           let startCursor = null
           let hasMore = true

           while (hasMore) {
             notionUrl = `https://api.notion.com/v1/blocks/${pageId}/children`
             if (startCursor) {
               notionUrl += `?start_cursor=${startCursor}`
             }
             
             const blockResponse = await fetch(notionUrl, {
               method: 'GET',
               headers: {
                 'Authorization': `Bearer ${NOTION_API_TOKEN}`,
                 'Notion-Version': '2022-06-28'
               }
             })

             if (!blockResponse.ok) {
               throw new Error(`Notion API error: ${blockResponse.statusText}`)
             }

             const blockData = await blockResponse.json()
             allBlocks.push(...(blockData.results || []))

             hasMore = blockData.has_more || false
             startCursor = blockData.next_cursor || null
           }

           return new Response(
             JSON.stringify({ results: allBlocks }),
             {
               status: 200,
               headers: {
                 'Content-Type': 'application/json',
                 'Access-Control-Allow-Origin': '*'
               }
             }
           )

         default:
           return new Response(
             JSON.stringify({ error: 'Invalid action' }),
             { status: 400, headers: { 'Content-Type': 'application/json' } }
           )
       }

       if (!response.ok) {
         throw new Error(`Notion API error: ${response.statusText}`)
       }

       const data = await response.json()

       return new Response(
         JSON.stringify(data),
         {
           status: 200,
           headers: {
             'Content-Type': 'application/json',
             'Access-Control-Allow-Origin': '*'
           }
         }
       )
     } catch (error) {
       return new Response(
         JSON.stringify({ error: error.message }),
         {
           status: 500,
           headers: {
             'Content-Type': 'application/json',
             'Access-Control-Allow-Origin': '*'
           }
         }
       )
     }
   })
   ```

3. **Configurar Secrets en Supabase:**
   - Ir a Supabase Dashboard > Edge Functions > Settings > Secrets
   - Agregar:
     - `NOTION_API_TOKEN` - Tu token de API de Notion
     - `NOTION_DATABASE_ID` - ID de tu base de datos de Notion

4. **Desplegar la función:**
   ```bash
   supabase functions deploy notion-proxy
   ```

5. **Actualizar configuración:**
   ```javascript
   // src/config/notionConfig.js
   proxyUrl: process.env.VITE_SUPABASE_URL + '/functions/v1/notion-proxy'
   ```

## 🚀 Opción 2: Llamar Directamente desde el Frontend (No Recomendado)

**⚠️ NO recomendado** porque expone el token de API en el frontend, pero es la opción más rápida para testing:

```javascript
// Solo para desarrollo/testing
const response = await fetch('https://api.notion.com/v1/databases/DATABASE_ID/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_API_TOKEN}`, // ⚠️ Expone el token
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
})
```

## 📝 Próximos Pasos

1. **Elegir opción** (recomendado: Supabase Edge Function)
2. **Configurar acceso a Notion:**
   - Crear integración en Notion: https://www.notion.so/my-integrations
   - Obtener Internal Integration Token
   - Compartir base de datos con la integración
   - Obtener Database ID de la URL
3. **Implementar proxy elegido**
4. **Actualizar configuración en el código**
5. **Probar acceso a Notion**

## 🔍 Verificar Configuración

Una vez configurado, probar con:
```bash
node scripts/test-notion-worker.js
```

Pero actualizando la URL para usar tu Supabase Edge Function en lugar del Cloudflare Worker.
