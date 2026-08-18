// /api/generate-brief — server-side call to the Anthropic API.
//
// Requires ANTHROPIC_API_KEY set in Netlify → Site configuration → Environment variables.
// Never call the Anthropic API directly from the browser — the key would be exposed.
//
// Prompts are sourced from api/prompts/*.md (adapted from Cursor skills:
// podcast-repurposer, vygo-webinar-campaign-builder).
//
// Body: { kind: 'webinar' | 'podcast' | 'edm', ...fields }
//   kind = 'webinar': { topic, speaker, audience, date, notes, assets }
//   kind = 'podcast': { transcript }
//   kind = 'edm':     { topic, speaker, audience, date, notes }

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { anthropicAuthError, anthropicKeyConfigError, readAnthropicApiKey } from './anthropicKey.js'

// Do not name this `__dirname` — Netlify's esbuild shim already declares that,
// and a second declaration crashes the function on load.
const moduleDir = dirname(fileURLToPath(import.meta.url))

function loadPrompt(name) {
  const file = `${name}.md`
  const candidates = [
    join(process.cwd(), 'api/prompts', file),
    join(moduleDir, 'prompts', file),
    join(moduleDir, '../../api/prompts', file),
    join(moduleDir, '../api/prompts', file),
  ]
  for (const path of candidates) {
    if (existsSync(path)) return readFileSync(path, 'utf8')
  }
  throw new Error(`Prompt file missing: api/prompts/${file}`)
}

let WEBINAR_SYSTEM_PROMPT
let PODCAST_SYSTEM_PROMPT

function webinarPrompt() {
  WEBINAR_SYSTEM_PROMPT ??= loadPrompt('webinar-campaign-builder')
  return WEBINAR_SYSTEM_PROMPT
}

function podcastPrompt() {
  PODCAST_SYSTEM_PROMPT ??= loadPrompt('podcast-repurposer')
  return PODCAST_SYSTEM_PROMPT
}

const MAX_TRANSCRIPT_LENGTH = 60_000
const MAX_FIELD_LENGTH = 4_000
const MAX_EDM_NOTES_LENGTH = 12_000

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

  const apiKey = readAnthropicApiKey()
  const keyError = anthropicKeyConfigError(apiKey)
  if (keyError) {
    res.status(500).json({ error: keyError })
    return
  }

  const { kind } = req.body || {}

  let system, userMessage, maxTokens
  try {
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
      system = webinarPrompt()
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
      maxTokens = 8192
    } else if (kind === 'edm') {
      const { topic, speaker, audience, date, notes } = req.body
      const cleanTopic = cleanText(topic, 500)
      if (!cleanTopic) {
        res.status(400).json({ error: 'Topic is required.' })
        return
      }
      system = webinarPrompt()
      userMessage = [
        `Topic: ${cleanTopic}`,
        speaker ? `Speaker(s): ${cleanText(speaker, 500)}` : null,
        audience ? `Audience: ${cleanText(audience, 500)}` : null,
        date ? `Date/format: ${cleanText(date, 300)}` : null,
        notes ? `Notes / planning transcript:\n${cleanText(notes, MAX_EDM_NOTES_LENGTH)}` : null,
        'Assets requested: Registration EDM',
        'Output three complete registration email variants labeled Variant A, Variant B, and Variant C. Each variant needs a distinct promotional angle, 3 subject-line options, preview text, and a full scannable body. Include a short Positioning section first. Do not produce any other campaign assets.',
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
      system = podcastPrompt()
      userMessage = `Transcript:\n\n${cleanTranscript}`
      maxTokens = 2048
    } else {
      res.status(400).json({ error: 'kind must be "webinar", "podcast", or "edm"' })
      return
    }
  } catch (err) {
    console.error('Prompt load failed', err)
    res.status(500).json({ error: err.message || 'Could not load generation prompts.' })
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
      const raw = await response.text()
      let detail = ''
      try {
        detail = JSON.parse(raw)?.error?.message || ''
      } catch { /* ignore */ }
      console.error('Anthropic error', response.status, raw.slice(0, 500))
      res.status(response.status).json({
        error: anthropicAuthError(response.status, detail) || 'The generation service could not complete this request.',
      })
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
