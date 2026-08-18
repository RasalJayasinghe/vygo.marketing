import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { callBrief, Field, ResultBlock } from './shared.jsx'

const MAX_TRANSCRIPT_LENGTH = 60_000

export default function PodcastRepurposer() {
  const [transcript, setTranscript] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResult('')
    try {
      setResult(await callBrief({ kind: 'podcast', transcript }, { onChunk: setResult }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Paste a transcript — we find one sharp idea (not a summary) and draft a LinkedIn post plus Spotify caption.
      </p>
      <Field label="Episode transcript *">
        <textarea
          className="min-h-[280px] w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          maxLength={MAX_TRANSCRIPT_LENGTH}
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste the full episode transcript here…"
          required
        />
      </Field>
      <p className="-mt-2 mb-4 text-right text-[11px] tabular-nums text-muted-foreground">
        {transcript.length.toLocaleString()} / {MAX_TRANSCRIPT_LENGTH.toLocaleString()}
      </p>
      <Button type="submit" className="w-full sm:w-auto" disabled={loading || !transcript.trim()}>
        {loading ? 'Repurposing…' : 'Generate LinkedIn post + Spotify caption'}
      </Button>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <ResultBlock text={result} streaming={loading} />
    </form>
  )
}
