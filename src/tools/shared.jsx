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

export async function callBrief(payload) {
  const res = await fetch('/api/generate-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const raw = await res.text()
  const contentType = res.headers.get('content-type') || ''

  if (!res.ok) {
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

  if (contentType.includes('application/json')) {
    const body = raw ? JSON.parse(raw) : {}
    if (!body.text) throw new Error('Generation returned an empty draft.')
    return body.text
  }

  const text = raw.replace(/^\uFEFF/, '').trim()
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

export function ResultBlock({ text }) {
  const [copied, setCopied] = useState(false)
  if (!text) return null

  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[13px] font-semibold">Generated draft</p>
        <Button type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy all'}
        </Button>
      </div>
      <Card>
        <CardContent className="max-h-[min(60vh,640px)] overflow-y-auto scroll-slim p-4">
          <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted-foreground">{text}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
