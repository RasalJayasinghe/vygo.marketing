export const ALLOWED_PREFIXES = [
  '/account-info/',
  '/crm/v3/objects/',
  '/crm/v3/schemas',
  '/cms/v3/pages',
  '/cms/pages/',
  '/marketing/v3/campaigns',
  '/marketing/campaigns/',
  '/marketing/v3/marketing-events',
  '/marketing/v3/emails',
  '/marketing/emails/',
  '/marketing/v3/forms',
  '/forms/v2/forms',
  '/form-integrations/v1/',
  '/analytics/v2/',
  '/events/v3/',
  '/email/public/v1/',
]

export function resolveHubSpotPath(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') {
    return { error: 'Missing required "path" query param, e.g. /marketing/v3/campaigns', status: 400 }
  }
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const isAllowed = ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix))
  if (!isAllowed) {
    return { error: `Path not whitelisted for this proxy: ${path}`, status: 403 }
  }
  return { path }
}

export function formatHubSpotError(status, parsed) {
  if (!parsed || typeof parsed !== 'object') return `HubSpot proxy error (${status})`
  const scopes = []
  for (const err of parsed.errors || []) {
    const ctx = err.context || {}
    for (const key of ['requiredGranularScopes', 'requiredScopes', 'scopes']) {
      if (Array.isArray(ctx[key])) scopes.push(...ctx[key])
    }
  }
  const msg = parsed.message || parsed.error || parsed.category
  if (scopes.length) return `${msg || 'Forbidden'} (need scopes: ${[...new Set(scopes)].join(', ')})`
  if (parsed.category === 'MISSING_SCOPES') {
    return `${msg || 'Missing HubSpot scopes'}. Add content (emails & pages) and forms on the service key, then refresh.`
  }
  return msg || `HubSpot proxy error (${status})`
}

const NEEDED_SCOPES = [
  { id: 'content', also: ['marketing.email.read'], label: 'emails & landing pages' },
  { id: 'forms', also: [], label: 'forms' },
]

export async function inspectToken(token) {
  const res = await fetch('https://api.hubapi.com/oauth/v2/private-apps/get/access-token-info', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tokenKey: token }),
  })
  const json = await res.json().catch(() => ({}))
  const scopes = Array.isArray(json.scopes) ? json.scopes : []
  const missing = NEEDED_SCOPES.filter(item => {
    if (scopes.includes(item.id)) return false
    return !item.also.some(alt => scopes.includes(alt))
  })
  return {
    hubId: json.hubId || null,
    scopes,
    missing: missing.map(item => item.id),
    missingLabels: missing.map(item => item.label),
  }
}

export async function fetchHubSpot(path, token) {
  const hubspotRes = await fetch(`https://api.hubapi.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  const body = await hubspotRes.text()
  if (hubspotRes.status < 400) return { status: hubspotRes.status, body }

  let payload = { error: `HubSpot proxy error (${hubspotRes.status})` }
  try {
    const parsed = JSON.parse(body)
    payload = { ...parsed, error: formatHubSpotError(hubspotRes.status, parsed) }
  } catch {
    if (body) payload.error = body.slice(0, 300)
  }
  return { status: hubspotRes.status, body: JSON.stringify(payload) }
}
