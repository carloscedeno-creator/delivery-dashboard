// Supabase Edge Function para proxy de Notion API
// Mantiene las credenciales seguras en el backend
// Soporta múltiples bases de datos y búsqueda global mejorada

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const NOTION_API_TOKEN = Deno.env.get('NOTION_API_TOKEN')
// NOTION_DATABASE_ID es opcional - si no está, se buscará en todas las bases de datos accesibles
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
            value: 'database',
            property: 'object'
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

        // Buscar en todas las bases de datos accesibles si no hay databaseId específico
        const databaseId = url.searchParams.get('databaseId') || NOTION_DATABASE_ID
        
        if (!databaseId) {
          // PRIMERO: Buscar páginas directamente por título usando la API de búsqueda global
          const globalSearchUrl = 'https://api.notion.com/v1/search'
          const globalSearchBody = {
            query: initiativeName,
            filter: {
              value: 'page',
              property: 'object'
            },
            page_size: 100
          }
          
          const globalSearchResponse = await fetch(globalSearchUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${NOTION_API_TOKEN}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(globalSearchBody)
          })

          const allResults = []
          
          if (globalSearchResponse.ok) {
            const globalData = await globalSearchResponse.json()
            const globalPages = globalData.results || []
            
            // Filtrar páginas que coincidan con el nombre de la iniciativa
            const matchingPages = globalPages.filter(page => {
              const pageTitle = page.properties?.Name?.title?.[0]?.plain_text ||
                               page.properties?.Title?.title?.[0]?.plain_text ||
                               page.properties?.Initiative?.title?.[0]?.plain_text ||
                               page.properties?.Nombre?.title?.[0]?.plain_text ||
                               ''
              return pageTitle.toLowerCase().includes(initiativeName.toLowerCase()) ||
                     initiativeName.toLowerCase().includes(pageTitle.toLowerCase())
            })
            
            // Agregar información de base de datos si está disponible
            matchingPages.forEach(page => {
              if (page.parent?.database_id) {
                allResults.push({
                  ...page,
                  database_id: page.parent.database_id
                })
              } else {
                allResults.push(page)
              }
            })
          }

          // SEGUNDO: Buscar en todas las bases de datos por propiedades
          const searchUrl = 'https://api.notion.com/v1/search'
          const searchBody = {
            filter: {
              value: 'database',
              property: 'object'
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

          if (databasesResponse.ok) {
            const databasesData = await databasesResponse.json()
            const databases = databasesData.results || []

            // Buscar en todas las bases de datos
            for (const db of databases) {
              try {
                const dbId = db.id
                notionUrl = `https://api.notion.com/v1/databases/${dbId}/query`
                
                // Intentar diferentes propiedades comunes para buscar
                const possibleProperties = ['Initiative', 'Name', 'Title', 'Nombre', 'Iniciativa']
                
                for (const propName of possibleProperties) {
                  try {
                    const searchFilter = {
                      property: propName,
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
                        // Agregar información de la base de datos a cada resultado
                        const resultsWithDb = dbData.results.map(page => {
                          // Evitar duplicados
                          const existing = allResults.find(r => r.id === page.id)
                          if (existing) return null
                          return {
                            ...page,
                            database_id: dbId,
                            database_title: db.title?.[0]?.plain_text || 'Unknown'
                          }
                        }).filter(Boolean)
                        allResults.push(...resultsWithDb)
                        break // Si encontramos resultados, no probar otras propiedades
                      }
                    }
                  } catch (e) {
                    // Continuar con la siguiente propiedad si esta falla
                    continue
                  }
                }
              } catch (e) {
                // Continuar con la siguiente base de datos si hay error
                console.error(`Error searching in database ${db.id}:`, e)
              }
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
        // Intentar diferentes propiedades comunes
        const possibleProperties = ['Initiative', 'Name', 'Title', 'Nombre', 'Iniciativa']
        
        for (const propName of possibleProperties) {
          try {
            const searchFilter = {
              property: propName,
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
            
            if (response.ok) {
              const data = await response.json()
              if (data.results && data.results.length > 0) {
                break // Si encontramos resultados, usar esta propiedad
              }
            }
          } catch (e) {
            // Continuar con la siguiente propiedad
            continue
          }
        }
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
