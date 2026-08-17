import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { cn } from '@/lib/utils'
import { callBrief, Field, ResultBlock } from './shared.jsx'

const WEBINAR_ASSET_OPTIONS = [
  'Title + alternatives',
  'Short description',
  'Landing page copy',
  'LinkedIn launch post',
  'Speaker announcement post',
  'Registration EDM',
  'Reminder EDM',
  'Last chance to register',
  'Post-webinar follow-up',
  'Repurposing ideas',
]

export default function WebinarBrief() {
  const [topic, setTopic] = useState('')
  const [speaker, setSpeaker] = useState('')
  const [audience, setAudience] = useState('')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [assets, setAssets] = useState(['Title + alternatives', 'Short description', 'LinkedIn launch post'])
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleAsset(asset) {
    setAssets(prev => prev.includes(asset) ? prev.filter(x => x !== asset) : [...prev, asset])
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResult('')
    try {
      setResult(await callBrief({ kind: 'webinar', topic, speaker, audience, date, notes, assets }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Add campaign context, then choose assets. Output starts with positioning (challenge, angles, CTA), then your selected assets.
      </p>
      <Field label="Topic *">
        <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Reducing no-shows in student support appointments" required />
      </Field>
      <Field label="Speaker(s)">
        <Input value={speaker} onChange={e => setSpeaker(e.target.value)} placeholder="Name, title, institution" />
      </Field>
      <Field label="Audience">
        <Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g. VPs of Student Success" />
      </Field>
      <Field label="Date / format">
        <Input value={date} onChange={e => setDate(e.target.value)} placeholder="e.g. 14 Sept, live + on-demand" />
      </Field>
      <Field label="Notes">
        <textarea
          className="min-h-[84px] w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          maxLength={4000}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Must-include points, campaign themes, deadlines"
        />
      </Field>
      <div className="mb-4">
        <p className="mb-2 text-[12px] font-medium text-muted-foreground">Assets to generate</p>
        <div className="flex flex-wrap gap-1.5">
          {WEBINAR_ASSET_OPTIONS.map(asset => (
            <button
              type="button"
              key={asset}
              onClick={() => toggleAsset(asset)}
              className={cn(
                'rounded-md border px-2 py-1 text-[11px]',
                assets.includes(asset) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              )}
            >
              {asset}
            </button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full sm:w-auto" disabled={loading || !topic.trim()}>
        {loading ? 'Generating…' : 'Generate brief'}
      </Button>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <ResultBlock text={result} />
    </form>
  )
}
