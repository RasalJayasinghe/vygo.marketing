import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle, ArrowLeft, Calendar, CheckCircle, Clock,
  Loader2, Mail, MessageSquare, Mic, MicOff, Plus,
  RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Upload,
  User, Video, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import { cn } from '@/lib/utils'

// ── Step definitions ──────────────────────────────────────────────────────

const STEPS = [
  {
    id: 'edm',
    label: 'EDM creation',
    integration: 'Claude AI',
    IntegrationIcon: Sparkles,
    description: 'Generate three email variants from the planning session transcript. All variants need approval before use.',
    actionLabel: 'Generate EDM variants',
    approvalLabel: 'Approve variants',
    needsApproval: true,
    fallbackOutput: (p) =>
      `Variant A — "The future of ${p.title}"\nVariant B — "How top universities are changing the game"\nVariant C — "Join us: a live conversation with ${p.speaker || '[Speaker]'}"\n\n→ Three full email drafts ready for review.`,
  },
  {
    id: 'future-campus',
    label: 'Future Campus email to Jayson',
    integration: 'Gmail',
    IntegrationIcon: Mail,
    description: 'Auto-draft outbound email to Jayson at Future Campus from the EDM output. Manual approval required — no fully automated outbound.',
    note: "Joel's rule: no fully automated outbound emails.",
    actionLabel: 'Draft email',
    approvalLabel: 'Approve & send via Gmail',
    needsApproval: true,
    fallbackOutput: (p) =>
      `To: jayson@futurecampus.com\nSubject: Webinar guest spot — ${p.title}\n\nHi Jayson,\n\nWe'd love to have you join our upcoming webinar on "${p.title}"${p.date ? ` on ${p.date}` : ''}. Given Future Campus's audience of higher-ed marketers, we think it'd be a great fit.\n\n[Speaker intro and CTA goes here]\n\n— Vygo Marketing`,
  },
  {
    id: 'zoom',
    label: 'Zoom event & guest invites',
    integration: 'Zoom API',
    IntegrationIcon: Video,
    description: 'Auto-create the Zoom event and generate three guest invite links. Invite email drafted from template — approve before sending.',
    actionLabel: 'Create Zoom event',
    approvalLabel: 'Approve & send invites',
    needsApproval: true,
  },
  {
    id: 'chase',
    label: 'Chase Joel / Lyndon',
    integration: 'Slack',
    IntegrationIcon: MessageSquare,
    description: 'Send a Slack ping when workflow is blocked on their action. Pings are recorded — the cron job follows up every 3 days automatically. Joel replies "yes" to advance.',
    actionLabel: 'Send Slack ping',
    needsApproval: false,
  },
  {
    id: 'guest-response',
    label: 'Guest response',
    integration: null,
    IntegrationIcon: null,
    description: 'Guest confirms → workflow continues. Guest declines or no reply after 7 days → workflow pauses, new guest search triggered, meeting with Joel/Lyndon booked.',
    needsApproval: false,
    isGuestStep: true,
  },
  {
    id: 'brief',
    label: 'Brief & questions',
    integration: 'Claude AI',
    IntegrationIcon: Sparkles,
    description: 'Generate the full campaign brief and speaker Q&A once partner and date are both confirmed. Joel adds 1:1 context before generation.',
    actionLabel: 'Generate brief',
    needsApproval: false,
    isBriefStep: true,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────

function regexExtract(text) {
  const datePatterns = [
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{4})?)/gi,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?)/gi,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
  ]
  let detectedDate = null
  for (const pat of datePatterns) {
    const m = text.match(pat)
    if (m) { detectedDate = m[0]; break }
  }
  const topicM = text.match(/(?:webinar|topic|session|presenting?|about|discussing)\s+(?:on|:)?\s*["']?([^"'\n.]{10,70})/i)
  const speakerM = text.match(/(?:speaker[s]?|presenting|hosted by|with|featuring)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)
  return { title: topicM ? topicM[1].trim() : '', speaker: speakerM ? speakerM[1] : '', date: detectedDate || '', dateConfirmed: !!detectedDate, notes: '', joelAction: '' }
}

function makeProject({ title, speaker, date, notes, transcript }) {
  const steps = STEPS.map(() => ({ status: 'pending', output: null }))
  steps[0].status = 'in_progress'
  return {
    id: Date.now().toString(),
    title: title || 'Untitled webinar',
    speaker, date, notes, transcript,
    joelContext: '',
    createdAt: new Date().toISOString(),
    steps,
  }
}

function getActiveStepIdx(project) {
  return project.steps.findIndex(s => s.status !== 'completed')
}

function overallStatus(project) {
  const idx = getActiveStepIdx(project)
  if (idx === -1) return { label: 'Complete', color: 'text-green-600 bg-green-50 border-green-200' }
  const s = project.steps[idx]
  if (s.status === 'blocked') return { label: 'Blocked', color: 'text-red-600 bg-red-50 border-red-200' }
  if (s.status === 'waiting_approval') return { label: 'Needs approval', color: 'text-amber-600 bg-amber-50 border-amber-200' }
  return { label: `Step ${idx + 1} of ${STEPS.length}`, color: 'text-blue-600 bg-blue-50 border-blue-200' }
}

const EMPTY_FORM = { title: '', speaker: '', date: '', notes: '' }

// ── Main component ─────────────────────────────────────────────────────────

export default function WebinarWorkflow() {
  const [projects, setProjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vygo-webinar-projects') || '[]') } catch { return [] }
  })
  const [selectedId, setSelectedId] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [newStep, setNewStep] = useState('drop')
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [transcript, setTranscript] = useState('')
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractedDate, setExtractedDate] = useState(null)
  const [joelAction, setJoelAction] = useState('')
  const [listening, setListening] = useState(false)
  const [stepLoading, setStepLoading] = useState({})
  const [stepError, setStepError] = useState({})
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('vygo-webinar-projects', JSON.stringify(projects))
  }, [projects])

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  const updateProject = useCallback((id, fn) => {
    setProjects(prev => prev.map(p => p.id === id ? fn(p) : p))
  }, [])

  // ── Transcript processing ──
  const processTranscript = useCallback(async (text) => {
    setTranscript(text)
    setNewStep('details')
    setExtractLoading(true)
    setJoelAction('')
    setExtractedDate(null)

    try {
      const res = await fetch('/api/extract-webinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      })
      if (res.ok) {
        const data = await res.json()
        setExtractedDate(data.dateConfirmed ? data.date : null)
        setJoelAction(data.joelAction || '')
        setForm({ title: data.title || '', speaker: data.speaker || '', date: data.date || '', notes: data.notes || '' })
        setExtractLoading(false)
        return
      }
    } catch { /* fall through to regex */ }

    const fallback = regexExtract(text)
    setExtractedDate(fallback.dateConfirmed ? fallback.date : null)
    setForm({ title: fallback.title, speaker: fallback.speaker, date: fallback.date, notes: '' })
    setExtractLoading(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processTranscript(ev.target.result)
    reader.readAsText(file)
  }, [processTranscript])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processTranscript(ev.target.result)
    reader.readAsText(file)
  }, [processTranscript])

  // ── Voice input ──
  const startVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = false; rec.interimResults = false
    rec.onresult = e => { setForm(f => ({ ...f, date: e.results[0][0].transcript })); setListening(false) }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec; rec.start(); setListening(true)
  }, [])

  const stopVoice = useCallback(() => { recognitionRef.current?.stop(); setListening(false) }, [])

  // ── Create project ──
  const saveProject = useCallback(() => {
    const project = makeProject({ ...form, transcript })
    setProjects(prev => [project, ...prev])
    setSelectedId(project.id)
    resetNew()
  }, [form, transcript])

  const resetNew = () => {
    setShowNew(false); setNewStep('drop'); setForm(EMPTY_FORM)
    setTranscript(''); setExtractedDate(null); setJoelAction('')
    setExtractLoading(false); setListening(false); recognitionRef.current?.stop()
  }

  // ── Pipeline step actions ──
  const handleStepAction = useCallback(async (projectId, stepIdx, action) => {
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const stepDef = STEPS[stepIdx]
    const setLoading = (v) => setStepLoading(l => ({ ...l, [stepIdx]: v }))
    const setError = (v) => setStepError(e => ({ ...e, [stepIdx]: v }))

    const advanceStep = (output, waitApproval = false) => {
      updateProject(projectId, p => {
        const steps = p.steps.map(s => ({ ...s }))
        steps[stepIdx] = { status: waitApproval ? 'waiting_approval' : 'completed', output }
        if (!waitApproval && stepIdx + 1 < steps.length) steps[stepIdx + 1].status = 'in_progress'
        return { ...p, steps }
      })
    }

    // Zoom API
    if (stepDef.id === 'zoom' && (action === 'generate' || action === 'send')) {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/zoom-create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: project.title, date: project.date, speaker: project.speaker }),
        })
        const data = await res.json()
        if (res.status === 503) {
          // Graceful degradation — Zoom not configured
          const placeholder = `Event: ${project.title}\nDate: ${project.date || 'TBC — confirm date before creating event'}\nHost link:  zoom.us/j/9xx-xxx-xxx?role=host\nGuest link 1: zoom.us/j/9xx-xxx-xxx?tk=guest1\nGuest link 2: zoom.us/j/9xx-xxx-xxx?tk=guest2\nGuest link 3: zoom.us/j/9xx-xxx-xxx?tk=guest3\n\n⚠ Zoom API not configured — placeholder links shown.\n${data.setup}`
          advanceStep(placeholder, true)
        } else if (!res.ok) {
          throw new Error(data.error || 'Zoom API error')
        } else {
          const output = [
            `Event: ${data.topic}`,
            `Date: ${data.startTime || project.date || 'TBC'}`,
            `Host link: ${data.hostUrl}`,
            ...data.guestLinks.map((g, i) => `Guest link ${i + 1} (${g.label}): ${g.url}`),
          ].join('\n')
          advanceStep(output, true)
        }
      } catch (err) {
        setError(err.message)
      } finally { setLoading(false) }
      return
    }

    // Slack ping
    if (stepDef.id === 'chase' && (action === 'generate' || action === 'send')) {
      setLoading(true); setError(null)
      try {
        const res = await fetch('/api/slack-ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, projectTitle: project.title, speaker: project.speaker, date: project.date }),
        })
        const data = await res.json()
        const sent = data.slackSent ? '✓ Sent to Slack.' : '⚠ SLACK_WEBHOOK_URL not configured — preview only.\nSet it in Netlify → Site configuration → Environment variables.'
        advanceStep(`${data.preview}\n\n${sent}`, false)
      } catch (err) {
        setError(err.message)
      } finally { setLoading(false) }
      return
    }

    // Claude brief
    if (stepDef.id === 'brief' && (action === 'generate' || action === 'send')) {
      setLoading(true); setError(null)
      try {
        const notesLines = [project.notes, project.joelContext ? `Joel 1:1 context:\n${project.joelContext}` : ''].filter(Boolean).join('\n\n')
        const res = await fetch('/api/generate-brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'webinar',
            topic: project.title,
            speaker: project.speaker,
            date: project.date,
            notes: notesLines,
            assets: [
              'Title + alternatives', 'Short description', 'Landing page copy',
              'LinkedIn launch post', 'Speaker announcement post',
              'Registration EDM', 'Reminder EDM', 'Last chance to register',
              'Post-webinar follow-up', 'Repurposing ideas',
            ],
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Brief generation failed')
        advanceStep(data.text, false)
      } catch (err) {
        setError(err.message)
      } finally { setLoading(false) }
      return
    }

    // EDM + Future Campus — fallback to local output (no dedicated API yet)
    if ((action === 'generate' || action === 'send') && stepDef.fallbackOutput) {
      advanceStep(stepDef.fallbackOutput(project), stepDef.needsApproval)
      return
    }

    // Synchronous state transitions
    updateProject(projectId, p => {
      const steps = p.steps.map(s => ({ ...s }))
      if (action === 'approve') {
        steps[stepIdx].status = 'completed'
        if (stepIdx + 1 < steps.length) steps[stepIdx + 1].status = 'in_progress'
      }
      if (action === 'revise') { steps[stepIdx].status = 'in_progress'; steps[stepIdx].output = null }
      if (action === 'guest_confirmed') {
        steps[stepIdx].status = 'completed'
        if (stepIdx + 1 < steps.length) steps[stepIdx + 1].status = 'in_progress'
      }
      if (action === 'guest_declined') { steps[stepIdx].status = 'blocked' }
      if (action === 'restart_guest') {
        steps[3] = { status: 'in_progress', output: null }
        steps[4] = { status: 'pending', output: null }
      }
      return { ...p, steps }
    })
  }, [projects, updateProject])

  const handleUpdateJoelContext = useCallback((id, val) => {
    updateProject(id, p => ({ ...p, joelContext: val }))
  }, [updateProject])

  const deleteProject = useCallback((id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) setSelectedId(null)
  }, [selectedId])

  // ── Render ─────────────────────────────────────────────────────────────
  if (selectedProject) {
    return (
      <PipelineView
        project={selectedProject}
        onBack={() => setSelectedId(null)}
        onStepAction={handleStepAction}
        onDelete={() => deleteProject(selectedProject.id)}
        onUpdateDate={(date) => updateProject(selectedProject.id, p => ({ ...p, date }))}
        onUpdateJoelContext={(val) => handleUpdateJoelContext(selectedProject.id, val)}
        stepLoading={stepLoading}
        stepError={stepError}
      />
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length === 0 ? 'No webinars yet.' : `${projects.length} webinar${projects.length !== 1 ? 's' : ''}`}
        </p>
        {!showNew && (
          <Button onClick={() => setShowNew(true)} size="sm">
            <Plus className="mr-1.5 size-3.5" /> New webinar
          </Button>
        )}
      </div>

      {/* ── New webinar panel ── */}
      {showNew && (
        <Card className="mb-6 border-[#c8dfc8]">
          <CardContent className="pt-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">New webinar</p>
              <button type="button" onClick={resetNew} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            {newStep === 'drop' && (
              <div className="space-y-3">
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'flex min-h-[148px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed transition-colors',
                    dragging ? 'border-forest bg-[#f0f6f0]' : 'border-border hover:border-muted-foreground/40 hover:bg-muted/20'
                  )}
                >
                  <Upload className="size-7 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Drop your meeting transcript here</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Joel/Lyndon meeting notes · .txt or .md · AI will parse it</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileChange} />
                </div>
                <p className="text-xs text-muted-foreground">Or paste transcript text:</p>
                <textarea
                  className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-forest"
                  rows={4}
                  placeholder="Paste meeting notes here…"
                  onBlur={e => { if (e.target.value.trim().length > 30) processTranscript(e.target.value) }}
                />
              </div>
            )}

            {newStep === 'details' && (
              <div className="space-y-4">
                {extractLoading && (
                  <div className="flex items-center gap-2 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Extracting details from transcript with Claude…
                  </div>
                )}

                {!extractLoading && !extractedDate && (
                  <div className="flex items-start gap-2.5 rounded-md bg-amber-50 p-3">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Date not confirmed in transcript</p>
                      <p className="mt-0.5 text-xs text-amber-700">
                        {joelAction ? `Joel's action item: "${joelAction}" — no date set yet.` : "Joel may have said 'I'll reach out' with no date."}
                        {' '}Enter it manually or use voice. You can proceed without it — the workflow will prompt for it.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Webinar title</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. How to scale student success"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Speaker(s)</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest"
                      value={form.speaker}
                      onChange={e => setForm(f => ({ ...f, speaker: e.target.value }))}
                      placeholder="e.g. Joel Smith"
                    />
                  </label>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Date & time</span>
                    <button
                      type="button"
                      onClick={listening ? stopVoice : startVoice}
                      className={cn(
                        'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                        listening ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {listening ? <><MicOff className="size-3" /> Stop</> : <><Mic className="size-3" /> Voice input</>}
                    </button>
                  </div>
                  <input
                    className={cn(
                      'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest',
                      listening ? 'border-red-300 bg-red-50/40' : 'border-border bg-background'
                    )}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    placeholder={listening ? 'Listening…' : 'e.g. Thursday 28 Aug, 12pm AEST'}
                  />
                  {listening && <p className="mt-1 animate-pulse text-xs text-red-500">Recording… speak the date and time.</p>}
                </div>

                {form.notes && (
                  <div className="rounded-md bg-muted/40 px-3 py-2">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Claude's summary</p>
                    <p className="text-xs text-foreground">{form.notes}</p>
                  </div>
                )}

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-muted-foreground">Additional notes</span>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest"
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional context or audience details…"
                  />
                </label>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setNewStep('drop')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                  <Button size="sm" onClick={saveProject} disabled={extractLoading}>
                    {form.date ? 'Create & start workflow' : 'Create — date TBC'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Project list ── */}
      {projects.length === 0 && !showNew && (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border text-center">
          <Video className="size-7 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">No webinar projects yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Click "New webinar" and drop a meeting transcript to start the 6-step workflow</p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {projects.map(project => {
          const status = overallStatus(project)
          const activeIdx = getActiveStepIdx(project)
          const activeStep = activeIdx >= 0 ? STEPS[activeIdx] : null
          return (
            <Card
              key={project.id}
              className="group cursor-pointer transition-shadow hover:shadow-sm"
              onClick={() => setSelectedId(project.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{project.title}</p>
                      <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', status.color)}>
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {project.speaker && <span className="flex items-center gap-1"><User className="size-3" />{project.speaker}</span>}
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" />
                        {project.date || <span className="text-amber-600">Date TBC</span>}
                      </span>
                      {activeStep && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />{activeStep.label}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); deleteProject(project.id) }}
                    className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ── Pipeline view ──────────────────────────────────────────────────────────

function PipelineView({ project, onBack, onStepAction, onDelete, onUpdateDate, onUpdateJoelContext, stepLoading, stepError }) {
  const status = overallStatus(project)
  const activeIdx = getActiveStepIdx(project)

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All webinars
          </button>
          <h2 className="text-lg font-semibold">{project.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {project.speaker && <span className="flex items-center gap-1"><User className="size-3" />{project.speaker}</span>}
            <span className="flex items-center gap-1">
              <Calendar className="size-3" />
              {project.date || <span className="text-amber-600">Date TBC</span>}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 font-medium', status.color)}>
              {status.label}
            </span>
          </div>
        </div>
        <button type="button" onClick={onDelete} className="mt-1 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {!project.date && (
        <div className="mb-5 flex items-start gap-2.5 rounded-md bg-amber-50 p-3">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Date not confirmed</p>
            <p className="mb-2 mt-0.5 text-xs text-amber-700">Step 3 (Zoom) and Step 6 (Brief) need a confirmed date.</p>
            <input
              className="w-full max-w-xs rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
              placeholder="e.g. 28 Aug, 12pm AEST"
              onBlur={e => { if (e.target.value.trim()) onUpdateDate(e.target.value.trim()) }}
            />
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-[15px] top-5 bottom-5 w-px bg-border" />
        <div className="space-y-2">
          {STEPS.map((stepDef, idx) => (
            <StepCard
              key={stepDef.id}
              stepDef={stepDef}
              stepState={project.steps[idx]}
              index={idx}
              isActive={idx === activeIdx}
              isPast={project.steps[idx].status === 'completed'}
              isBlocked={project.steps[idx].status === 'blocked'}
              project={project}
              loading={stepLoading[idx] || false}
              error={stepError[idx] || null}
              joelContext={stepDef.isBriefStep ? project.joelContext : undefined}
              onJoelContextChange={stepDef.isBriefStep ? onUpdateJoelContext : undefined}
              onAction={(action) => onStepAction(project.id, idx, action)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step card ──────────────────────────────────────────────────────────────

function StepCard({ stepDef, stepState, index, isActive, isPast, isBlocked, project, loading, error, joelContext, onJoelContextChange, onAction }) {
  const { IntegrationIcon } = stepDef

  return (
    <div className={cn(
      'flex gap-4 rounded-lg p-4 transition-all',
      isActive && 'bg-white shadow-sm ring-1 ring-border',
      isPast && 'opacity-55',
      !isActive && !isPast && !isBlocked && 'opacity-35'
    )}>
      {/* Step indicator */}
      <div className={cn(
        'relative z-10 flex size-[30px] shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold',
        isPast && 'border-green-500 bg-green-500 text-white',
        isBlocked && 'border-red-400 bg-red-50 text-red-500',
        isActive && !isBlocked && 'border-forest bg-white text-forest',
        !isActive && !isPast && !isBlocked && 'border-border bg-background text-muted-foreground'
      )}>
        {isPast ? <CheckCircle className="size-4" /> : isBlocked ? <X className="size-3.5" /> : <span>{index + 1}</span>}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-semibold', isPast && 'line-through decoration-muted-foreground/50')}>{stepDef.label}</p>
          {stepDef.integration && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {IntegrationIcon && <IntegrationIcon className="size-3" />}
              {stepDef.integration}
            </span>
          )}
        </div>

        {(isActive || isBlocked) && (
          <p className="mt-1 text-xs text-muted-foreground">{stepDef.description}</p>
        )}
        {isActive && stepDef.note && (
          <p className="mt-1.5 text-xs text-amber-700">⚠ {stepDef.note}</p>
        )}

        {/* Output */}
        {stepState.output && (isActive || isPast) && (
          <pre className={cn(
            'mt-3 whitespace-pre-wrap rounded-md p-3 font-mono text-[11px] leading-relaxed',
            stepState.status === 'waiting_approval' ? 'bg-amber-50 text-amber-900' : 'bg-muted text-muted-foreground'
          )}>
            {stepState.output}
          </pre>
        )}

        {/* Joel context — Step 6 only */}
        {isActive && stepDef.isBriefStep && (
          <div className="mt-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Joel's 1:1 context <span className="font-normal">(optional — add anything not in the transcript)</span></span>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-forest"
                rows={3}
                value={joelContext || ''}
                onChange={e => onJoelContextChange?.(e.target.value)}
                placeholder="e.g. The guest mentioned they're about to announce a new partnership — tie that into the Q&A. Avoid anything about pricing."
              />
            </label>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-2 text-xs text-red-600">Error: {error}</p>
        )}

        {/* Actions */}
        {isActive && !isBlocked && (
          <div className="mt-3 flex flex-wrap gap-2">
            {stepDef.isGuestStep && (
              <>
                <Button size="sm" onClick={() => onAction('guest_confirmed')} className="gap-1.5">
                  <ThumbsUp className="size-3.5" /> Guest confirmed
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAction('guest_declined')} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                  <ThumbsDown className="size-3.5" /> Guest declined
                </Button>
              </>
            )}

            {stepState.status === 'waiting_approval' && !loading && (
              <>
                <Button size="sm" onClick={() => onAction('approve')}>{stepDef.approvalLabel}</Button>
                <Button size="sm" variant="outline" onClick={() => onAction('revise')}>Revise</Button>
              </>
            )}

            {stepState.status === 'in_progress' && !stepDef.isGuestStep && !loading && (
              <Button size="sm" onClick={() => onAction(stepDef.needsApproval ? 'generate' : 'send')}>
                {stepDef.actionLabel}
              </Button>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {stepDef.id === 'brief' ? 'Generating brief with Claude…' :
                 stepDef.id === 'zoom' ? 'Creating Zoom event…' :
                 stepDef.id === 'chase' ? 'Sending Slack ping…' : 'Working…'}
              </div>
            )}
          </div>
        )}

        {isBlocked && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-red-700">Guest declined or no reply — workflow paused. Find a new guest and restart the chase step.</p>
            <Button size="sm" variant="outline" onClick={() => onAction('restart_guest')} className="gap-1.5">
              <RefreshCw className="size-3.5" /> Restart from Chase step
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
