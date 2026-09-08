import http from 'node:http'

const port = Number(process.env.PORT || 8787)
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' })
  response.end(JSON.stringify(body))
}

async function routeSummary(request, response) {
  if (!process.env.GEMINI_API_KEY) {
    json(response, 503, { error: 'GEMINI_API_KEY is not configured on the server.' })
    return
  }
  let payload = ''
  for await (const chunk of request) payload += chunk
  const { origin, destination, mode } = JSON.parse(payload || '{}')
  const prompt = `Give a concise route-planning safety brief for a prototype. Origin: ${origin}. Destination: ${destination}. Mode: ${mode}. Do not claim live safety, live authority presence, or emergency dispatch. Mention that route data must be verified.`
  const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  const result = await apiResponse.json()
  if (!apiResponse.ok) {
    json(response, apiResponse.status, { error: result.error?.message || 'Gemini request failed.' })
    return
  }
  json(response, 200, { text: result.candidates?.[0]?.content?.parts?.[0]?.text || 'No route brief returned.' })
}

async function transitStatus(request, response) {
  const endpoint = process.env.BMTC_API_URL
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`)
  const routes = requestUrl.searchParams.get('routes')?.split(',').filter(Boolean) || []
  if (!endpoint) {
    json(response, 503, {
      error: 'BMTC_API_URL is not configured. Live bus availability is unknown.',
      officialUrl: 'https://nammabmtcapp.karnataka.gov.in/',
      routes: routes.map((route) => ({ number: route, status: 'unknown', message: 'Open Namma BMTC or Google Transit for live confirmation.' })),
    })
    return
  }
  const apiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ routes }),
  })
  const result = await apiResponse.json()
  json(response, apiResponse.ok ? 200 : apiResponse.status, result)
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' })
    response.end()
    return
  }
  if (request.method === 'POST' && request.url === '/api/gemini/route-summary') {
    try { await routeSummary(request, response) } catch (error) { json(response, 500, { error: error.message }) }
    return
  }
  if (request.method === 'GET' && request.url?.startsWith('/api/transit/bmtc')) {
    try { await transitStatus(request, response) } catch (error) { json(response, 500, { error: error.message }) }
    return
  }
  json(response, 404, { error: 'Not found' })
})

server.listen(port, () => console.log(`SafeRoute server listening on http://127.0.0.1:${port}`))
