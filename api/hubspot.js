// /api/hubspot — server-side proxy to the HubSpot API.
//
// Accepts a HubSpot service key or legacy private-app token via HUBSPOT_TOKEN.
// The credential must never reach the browser.
//
// USAGE FROM THE FRONTEND:
//   fetch(`/api/hubspot?path=${encodeURIComponent('/marketing/v3/emails?limit=50')}`)

import { fetchHubSpot, inspectToken, resolveHubSpotPath } from './hubspotProxy.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Only GET is supported by this proxy.' })
    return
  }

  const token = process.env.HUBSPOT_TOKEN
  if (!token) {
    res.status(500).json({ error: 'HUBSPOT_TOKEN is not configured on the server.' })
    return
  }

  if (req.query.inspect === 'token') {
    try {
      const info = await inspectToken(token)
      res.status(200).json(info)
    } catch (err) {
      res.status(502).json({ error: 'Failed to inspect HubSpot token', detail: String(err) })
    }
    return
  }

  const resolved = resolveHubSpotPath(req.query.path)
  if (resolved.error) {
    res.status(resolved.status).json({ error: resolved.error })
    return
  }

  try {
    const hubspotRes = await fetchHubSpot(resolved.path, token)
    res.status(hubspotRes.status)
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
    res.send(hubspotRes.body)
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach HubSpot', detail: String(err) })
  }
}
