// Adapts the Express-style handlers in /api to Netlify Functions v2
// (export default, Web Request / Response). v2 is required for local
// `netlify dev` because v1 is executed via lambda-local as CommonJS.

export function toNetlify(fn) {
  return async (request) => {
    const headers = Object.fromEntries(request.headers.entries())
    const url = new URL(request.url)
    const query = Object.fromEntries(url.searchParams.entries())

    let body = {}
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const text = await request.text()
      if (text) {
        try {
          body = JSON.parse(text)
        } catch {
          body = {}
        }
      }
    }

    const req = {
      method: request.method,
      query,
      body,
      headers,
    }

    let statusCode = 200
    const resHeaders = { 'Content-Type': 'application/json' }
    let payload = ''

    const res = {
      setHeader(key, value) {
        resHeaders[key] = value
        return res
      },
      status(code) {
        statusCode = code
        return res
      },
      json(obj) {
        payload = JSON.stringify(obj)
        return res
      },
      send(data) {
        payload = typeof data === 'string' ? data : JSON.stringify(data)
        return res
      },
      end(data) {
        if (data !== undefined && data !== null) payload = String(data)
        return res
      },
    }

    try {
      await fn(req, res)
    } catch (err) {
      console.error('Function handler failed', err)
      statusCode = 500
      payload = JSON.stringify({ error: err.message || 'Function failed' })
    }
    return new Response(payload, { status: statusCode, headers: resHeaders })
  }
}
