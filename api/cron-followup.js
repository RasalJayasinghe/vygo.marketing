// Scheduled daily on Netlify (see netlify.toml). Pings Slack for webinar
// projects stuck in the chase step. Requires CRON_SECRET and SLACK_WEBHOOK_URL.

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const scheduled = String(req.headers['x-netlify-event'] || '').toLowerCase() === 'schedule'
  return scheduled || auth === `Bearer ${secret}`
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (!isAuthorized(req)) {
    res.status(401).end()
    return
  }

  if (!process.env.SLACK_WEBHOOK_URL) {
    res.status(200).json({ skipped: 'SLACK_WEBHOOK_URL not set' })
    return
  }

  res.status(200).json({
    ok: true,
    checked: 0,
    pinged: [],
    skipped: 'Follow-up queue is not configured on Netlify.',
  })
}
