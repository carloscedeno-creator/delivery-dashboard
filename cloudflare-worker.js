// Cloudflare Worker to proxy Google Sheets and add CORS headers
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // Get the URL from query parameter
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')

    // If no URL provided, return error
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
        // Fetch the target URL
        const response = await fetch(targetUrl)
        const data = await response.text()

        // Return with CORS headers
        return new Response(data, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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
