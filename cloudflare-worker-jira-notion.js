// Cloudflare Worker para proxy de Google Sheets, Jira y Notion
// Este worker maneja las llamadas a APIs externas de forma segura
// manteniendo las credenciales en el backend

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    const url = new URL(request.url)
    const path = url.pathname

    // Manejar CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400'
            }
        })
    }

    // Proxy para Google Sheets (comportamiento original)
    if (path === '/' || path === '') {
        const targetUrl = url.searchParams.get('url')
        
        if (!targetUrl) {
            return new Response('Missing url parameter', {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                }
            })
        }

        try {
            const response = await fetch(targetUrl)
            const data = await response.text()

            return new Response(data, {
                status: 200,
                headers: {
                    'Content-Type': 'text/csv',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'public, max-age=300'
                }
            })
        } catch (error) {
            return new Response(`Error fetching data: ${error.message}`, {
                status: 500,
                headers: {
                    'Content-Type': 'text/plain',
                    'Access-Control-Allow-Origin': '*'
                }
            })
        }
    }

    // Endpoint para Jira
    if (path === '/jira') {
        return handleJiraRequest(request, url)
    }

    // Endpoint para Notion
    if (path === '/notion') {
        return handleNotionRequest(request, url)
    }

    return new Response('Not found', {
        status: 404,
        headers: {
            'Content-Type': 'text/plain',
            'Access-Control-Allow-Origin': '*'
        }
    })
}

async function handleJiraRequest(request, url) {
    // Obtener credenciales de las variables de entorno del Worker
    const JIRA_BASE_URL = JIRA_BASE_URL_ENV || ''
    const JIRA_EMAIL = JIRA_EMAIL_ENV || ''
    const JIRA_API_TOKEN = JIRA_API_TOKEN_ENV || ''

    if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'Jira credentials not configured' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    const action = url.searchParams.get('action')
    const auth = btoa(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`)

    try {
        let jiraUrl = ''
        let response

        switch (action) {
            case 'getEpicIssues':
                const epicKey = url.searchParams.get('epicKey')
                jiraUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=epic=${epicKey}`
                response = await fetch(jiraUrl, {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json'
                    }
                })
                break

            case 'getProjectIssues':
                const projectKey = url.searchParams.get('projectKey')
                jiraUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=project=${projectKey}`
                response = await fetch(jiraUrl, {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json'
                    }
                })
                break

            case 'search':
                const jql = url.searchParams.get('jql')
                jiraUrl = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}`
                response = await fetch(jiraUrl, {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Accept': 'application/json'
                    }
                })
                break

            default:
                return new Response(JSON.stringify({ error: 'Invalid action' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                })
        }

        if (!response.ok) {
            throw new Error(`Jira API error: ${response.statusText}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300'
            }
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }
}

async function handleNotionRequest(request, url) {
    // Obtener credenciales de las variables de entorno del Worker
    const NOTION_API_TOKEN = NOTION_API_TOKEN_ENV || ''
    const NOTION_DATABASE_ID = NOTION_DATABASE_ID_ENV || '' // Opcional - si no está, busca en todas

    if (!NOTION_API_TOKEN) {
        return new Response(JSON.stringify({ error: 'NOTION_API_TOKEN not configured' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }

    const action = url.searchParams.get('action')

    try {
        let notionUrl = ''
        let response

        switch (action) {
            case 'getDatabasePages':
                const databaseId = url.searchParams.get('databaseId') || NOTION_DATABASE_ID
                if (!databaseId) {
                    return new Response(JSON.stringify({ error: 'Missing databaseId parameter or NOTION_DATABASE_ID secret' }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    })
                }
                notionUrl = `https://api.notion.com/v1/databases/${databaseId}/query`
                const filter = request.method === 'POST' ? await request.json() : null
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
                if (!initiativeName) {
                    return new Response(JSON.stringify({ error: 'Missing initiativeName parameter' }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    })
                }

                // Si no hay databaseId, buscar en todas las bases de datos usando búsqueda global
                if (!NOTION_DATABASE_ID) {
                    // PRIMERO: Búsqueda global de Notion
                    const globalSearchUrl = 'https://api.notion.com/v1/search'
                    const globalSearchBody = {
                        query: initiativeName,
                        filter: {
                            value: 'page',
                            property: 'object'
                        },
                        page_size: 100
                    }
                    
                    const globalResponse = await fetch(globalSearchUrl, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${NOTION_API_TOKEN}`,
                            'Notion-Version': '2022-06-28',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(globalSearchBody)
                    })

                    if (!globalResponse.ok) {
                        throw new Error(`Notion API error: ${globalResponse.statusText}`)
                    }

                    const globalData = await globalResponse.json()
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
                    
                    return new Response(JSON.stringify({ results: matchingPages }), {
                        status: 200,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'public, max-age=300'
                        }
                    })
                }

                // Si hay databaseId, buscar en esa base de datos específica
                notionUrl = `https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`
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
                        continue
                    }
                }
                break

            case 'getPageBlocks':
                const pageId = url.searchParams.get('pageId')
                if (!pageId) {
                    return new Response(JSON.stringify({ error: 'Missing pageId parameter' }), {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        }
                    })
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

                return new Response(JSON.stringify({ results: allBlocks }), {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': 'public, max-age=300'
                    }
                })

            default:
                return new Response(JSON.stringify({ error: 'Invalid action. Supported: getDatabasePages, searchPages, getPageBlocks' }), {
                    status: 400,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    }
                })
        }

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Notion API error: ${response.statusText} - ${errorText}`)
        }

        const data = await response.json()

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=300'
            }
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }
}

