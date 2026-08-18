import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'

function generationFailureMessage(status, raw) {
  const text = String(raw || '')
  if (/inactivity timeout/i.test(text) || status === 504 || status === 408) {
    return 'Claude is still writing and the connection timed out. Click Generate again — drafts now stream so this should stay open.'
  }
  if (/^\s*</.test(text) || /<html/i.test(text)) {
    return `Generation failed (${status || 'proxy error'}). Try again in a moment.`
  }
  return text.trim().slice(0, 240) || `Generation failed (${status})`
}

async function throwIfBriefFailed(res, raw, contentType) {
  if (res.ok) return
  if (contentType.includes('application/json')) {
    try {
      const body = JSON.parse(raw)
      throw new Error(body.error || body.errorMessage || 'Generation failed')
    } catch (err) {
      if (err instanceof SyntaxError) throw new Error(generationFailureMessage(res.status, raw))
      throw err
    }
  }
  throw new Error(generationFailureMessage(res.status, raw))
}

export async function callBrief(payload, { onChunk } = {}) {
  const res = await fetch('/api/generate-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const contentType = res.headers.get('content-type') || ''

  if (!res.ok || contentType.includes('application/json') || !res.body) {
    const raw = await res.text()
    await throwIfBriefFailed(res, raw, contentType)
    if (contentType.includes('application/json')) {
      const body = raw ? JSON.parse(raw) : {}
      if (!body.text) throw new Error('Generation returned an empty draft.')
      onChunk?.(body.text)
      return body.text
    }
    const text = raw.replace(/^\uFEFF/, '').trim()
    if (!text) throw new Error('Generation returned an empty draft.')
    onChunk?.(text)
    return text
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onChunk?.(text)
  }
  text = (text + decoder.decode()).replace(/^\uFEFF/, '').trim()
  onChunk?.(text)
  if (!text) throw new Error('Generation returned an empty draft.')
  return text
}

export function Field({ label, children }) {
  return (
    <label className="mb-3.5 block">
      <span className="mb-1.5 block text-[12px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

export function ResultBlock({ text, streaming = false }) {
  const [copied, setCopied] = useState(false)
  if (!text && !streaming) return null

  function copy() {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold">
          {streaming ? 'Writing… you can copy anytime' : 'Generated draft'}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={copy} disabled={!text}>
          {copied ? 'Copied' : streaming ? 'Copy so far' : 'Copy all'}
        </Button>
      </div>
      <Card>
        <CardContent className="max-h-[min(60vh,640px)] overflow-y-auto scroll-slim p-4">
          <pre className="select-text whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted-foreground">
            {text}
            {streaming ? <span className="ml-0.5 inline-block animate-pulse text-brand">▍</span> : null}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
