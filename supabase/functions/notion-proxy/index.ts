// Supabase Edge Function para proxy de Notion API
// Maneja las llamadas a la API de Notion de forma segura
// manteniendo las credenciales en el backend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtener token de Notion del secret
    const NOTION_API_TOKEN = Deno.env.get('NOTION_API_TOKEN')
    
    if (!NOTION_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'NOTION_API_TOKEN not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parsear body JSON o query params
    let action: string | null = null
    let initiativeName: string | null = null
    let databaseId: string | null = null

    // Intentar obtener del body JSON primero
    try {
      const body = await req.json()
      action = body.action || null
      initiativeName = body.initiativeName || null
      databaseId = body.databaseId || null
    } catch (e) {
      // Si no hay body JSON, intentar query params
      const url = new URL(req.url)
      action = url.searchParams.get('action')
      initiativeName = url.searchParams.get('initiativeName')
      databaseId = url.searchParams.get('databaseId')
    }

    // Si aún no hay action, intentar de query params de la URL
    if (!action) {
      const url = new URL(req.url)
      action = url.searchParams.get('action')
      initiativeName = initiativeName || url.searchParams.get('initiativeName')
      databaseId = databaseId || url.searchParams.get('databaseId')
    }

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing action parameter. Supported: listDatabases, getDatabasePages, searchPages, getPageBlocks' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const notionHeaders = {
      'Authorization': `Bearer ${NOTION_API_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }

    switch (action) {
      case 'listDatabases':
        const listUrl = 'https://api.notion.com/v1/search'
        const listResponse = await fetch(listUrl, {
          method: 'POST',
          headers: notionHeaders,
          body: JSON.stringify({
            filter: { value: 'database', property: 'object' },
            page_size: 100
          })
        })
        
        if (!listResponse.ok) {
          const errorText = await listResponse.text()
          throw new Error(`Notion API error: ${listResponse.statusText} - ${errorText}`)
        }
        
        const listData = await listResponse.json()
        return new Response(
          JSON.stringify(listData),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      case 'getDatabasePages':
        if (!databaseId) {
          return new Response(
            JSON.stringify({ error: 'Missing databaseId parameter' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        const dbUrl = `https://api.notion.com/v1/databases/${databaseId}/query`
        const dbResponse = await fetch(dbUrl, {
          method: 'POST',
          headers: notionHeaders,
          body: JSON.stringify({})
        })
        
        if (!dbResponse.ok) {
          const errorText = await dbResponse.text()
          throw new Error(`Notion API error: ${dbResponse.statusText} - ${errorText}`)
        }
        
        const dbData = await dbResponse.json()
        return new Response(
          JSON.stringify(dbData),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      case 'searchPages':
        if (!initiativeName) {
          return new Response(
            JSON.stringify({ error: 'Missing initiativeName parameter' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Búsqueda global de Notion
        const searchUrl = 'https://api.notion.com/v1/search'
        const searchBody = {
          query: initiativeName,
          filter: {
            value: 'page',
            property: 'object'
          },
          page_size: 100
        }
        
        const searchResponse = await fetch(searchUrl, {
          method: 'POST',
          headers: notionHeaders,
          body: JSON.stringify(searchBody)
        })

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text()
          throw new Error(`Notion API error: ${searchResponse.statusText} - ${errorText}`)
        }

        const searchData = await searchResponse.json()
        const globalPages = searchData.results || []
        
        // Filtrar páginas que coincidan con el nombre de la iniciativa
        const matchingPages = globalPages.filter((page: any) => {
          const pageTitle = page.properties?.Name?.title?.[0]?.plain_text ||
                           page.properties?.Title?.title?.[0]?.plain_text ||
                           page.properties?.Initiative?.title?.[0]?.plain_text ||
                           page.properties?.Nombre?.title?.[0]?.plain_text ||
                           ''
          return pageTitle.toLowerCase().includes(initiativeName.toLowerCase()) ||
                 initiativeName.toLowerCase().includes(pageTitle.toLowerCase())
        })
        
        return new Response(
          JSON.stringify({ results: matchingPages }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      case 'getPageBlocks':
        const pageId = databaseId || (await req.json()).pageId
        if (!pageId) {
          return new Response(
            JSON.stringify({ error: 'Missing pageId parameter' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        // Obtener bloques con paginación
        const allBlocks: any[] = []
        let startCursor: string | null = null
        let hasMore = true

        while (hasMore) {
          let blocksUrl = `https://api.notion.com/v1/blocks/${pageId}/children`
          if (startCursor) {
            blocksUrl += `?start_cursor=${startCursor}`
          }
          
          const blocksResponse = await fetch(blocksUrl, {
            method: 'GET',
            headers: notionHeaders
          })

          if (!blocksResponse.ok) {
            throw new Error(`Notion API error: ${blocksResponse.statusText}`)
          }

          const blocksData = await blocksResponse.json()
          allBlocks.push(...(blocksData.results || []))

          hasMore = blocksData.has_more || false
          startCursor = blocksData.next_cursor || null
        }

        return new Response(
          JSON.stringify({ results: allBlocks }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )

      default:
        return new Response(
          JSON.stringify({ error: `Invalid action. Supported: listDatabases, getDatabasePages, searchPages, getPageBlocks` }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
