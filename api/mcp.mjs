// Vercel function for POST /mcp (rewritten from /mcp in vercel.json). Same read-only MCP server that ran on
// AWS Lambda; the protocol logic lives in site-api/lambda/mcp.mjs and is shared unchanged.
import { handleHttp, liveProfile } from '../site-api/lambda/mcp.mjs'

async function respond(request) {
  const body = request.method === 'POST' ? await request.text() : ''
  const r = handleHttp(
    { method: request.method, body, contentType: request.headers.get('content-type') ?? undefined },
    await liveProfile(),
  )
  return new Response(r.status === 202 ? null : r.body, {
    status: r.status,
    headers: { 'cache-control': 'no-store', ...r.headers },
  })
}

export const GET = respond
export const POST = respond
export const DELETE = respond
