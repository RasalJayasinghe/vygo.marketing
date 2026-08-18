// Scheduled daily on Netlify (see netlify.toml). Pings Slack for webinar
// projects stuck in the chase step. Requires SLACK_WEBHOOK_URL.
// Optional CRON_SECRET protects manual hits to /api/cron-followup.

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

  let due
  try {
    const { dueFollowups } = await import('./followups.js')
    due = await dueFollowups(3)
  } catch (err) {
    console.error('Follow-up queue read failed', err)
    res.status(200).json({
      ok: false,
      checked: 0,
      pinged: [],
      skipped: 'Database is not ready yet.',
    })
    return
  }

  const pinged = []
  for (const row of due) {
    try {
      const r = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🔔 *3-day follow-up* — the webinar *"${row.projectTitle}"* is still waiting on a confirmed date and guest.${row.speaker ? ` from *${row.speaker}*` : ''}\n${row.date ? `Date on file: _${row.date}_` : 'No date confirmed yet'}\n\nReply *"yes"* to advance the workflow, or book a quick call to sort it out.`,
        }),
      })
      if (r.ok) {
        const { upsertFollowup } = await import('./followups.js')
        await upsertFollowup({
          projectId: row.projectId,
          projectTitle: row.projectTitle,
          speaker: row.speaker,
          date: row.date,
        })
        pinged.push(row.projectId)
      }
    } catch (err) {
      console.error('Follow-up ping failed', row.projectId, err)
    }
  }

  res.status(200).json({ ok: true, checked: due.length, pinged })
}
