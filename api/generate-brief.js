// /api/generate-brief — server-side call to the Anthropic API.
// Streams tokens so proxies do not idle-timeout during long briefs.
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

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}

function prepareJob(body) {
  const { kind } = body || {}

  if (kind === 'webinar') {
    const { topic, speaker, audience, date, notes, assets } = body
    const cleanTopic = cleanText(topic, 500)
    if (!cleanTopic) return { error: 'Topic is required.', status: 400 }
    const requestedAssets = Array.isArray(assets)
      ? assets.slice(0, 12).map(asset => cleanText(asset, 100)).filter(Boolean)
      : []
    return {
      system: webinarPrompt(),
      userMessage: [
        `Topic: ${cleanTopic}`,
        speaker ? `Speaker(s): ${cleanText(speaker, 500)}` : null,
        audience ? `Audience: ${cleanText(audience, 500)}` : null,
        date ? `Date/format: ${cleanText(date, 300)}` : null,
        notes ? `Notes: ${cleanText(notes)}` : null,
        requestedAssets.length
          ? `Assets requested: ${requestedAssets.join(', ')}`
          : 'Assets requested: Title + alternatives, Short description, LinkedIn launch post',
        'Keep each asset tight and ready to paste. Prefer shorter drafts over covering every possible angle.',
      ].filter(Boolean).join('\n'),
      maxTokens: 4096,
    }
  }

  if (kind === 'edm') {
    const { topic, speaker, audience, date, notes } = body
    const cleanTopic = cleanText(topic, 500)
    if (!cleanTopic) return { error: 'Topic is required.', status: 400 }
    return {
      system: webinarPrompt(),
      userMessage: [
        `Topic: ${cleanTopic}`,
        speaker ? `Speaker(s): ${cleanText(speaker, 500)}` : null,
        audience ? `Audience: ${cleanText(audience, 500)}` : null,
        date ? `Date/format: ${cleanText(date, 300)}` : null,
        notes ? `Notes / planning transcript:\n${cleanText(notes, MAX_EDM_NOTES_LENGTH)}` : null,
        'Assets requested: Registration EDM',
        'Output three complete registration email variants labeled Variant A, Variant B, and Variant C. Each variant needs a distinct promotional angle, 3 subject-line options, preview text, and a full scannable body. Include a short Positioning section first. Do not produce any other campaign assets.',
      ].filter(Boolean).join('\n'),
      maxTokens: 3072,
    }
  }

  if (kind === 'podcast') {
    const { transcript } = body
    const cleanTranscript = cleanText(transcript, MAX_TRANSCRIPT_LENGTH)
    if (!cleanTranscript) return { error: 'Transcript is required.', status: 400 }
    if (String(transcript).length > MAX_TRANSCRIPT_LENGTH) {
      return { error: 'Transcript is too long. Please keep it under 60,000 characters.', status: 413 }
    }
    return {
      system: podcastPrompt(),
      userMessage: `Transcript:\n\n${cleanTranscript}`,
      maxTokens: 2048,
    }
  }

  return { error: 'kind must be "webinar", "podcast", or "edm"', status: 400 }
}

function pipeAnthropicSse(anthropicBody) {
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  const reader = anthropicBody.getReader()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      // First byte keeps idle proxies from closing before Claude starts streaming.
      controller.enqueue(encoder.encode('\n'))
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]') continue
            let event
            try {
              event = JSON.parse(payload)
            } catch {
              continue
            }
            if (event.type === 'content_block_delta' && event.delta?.text) {
              controller.enqueue(encoder.encode(event.delta.text))
            }
            if (event.type === 'error') {
              const message = event.error?.message || 'Generation failed'
              controller.enqueue(encoder.encode(`\n\n[Generation error: ${message}]`))
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      } finally {
        reader.releaseLock?.()
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json(405, { error: 'POST only' })
  }

  const apiKey = readAnthropicApiKey()
  const keyError = anthropicKeyConfigError(apiKey)
  if (keyError) return json(500, { error: keyError })

  let body = {}
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid JSON body.' })
  }

  let job
  try {
    job = prepareJob(body)
  } catch (err) {
    console.error('Prompt load failed', err)
    return json(500, { error: err.message || 'Could not load generation prompts.' })
  }
  if (job.error) return json(job.status || 400, { error: job.error })

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
        max_tokens: job.maxTokens,
        system: job.system,
        stream: true,
        messages: [{ role: 'user', content: job.userMessage }],
      }),
    })

    if (!response.ok) {
      const raw = await response.text()
      let detail = ''
      try {
        detail = JSON.parse(raw)?.error?.message || ''
      } catch { /* ignore */ }
      console.error('Anthropic error', response.status, raw.slice(0, 500))
      return json(response.status, {
        error: anthropicAuthError(response.status, detail) || 'The generation service could not complete this request.',
      })
    }

    return new Response(pipeAnthropicSse(response.body), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('Anthropic request failed', err)
    return json(502, { error: 'Failed to reach the generation service.' })
  }
}
