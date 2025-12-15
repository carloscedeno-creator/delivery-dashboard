// Supabase Edge Function para proxy de Notion API
// Mantiene las credenciales seguras en el backend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const NOTION_API_TOKEN = Deno.env.get('NOTION_API_TOKEN')
const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID')

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  // Verificar credenciales
  if (!NOTION_API_TOKEN || !NOTION_DATABASE_ID) {
    return new Response(
      JSON.stringify({ error: 'Notion credentials not configured' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }

  try {
    let notionUrl = ''
    let response

    switch (action) {
      case 'getDatabasePages': {
        notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`
        const filter = req.method === 'POST' ? await req.json().catch(() => null) : null
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
      }

      case 'searchPages': {
        const initiativeName = url.searchParams.get('initiativeName')
        if (!initiativeName) {
          return new Response(
            JSON.stringify({ error: 'Missing initiativeName parameter' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
          )
        }

        notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`
        // Buscar páginas que contengan el nombre de la iniciativa
        // Ajustar la propiedad según tu base de datos
        const searchFilter = {
          property: 'Initiative', // ⚠️ Ajustar según tu base de datos
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
      }

      case 'getPageBlocks': {
        const pageId = url.searchParams.get('pageId')
        if (!pageId) {
          return new Response(
            JSON.stringify({ error: 'Missing pageId parameter' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
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
            const errorText = await blockResponse.text()
            throw new Error(`Notion API error: ${blockResponse.statusText} - ${errorText}`)
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
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=300'
            }
          }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Supported: getDatabasePages, searchPages, getPageBlocks' }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          }
        )
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Notion API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300'
        }
      }
    )

  } catch (error) {
    console.error('Notion proxy error:', error)
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
