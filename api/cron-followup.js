// Scheduled daily on Netlify (see netlify.toml). Pings Slack for webinar
// projects stuck waiting on a guest. 3-day Slack follow-up, then a call.
// Requires SLACK_WEBHOOK_URL.
// Optional CRON_SECRET protects manual hits to /api/cron-followup.

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.authorization || req.headers.Authorization || ''
  const scheduled = String(req.headers['x-netlify-event'] || '').toLowerCase() === 'schedule'
  return scheduled || auth === `Bearer ${secret}`
}

async function loadProject(projectId) {
  try {
    const { eq } = await import('drizzle-orm')
    const { db } = await import('../db/index.js')
    const { projects } = await import('../db/schema.js')
    const [row] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
    return row?.payload || null
  } catch {
    return null
  }
}

function stillWaiting(project) {
  if (!project || project.kind !== 'webinar' || !project.chase?.open) return false
  const steps = Array.isArray(project.steps) ? project.steps : []
  const idx = steps.findIndex(s => s.status !== 'completed')
  return idx >= 0 && steps[idx]?.status === 'in_progress'
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
  const escalated = []
  const cleared = []

  for (const row of due) {
    const project = await loadProject(row.projectId)
    if (!stillWaiting(project)) {
      try {
        const { clearFollowup } = await import('./followups.js')
        await clearFollowup(row.projectId)
        cleared.push(row.projectId)
      } catch (err) {
        console.error('Follow-up clear failed', row.projectId, err)
      }
      continue
    }

    const escalate = (row.pingCount || 0) >= 2
    const dateSnippet = row.date ? `Date on file: _${row.date}_` : 'No date confirmed yet'
    const guestSnippet = row.speaker ? ` from *${row.speaker}*` : ''
    const text = escalate
      ? `📞 *Time to call* — *"${row.projectTitle}"* still has no guest confirmation after a Slack ping and a 3-day follow-up.${guestSnippet}\n${dateSnippet}\n\nBook a call with Joel/Lyndon. If the guest declined, restart the chase with someone else.`
      : `🔔 *3-day follow-up* — the webinar *"${row.projectTitle}"* is still waiting on a confirmed date and guest.${guestSnippet}\n${dateSnippet}\n\nReply *"yes"* in Slack, or mark “confirmed by email” on the webinar if they replied outside Slack. If they're still quiet in 3 days, escalate to a call.`

    try {
      const r = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (r.ok) {
        const { upsertFollowup } = await import('./followups.js')
        await upsertFollowup({
          projectId: row.projectId,
          projectTitle: row.projectTitle,
          speaker: row.speaker,
          date: row.date,
        })
        if (escalate) escalated.push(row.projectId)
        else pinged.push(row.projectId)
      }
    } catch (err) {
      console.error('Follow-up ping failed', row.projectId, err)
    }
  }

  res.status(200).json({ ok: true, checked: due.length, pinged, escalated, cleared })
}
