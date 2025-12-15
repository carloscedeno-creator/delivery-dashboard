// Supabase Edge Function para proxy de Notion API
// Mantiene las credenciales seguras en el backend

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const NOTION_API_TOKEN = Deno.env.get('NOTION_API_TOKEN')
const NOTION_DATABASE_ID = Deno.env.get('NOTION_DATABASE_ID') // Base de datos por defecto (opcional)

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
  if (!NOTION_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'NOTION_API_TOKEN not configured' }),
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
      case 'listDatabases': {
        // Buscar todas las bases de datos accesibles usando la API de búsqueda
        notionUrl = 'https://api.notion.com/v1/search'
        const searchBody = {
          filter: {
            property: 'object',
            value: 'database'
          },
          page_size: 100
        }
        response = await fetch(notionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${NOTION_API_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(searchBody)
        })
        break
      }

      case 'getDatabasePages': {
        // Permitir databaseId como parámetro o usar el default
        const databaseId = url.searchParams.get('databaseId') || NOTION_DATABASE_ID
        if (!databaseId) {
          return new Response(
            JSON.stringify({ error: 'Missing databaseId parameter or NOTION_DATABASE_ID secret' }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              }
            }
          )
        }
        notionUrl = `https://api.notion.com/v1/databases/${databaseId}/query`
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
        const databaseId = url.searchParams.get('databaseId') || NOTION_DATABASE_ID
        
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

        // Si no hay databaseId específico, buscar en todas las bases de datos
        if (!databaseId) {
          // Buscar en todas las bases de datos accesibles
          const searchUrl = 'https://api.notion.com/v1/search'
          const searchBody = {
            filter: {
              property: 'object',
              value: 'database'
            },
            page_size: 100
          }
          
          const databasesResponse = await fetch(searchUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${NOTION_API_TOKEN}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchBody)
          })

          if (!databasesResponse.ok) {
            throw new Error(`Failed to list databases: ${databasesResponse.statusText}`)
          }

          const databasesData = await databasesResponse.json()
          const databases = databasesData.results || []

          // Buscar en todas las bases de datos
          const allResults = []
          for (const db of databases) {
            try {
              const dbId = db.id
              notionUrl = `https://api.notion.com/v1/databases/${dbId}/query`
              
              // Intentar buscar con propiedad "Initiative" (title)
              const searchFilter = {
                property: 'Initiative',
                title: {
                  contains: initiativeName
                }
              }
              
              const dbResponse = await fetch(notionUrl, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${NOTION_API_TOKEN}`,
                  'Notion-Version': '2022-06-28',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filter: searchFilter })
              })

              if (dbResponse.ok) {
                const dbData = await dbResponse.json()
                if (dbData.results && dbData.results.length > 0) {
                  allResults.push(...dbData.results)
                }
              }
            } catch (e) {
              // Continuar con la siguiente base de datos si hay error
              console.error(`Error searching in database ${db.id}:`, e)
            }
          }

          return new Response(
            JSON.stringify({ results: allResults }),
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

        // Buscar en una base de datos específica
        notionUrl = `https://api.notion.com/v1/databases/${databaseId}/query`
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
          JSON.stringify({ error: 'Invalid action. Supported: listDatabases, getDatabasePages, searchPages, getPageBlocks' }),
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
