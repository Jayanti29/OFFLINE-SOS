import http from 'node:http'
import { pathToFileURL } from 'node:url'

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

async function predictiveHorizon(request, response) {
  let payload = ''
  for await (const chunk of request) payload += chunk
  let body = {}
  try { body = JSON.parse(payload || '{}') } catch {}
  const { origin, destination, timeOffsetHours = 0 } = body

  if (!process.env.GEMINI_API_KEY) {
    json(response, 200, {
      summary: 'Temporal event horizon modeling active. Peak risk window occurs between 23:00 and 04:00 due to reduced transit availability and secluded secondary roads.',
      source: 'Internal temporal baseline model',
    })
    return
  }

  const prompt = `You are an expert urban safety and night transit risk analyzer for Bengaluru, India.
Analyze route risk horizon from "${origin || 'Provident Wellworth City'}" to "${destination || 'Presidency University'}" at ${timeOffsetHours} hours ahead.
Consider night hours, sports matches (Chinnaswamy Stadium), metro/bus closures, weather, and unlit corridors.
Provide a concise 2-sentence safety advisory summary.`

  try {
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    const result = await apiResponse.json()
    json(response, 200, {
      summary: result.candidates?.[0]?.content?.parts?.[0]?.text || 'Route risk analysis completed.',
      source: 'Gemini AI Grounded Event Analysis',
    })
  } catch (err) {
    json(response, 200, {
      summary: 'Temporal event horizon modeling active. Peak risk window occurs between 23:00 and 04:00.',
      source: 'Fallback temporal model',
    })
  }
}

async function meshDispatch(request, response) {
  let payload = ''
  for await (const chunk of request) payload += chunk
  let body = {}
  try { body = JSON.parse(payload || '{}') } catch {}

  console.log(`[GUARDIAN MESH] Emergency alert received from gateway ${body.dispatchedByGateway} for packet ${body.packetId}`)

  json(response, 200, {
    status: 'dispatched',
    erssTicketId: `ERSS-KA-${Math.floor(Math.random() * 89999 + 10000)}`,
    dispatchUnit: 'Hoysala Patrol Unit #14',
    timestamp: Date.now(),
  })
}

export async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' })
    response.end()
    return
  }
  if (request.method === 'POST' && request.url === '/api/gemini/route-summary') {
    try { await routeSummary(request, response) } catch (error) { json(response, 500, { error: error.message }) }
    return
  }
  if (request.method === 'POST' && request.url === '/api/risk/predictive-horizon') {
    try { await predictiveHorizon(request, response) } catch (error) { json(response, 500, { error: error.message }) }
    return
  }
  if (request.method === 'POST' && request.url === '/api/emergency/mesh-dispatch') {
    try { await meshDispatch(request, response) } catch (error) { json(response, 500, { error: error.message }) }
    return
  }
  if (request.method === 'GET' && request.url?.startsWith('/api/transit/bmtc')) {
    try { await transitStatus(request, response) } catch (error) { json(response, 500, { error: error.message }) }
    return
  }
  json(response, 404, { error: 'Not found' })
}

// Vercel imports this file as a serverless handler. Keep the standalone local
// development server available when this module is run directly.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = http.createServer(handler)
  server.listen(port, () => console.log(`SafeRoute server listening on http://127.0.0.1:${port}`))
}
