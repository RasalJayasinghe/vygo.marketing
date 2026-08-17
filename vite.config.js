import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { fetchHubSpot, inspectToken, resolveHubSpotPath } from './api/hubspotProxy.js'

function hubspotDevProxy(token) {
  return {
    name: 'hubspot-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/hubspot', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Only GET is supported by this proxy.' }))
          return
        }
        if (!token) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'HUBSPOT_TOKEN is not configured on the server.' }))
          return
        }

        const url = new URL(req.originalUrl || req.url, 'http://localhost')
        if (url.searchParams.get('inspect') === 'token') {
          try {
            const info = await inspectToken(token)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(info))
          } catch (err) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Failed to inspect HubSpot token', detail: String(err) }))
          }
          return
        }
        const resolved = resolveHubSpotPath(url.searchParams.get('path'))
        if (resolved.error) {
          res.statusCode = resolved.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: resolved.error }))
          return
        }

        try {
          const hubspotRes = await fetchHubSpot(resolved.path, token)
          res.statusCode = hubspotRes.status
          res.setHeader('Content-Type', 'application/json')
          res.end(hubspotRes.body)
        } catch (err) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Failed to reach HubSpot', detail: String(err) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), hubspotDevProxy(env.HUBSPOT_TOKEN)],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
