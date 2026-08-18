// POST { projectId, projectTitle, speaker, date, followUp? }
// Sends a Slack message via SLACK_WEBHOOK_URL.
// Also records the ping timestamp when a follow-up store is configured.
// Degrades gracefully if webhook is not configured.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).end(); return }

  const { projectId, projectTitle, speaker, date, followUp = false } = req.body || {}
  if (!projectId || !projectTitle) {
    res.status(400).json({ error: 'projectId and projectTitle are required' })
    return
  }

  const dateSnippet = date ? `Date on file: _${date}_` : 'No date confirmed yet'
  const guestSnippet = speaker ? ` from *${speaker}*` : ''

  const message = followUp
    ? `🔔 *3-day follow-up* — the webinar *"${projectTitle}"* is still waiting on a confirmed date and guest.${guestSnippet}\n${dateSnippet}\n\nReply *"yes"* to advance the workflow, or book a quick call to sort it out.`
    : `👋 Hey @joel — the webinar workflow for *"${projectTitle}"* is blocked on:\n• ${date ? `Confirmed date _(${date})_` : 'A confirmed date — not set yet'}\n• Guest confirmation${guestSnippet}\n\nCan you confirm or nudge them? Reply *"yes"* here and I'll kick off the next step.\n\n_Auto follow-up in 3 days if no reply. After that, a call._`

  const webhookUrl = process.env.SLACK_WEBHOOK_URL
  let slackSent = false
  let queued = false

  if (webhookUrl) {
    try {
      const r = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      })
      slackSent = r.ok
    } catch (err) {
      console.error('Slack send failed', err)
    }
  }

  try {
    const { upsertFollowup } = await import('./followups.js')
    await upsertFollowup({ projectId, projectTitle, speaker, date })
    queued = true
  } catch (err) {
    console.error('Follow-up queue write failed', err)
  }

  res.status(200).json({ ok: true, slackSent, queued, preview: message })
}
