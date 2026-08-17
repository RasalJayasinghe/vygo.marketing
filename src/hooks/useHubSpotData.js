import { useEffect, useRef, useState } from 'react'

const AUTO_REFRESH_MS = 60_000
const MONTHS_ORDER = ['January','February','March','April','May','June','July','August','September','October','November','December']

async function hubspotGet(path) {
  const res = await fetch(`/api/hubspot?path=${encodeURIComponent(path)}`)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error || body.message || `HubSpot proxy error (${res.status})`)
  }
  return body
}

async function hubspotList(pathBase, { pages = 10 } = {}) {
  const results = []
  let after = ''
  for (let i = 0; i < pages; i++) {
    const sep = pathBase.includes('?') ? '&' : '?'
    const path = after ? `${pathBase}${sep}after=${encodeURIComponent(after)}` : pathBase
    const data = await hubspotGet(path)
    results.push(...(data.results || []))
    after = data.paging?.next?.after || ''
    if (!after) break
  }
  return results
}

function monthYearFromISO(iso) {
  if (!iso) return { year: '', month: '' }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { year: '', month: '' }
  return { year: String(d.getFullYear()), month: MONTHS_ORDER[d.getMonth()] }
}

function num(...vals) {
  for (const v of vals) {
    const n = Number(v)
    if (Number.isFinite(n) && n !== 0) return n
  }
  for (const v of vals) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return 0
}

function countersOf(obj = {}) {
  const c = obj.stats?.counters || obj.counters || obj.aggregate?.counters || {}
  return {
    delivered: num(c.delivered, c.sent, c.SENT, obj.delivered, obj.sent),
    opens: num(c.open, c.opens, c.uniqueopens, c.OPEN, obj.opens, obj.open),
    clicks: num(c.click, c.clicks, c.uniqueclicks, c.CLICKS, obj.clicks, obj.click),
    views: num(c.views, c.VIEWS, obj.views, obj.impressions),
    submissions: num(c.submissions, c.SUBMISSIONS, obj.submissions),
  }
}

function decodeUtm(value) {
  try {
    return decodeURIComponent(String(value || '').replaceAll('+', ' '))
  } catch {
    return String(value || '')
  }
}

function baseRow(overrides) {
  return {
    impressions: 0,
    totalClicks: 0,
    totalOpens: 0,
    totalDelivered: 0,
    ctr: 0,
    registrations: 0,
    attendees: 0,
    downloads: 0,
    listens: 0,
    avgConsumption: 0,
    guestName: '',
    notes: '',
    subject: '',
    url: '',
    campaignStatus: '',
    startDate: '',
    endDate: '',
    utm: '',
    ...overrides,
  }
}

async function fetchScopeStatus() {
  const res = await fetch('/api/hubspot?inspect=token')
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not inspect HubSpot token')
  return body
}

async function fetchCampaignRows() {
  const properties = [
    'hs_name',
    'hs_start_date',
    'hs_end_date',
    'hs_campaign_status',
    'hs_notes',
    'hs_audience',
    'hs_utm',
  ].join(',')
  const results = await hubspotList(`/marketing/v3/campaigns?limit=100&properties=${properties}`)
  return results.map(campaign => {
    const p = campaign.properties || {}
    const { year, month } = monthYearFromISO(p.hs_start_date || campaign.createdAt)
    const notes = [p.hs_campaign_status, p.hs_audience, p.hs_notes].filter(Boolean).join(' · ')
    return baseRow({
      year,
      month,
      assetType: 'Campaign',
      assetName: p.hs_name || 'Untitled campaign',
      notes,
      campaignStatus: p.hs_campaign_status || '',
      startDate: p.hs_start_date || '',
      endDate: p.hs_end_date || '',
      utm: decodeUtm(p.hs_utm),
    })
  })
}

async function fetchEmailStatsById() {
  const end = new Date()
  const start = new Date(end)
  start.setFullYear(start.getFullYear() - 3)
  const path = `/marketing/v3/emails/statistics/list?startTimestamp=${encodeURIComponent(start.toISOString())}&endTimestamp=${encodeURIComponent(end.toISOString())}`
  const stats = await hubspotGet(path)
  const items = stats.campaigns || stats.emails || stats.results || []
  const map = new Map()
  for (const item of items) {
    const id = String(item.id ?? item.emailId ?? item.campaignId ?? '')
    if (id) map.set(id, countersOf(item))
  }
  return map
}

async function fetchEdmRows() {
  const [results, statsById] = await Promise.all([
    hubspotList('/marketing/v3/emails?limit=100'),
    fetchEmailStatsById().catch(() => new Map()),
  ])
  const published = results.filter(email =>
    email.isPublished === true || email.published === true || String(email.state || '').toUpperCase() === 'PUBLISHED'
  )
  const source = published.length ? published : results

  return source.map(email => {
    const { year, month } = monthYearFromISO(email.publishDate || email.updatedAt || email.createdAt)
    const fromEmail = countersOf(email)
    const fromStats = statsById.get(String(email.id)) || {}
    const delivered = num(fromStats.delivered, fromEmail.delivered)
    const opens = num(fromStats.opens, fromEmail.opens)
    const clicks = num(fromStats.clicks, fromEmail.clicks)
    return baseRow({
      year,
      month,
      assetType: 'EDM',
      assetName: email.name || 'Untitled email',
      subject: email.subject || email.subjectLine || '',
      totalClicks: clicks,
      totalOpens: opens,
      totalDelivered: delivered,
      ctr: delivered ? (clicks / delivered) * 100 : 0,
      notes: email.subject || email.fromName || '',
    })
  })
}

async function fetchFormRows() {
  const results = await hubspotList('/marketing/v3/forms?limit=100')
  return results.map(form => {
    const { year, month } = monthYearFromISO(form.createdAt || form.updatedAt)
    const fieldCount = (form.fieldGroups || []).reduce((n, g) => n + (g.fields?.length || 0), 0)
    return baseRow({
      year,
      month,
      assetType: 'Form',
      assetName: form.name || 'Untitled form',
      notes: [form.formType, fieldCount ? `${fieldCount} fields` : ''].filter(Boolean).join(' · '),
    })
  })
}

async function fetchLandingPageRows() {
  const results = await hubspotList('/cms/v3/pages/landing-pages?limit=100&archived=false')
  return results.map(page => {
    const { year, month } = monthYearFromISO(page.publishDate || page.updatedAt || page.createdAt)
    const views = num(page.analyticsPageViews, countersOf(page).views)
    return baseRow({
      year,
      month,
      assetType: 'Landing Page',
      assetName: page.name || page.htmlTitle || 'Untitled page',
      url: page.url || '',
      notes: page.slug || '',
      impressions: views,
      registrations: num(page.analyticsSubmissions, countersOf(page).submissions),
    })
  })
}

async function tryFetch(label, fn) {
  try {
    const rows = await fn()
    return { label, rows, error: null }
  } catch (err) {
    return { label, rows: [], error: err.message || `Failed to fetch ${label}` }
  }
}

export function useHubSpotData({ enabled = true } = {}) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let cancelled = false

    async function fetchAll(showLoading = true) {
      if (showLoading) setLoading(true)
      try {
        const status = await fetchScopeStatus().catch(() => null)
        const settled = await Promise.all([
          tryFetch('campaigns', fetchCampaignRows),
          tryFetch('emails', fetchEdmRows),
          tryFetch('forms', fetchFormRows),
          tryFetch('landing pages', fetchLandingPageRows),
        ])
        if (cancelled) return

        const rows = settled.flatMap(item => item.rows)
        const failed = settled.filter(item => item.error)
        const succeeded = settled.filter(item => !item.error)

        if (!succeeded.length) {
          setData([])
          setError(failed[0]?.error || 'Failed to fetch HubSpot data')
          setWarning(null)
          return
        }

        setData(rows)
        setError(null)
        setLastUpdated(new Date())

        if (status?.missing?.length) {
          setWarning(
            `HubSpot is connected (portal ${status.hubId || 'unknown'}), but this service key still does not include ${status.missing.join(', ')}. Webinars, social posts, and podcasts continue to load from the master sheet.`
          )
        } else if (failed.length) {
          setWarning(`HubSpot loaded with gaps: ${failed.map(item => `${item.label} (${item.error})`).join('; ')}`)
        } else {
          setWarning(null)
        }
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Failed to fetch HubSpot data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchAll(true)
    timerRef.current = setInterval(() => fetchAll(false), AUTO_REFRESH_MS)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled])

  return { data, loading, error, warning, lastUpdated }
}
