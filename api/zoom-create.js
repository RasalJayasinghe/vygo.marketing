// POST { title, date?, speaker? }
// Creates a Zoom webinar via Server-to-Server OAuth and generates 3 guest registrant links.
// Requires: ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET in env.
// Returns 503 with setup instructions if credentials are missing.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).end(); return }

  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    res.status(503).json({
      error: 'Zoom credentials not configured.',
      setup: 'Add ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET to your Netlify environment variables. Create a Server-to-Server OAuth app at marketplace.zoom.us with webinar:write:webinar and webinar:write:registrant (or the :admin variants).',
    })
    return
  }

  const { title, date, speaker } = req.body || {}
  if (!title) { res.status(400).json({ error: 'title is required' }); return }

  // Server-to-Server OAuth token
  let accessToken
  try {
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(ZOOM_ACCOUNT_ID)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    if (!tokenRes.ok) throw new Error(`Zoom auth failed: ${tokenRes.status}`)
    const tokenData = await tokenRes.json()
    accessToken = tokenData.access_token
  } catch (err) {
    console.error('Zoom token error', err)
    res.status(502).json({ error: 'Could not authenticate with Zoom' }); return
  }

  // Create webinar with registration enabled
  let webinar
  try {
    const webinarRes = await fetch('https://api.zoom.us/v2/users/me/webinars', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: title,
        type: 5,
        start_time: date || undefined,
        duration: 60,
        settings: {
          host_video: true,
          panelists_video: true,
          registration: true,
          approval_type: 0,
          registration_type: 1,
          registrants_confirmation_email: true,
        },
      }),
    })
    if (!webinarRes.ok) {
      const e = await webinarRes.json()
      throw new Error(e.message || 'Webinar creation failed')
    }
    webinar = await webinarRes.json()
  } catch (err) {
    console.error('Zoom webinar error', err)
    res.status(502).json({ error: err.message }); return
  }

  // Generate 3 guest registrant links
  const guestSlots = [
    speaker || 'Guest speaker',
    'Co-host / backup',
    'Producer slot',
  ]
  const guestLinks = []
  for (const label of guestSlots) {
    try {
      const regRes = await fetch(`https://api.zoom.us/v2/webinars/${webinar.id}/registrants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: label,
          email: `placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@noreply.vygo.com`,
        }),
      })
      if (regRes.ok) {
        const reg = await regRes.json()
        guestLinks.push({ label, url: reg.join_url })
      }
    } catch { /* skip failed registrant */ }
  }

  res.status(200).json({
    webinarId: webinar.id,
    meetingId: webinar.id,
    topic: webinar.topic,
    startTime: webinar.start_time,
    joinUrl: webinar.join_url,
    hostUrl: webinar.start_url,
    guestLinks,
  })
}
