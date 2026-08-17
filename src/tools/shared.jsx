import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'

export async function callBrief(payload) {
  const res = await fetch('/api/generate-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Generation failed')
  return body.text
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
