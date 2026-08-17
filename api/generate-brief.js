// /api/generate-brief — server-side call to the Anthropic API.
//
// Requires ANTHROPIC_API_KEY set in Vercel → Project → Settings →
// Environment Variables. Never call the Anthropic API directly from the
// browser — the key would be exposed to anyone who opens dev tools.
//
// Prompts are sourced from api/prompts/*.md (adapted from Cursor skills:
// podcast-repurposer, vygo-webinar-campaign-builder).
//
// Body: { kind: 'webinar' | 'podcast', ...fields }
//   kind = 'webinar': { topic, speaker, audience, date, notes, assets }
//   kind = 'podcast': { transcript }

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadPrompt(name) {
  return readFileSync(join(__dirname, 'prompts', `${name}.md`), 'utf8')
}

const WEBINAR_SYSTEM_PROMPT = loadPrompt('webinar-campaign-builder')
const PODCAST_SYSTEM_PROMPT = loadPrompt('podcast-repurposer')

const MAX_TRANSCRIPT_LENGTH = 60_000
const MAX_FIELD_LENGTH = 4_000

function cleanText(value, maxLength = MAX_FIELD_LENGTH) {
  return String(value || '').trim().slice(0, maxLength)
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ error: 'POST only' })
    return
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' })
    return
  }

  const { kind } = req.body || {}

  let system, userMessage, maxTokens
  if (kind === 'webinar') {
    const { topic, speaker, audience, date, notes, assets } = req.body
    const cleanTopic = cleanText(topic, 500)
    if (!cleanTopic) {
      res.status(400).json({ error: 'Topic is required.' })
      return
    }
    const requestedAssets = Array.isArray(assets)
      ? assets.slice(0, 12).map(asset => cleanText(asset, 100)).filter(Boolean)
      : []
    system = WEBINAR_SYSTEM_PROMPT
    userMessage = [
      `Topic: ${cleanTopic}`,
      speaker ? `Speaker(s): ${cleanText(speaker, 500)}` : null,
      audience ? `Audience: ${cleanText(audience, 500)}` : null,
      date ? `Date/format: ${cleanText(date, 300)}` : null,
      notes ? `Notes: ${cleanText(notes)}` : null,
      requestedAssets.length
        ? `Assets requested: ${requestedAssets.join(', ')}`
        : 'Assets requested: Title + alternatives, Short description, LinkedIn launch post',
    ].filter(Boolean).join('\n')
    maxTokens = 4096
  } else if (kind === 'podcast') {
    const { transcript } = req.body
    const cleanTranscript = cleanText(transcript, MAX_TRANSCRIPT_LENGTH)
    if (!cleanTranscript) {
      res.status(400).json({ error: 'Transcript is required.' })
      return
    }
    if (String(transcript).length > MAX_TRANSCRIPT_LENGTH) {
      res.status(413).json({ error: 'Transcript is too long. Please keep it under 60,000 characters.' })
      return
    }
    system = PODCAST_SYSTEM_PROMPT
    userMessage = `Transcript:\n\n${cleanTranscript}`
    maxTokens = 2048
  } else {
    res.status(400).json({ error: 'kind must be "webinar" or "podcast"' })
    return
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      await response.text()
      res.status(response.status).json({ error: 'The generation service could not complete this request.' })
      return
    }

    const data = await response.json()
    const text = (data.content || [])
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n')

    res.status(200).json({ text })
  } catch (err) {
    console.error('Anthropic request failed', err)
    res.status(502).json({ error: 'Failed to reach the generation service.' })
  }
}
