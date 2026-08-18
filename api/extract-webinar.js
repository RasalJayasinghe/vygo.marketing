// POST { transcript } → { title, speaker, date, dateConfirmed, notes, joelAction }
// Uses Claude Haiku for fast, cheap extraction. Falls back gracefully if unconfigured.

const SYSTEM = `You extract structured data from webinar planning meeting transcripts.
Return ONLY a JSON object — no prose, no markdown fences, no explanation.

Fields:
- title: concise webinar topic/title (string, max 80 chars, or "" if unclear)
- speaker: guest speaker full name (string, or "" if not mentioned)
- date: confirmed date and time in natural language, e.g. "Tuesday 2 Sep, 12pm AEST" (string, or "" if not confirmed)
- dateConfirmed: true only if an explicit date was mutually agreed on in the conversation (boolean)
- notes: 2–3 sentence summary of key discussion points and audience fit (string)
- joelAction: any "I'll reach out to X" or pending follow-up action Joel mentioned (string, or "")`

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.status(405).end(); return }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' }); return }

  const { transcript } = req.body || {}
  if (!String(transcript || '').trim()) { res.status(400).json({ error: 'transcript is required' }); return }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM,
        messages: [{ role: 'user', content: `Transcript:\n\n${String(transcript).slice(0, 40_000)}` }],
      }),
    })

    if (!response.ok) { res.status(response.status).json({ error: 'Extraction service error' }); return }

    const data = await response.json()
    const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

    try {
      res.status(200).json(JSON.parse(cleaned))
    } catch {
      res.status(500).json({ error: 'Could not parse extraction result', raw })
    }
  } catch (err) {
    console.error('extract-webinar error', err)
    res.status(502).json({ error: 'Failed to reach extraction service' })
  }
}
