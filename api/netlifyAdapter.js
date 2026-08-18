export function toNetlify(fn) {
  return async (event) => {
    const headers = event.headers || {}
    const query = event.queryStringParameters || {}
    let body = {}
    if (event.body) {
      try {
        body = JSON.parse(event.body)
      } catch {
        body = {}
      }
    }

    const req = {
      method: event.httpMethod || 'GET',
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

    await fn(req, res)
    return { statusCode, headers: resHeaders, body: payload }
  }
}
