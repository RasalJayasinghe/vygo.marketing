import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle, ArrowLeft, Calendar, CheckCircle, Clock,
  Loader2, Mail, MessageSquare, Mic, MicOff, Plus,
  RefreshCw, Sparkles, ThumbsDown, ThumbsUp, Upload,
  User, Video, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import {
  deleteProject as removeProject, setProjects, updateProject as updateStoreProject,
  useProjects, withActivity,
} from '@/lib/projectsStore.js'
import { WEBINAR_STEPS } from '@/lib/webinarSteps.js'
import { cn } from '@/lib/utils'

// ── Step definitions ──────────────────────────────────────────────────────

const STEP_DETAILS = {
  edm: {
    integration: 'Claude AI',
    IntegrationIcon: Sparkles,
    description: 'Generate three email variants from the planning session transcript. All variants need approval before use.',
    actionLabel: 'Generate EDM variants',
    approvalLabel: 'Approve variants',
    needsApproval: true,
    fallbackOutput: (p) =>
      `Variant A — "The future of ${p.title}"\nVariant B — "How top universities are changing the game"\nVariant C — "Join us: a live conversation with ${p.speaker || '[Speaker]'}"\n\n→ Three full email drafts ready for review.`,
  },
  'future-campus': {
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
  zoom: {
    integration: 'Zoom API',
    IntegrationIcon: Video,
    description: 'Auto-create the Zoom webinar and generate three guest invite links. Invite email drafted from template — approve before sending.',
    actionLabel: 'Create Zoom webinar',
    approvalLabel: 'Approve & send invites',
    needsApproval: true,
  },
  chase: {
    integration: 'Slack',
    IntegrationIcon: MessageSquare,
    description: 'Send a Slack ping when workflow is blocked on their action. Pings are recorded — the cron job follows up every 3 days automatically. Joel replies "yes" to advance.',
    actionLabel: 'Send Slack ping',
    needsApproval: false,
  },
  'guest-response': {
    integration: null,
    IntegrationIcon: null,
    description: 'Guest confirms → workflow continues. Guest declines or no reply after 7 days → workflow pauses, new guest search triggered, meeting with Joel/Lyndon booked.',
    needsApproval: false,
    isGuestStep: true,
  },
  brief: {
    integration: 'Claude AI',
    IntegrationIcon: Sparkles,
    description: 'Generate the full campaign brief and speaker Q&A once partner and date are both confirmed. Joel adds 1:1 context before generation.',
    actionLabel: 'Generate brief',
    needsApproval: false,
    isBriefStep: true,
  },
}

const STEPS = WEBINAR_STEPS.map(step => ({ ...step, ...STEP_DETAILS[step.id] }))

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
    kind: 'webinar',
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

async function parseApiJson(res) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { error: text.slice(0, 180).replace(/\s+/g, ' ') }
  }
}

function apiErrorMessage(data, status, fallback) {
  return data?.error || data?.errorMessage || data?.message || fallback || `Request failed (${status})`
}

const EXTRACT_STAGES = [
  'Reading the transcript',
  'Pulling topic, speaker, and date',
  'Checking whether a date was confirmed',
]

const EMPTY_FORM = { title: '', speaker: '', date: '', notes: '' }

// ── Main component ─────────────────────────────────────────────────────────

export default function WebinarWorkflow({ initialProjectId = null, onConsumeInitialProject }) {
  const projects = useProjects()
  const [selectedId, setSelectedId] = useState(initialProjectId)
  const [showNew, setShowNew] = useState(false)
  const [newStep, setNewStep] = useState('drop')
  const [dragging, setDragging] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [transcript, setTranscript] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [extractLoading, setExtractLoading] = useState(false)
  const [extractStage, setExtractStage] = useState(0)
  const [extractedDate, setExtractedDate] = useState(null)
  const [joelAction, setJoelAction] = useState('')
  const [listening, setListening] = useState(false)
  const [stepLoading, setStepLoading] = useState({})
  const [stepError, setStepError] = useState({})
  const recognitionRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!initialProjectId) return
    setSelectedId(initialProjectId)
    onConsumeInitialProject?.()
  }, [initialProjectId, onConsumeInitialProject])

  useEffect(() => {
    if (!showNew) return
    const onKey = (e) => { if (e.key === 'Escape') resetNew() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [showNew])

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  const updateProject = useCallback((id, fn) => {
    updateStoreProject(id, fn)
  }, [])

  // ── Transcript processing ──
  const processTranscript = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setTranscript(trimmed)
    setPasteText(trimmed)
    setExtractLoading(true)
    setExtractStage(0)
    setJoelAction('')
    setExtractedDate(null)

    const timers = [
      setTimeout(() => setExtractStage(1), 500),
      setTimeout(() => setExtractStage(2), 1600),
    ]

    try {
      try {
        const res = await fetch('/api/extract-webinar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: trimmed }),
        })
        if (res.ok) {
          const data = await res.json()
          setExtractedDate(data.dateConfirmed ? data.date : null)
          setJoelAction(data.joelAction || '')
          setForm({ title: data.title || '', speaker: data.speaker || '', date: data.date || '', notes: data.notes || '' })
          setNewStep('details')
          return
        }
      } catch { /* fall through to regex */ }

      const fallback = regexExtract(trimmed)
      setExtractedDate(fallback.dateConfirmed ? fallback.date : null)
      setForm({ title: fallback.title, speaker: fallback.speaker, date: fallback.date, notes: '' })
      setNewStep('details')
    } finally {
      timers.forEach(clearTimeout)
    }
  }, [])

  const processTranscriptAndSettle = useCallback(async (text) => {
    try {
      await processTranscript(text)
    } finally {
      setExtractLoading(false)
      setExtractStage(0)
    }
  }, [processTranscript])

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processTranscriptAndSettle(ev.target.result)
    reader.readAsText(file)
  }, [processTranscriptAndSettle])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processTranscriptAndSettle(ev.target.result)
    reader.readAsText(file)
  }, [processTranscriptAndSettle])

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
    setTranscript(''); setPasteText(''); setExtractedDate(null); setJoelAction('')
    setExtractLoading(false); setExtractStage(0); setListening(false); recognitionRef.current?.stop()
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
        const message = waitApproval
          ? `${stepDef.label} is ready for approval`
          : `${stepDef.label} completed`
        return withActivity({ ...p, steps }, message, waitApproval ? 'approval' : 'step')
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
        const data = await parseApiJson(res)
        if (res.status === 503) {
          // Graceful degradation — Zoom not configured
          const placeholder = `Webinar: ${project.title}\nDate: ${project.date || 'TBC — confirm date before creating webinar'}\nHost link:  zoom.us/w/9xx-xxx-xxx?role=host\nGuest link 1: zoom.us/w/9xx-xxx-xxx?tk=guest1\nGuest link 2: zoom.us/w/9xx-xxx-xxx?tk=guest2\nGuest link 3: zoom.us/w/9xx-xxx-xxx?tk=guest3\n\n⚠ Zoom API not configured — placeholder links shown.\n${data.setup || ''}`
          advanceStep(placeholder, true)
        } else if (!res.ok) {
          throw new Error(apiErrorMessage(data, res.status, 'Zoom API error'))
        } else {
          const output = [
            `Webinar: ${data.topic}`,
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
    const ACTIVITY_BY_ACTION = {
      approve: [`${stepDef.label} approved`, 'step'],
      revise: [`${stepDef.label} sent back for revision`, 'note'],
      guest_confirmed: ['Guest confirmed', 'step'],
      guest_declined: ['Guest declined — workflow paused', 'blocked'],
      restart_guest: ['Restarted from the chase step with a new guest', 'note'],
    }

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
      const entry = ACTIVITY_BY_ACTION[action]
      return entry ? withActivity({ ...p, steps }, entry[0], entry[1]) : { ...p, steps }
    })
  }, [projects, updateProject])

  const handleUpdateJoelContext = useCallback((id, val) => {
    updateProject(id, p => ({ ...p, joelContext: val }))
  }, [updateProject])

  const deleteProject = useCallback((id) => {
    removeProject(id)
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
    <div className="max-w-5xl">
      {/* ── Workflow strip ── */}
      <div className="mb-6 grid grid-cols-6 gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-foreground">{i + 1}</span>
            <span className="truncate">{s.short}</span>
          </div>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length === 0 ? 'No webinars yet.' : `${projects.length} webinar${projects.length !== 1 ? 's' : ''}`}
        </p>
        <Button onClick={() => setShowNew(true)} size="sm">
          <Plus className="mr-1.5 size-3.5" /> New webinar
        </Button>
      </div>

          {/* ── Empty state ── */}
          {projects.length === 0 && !showNew && (
            <div className="rounded-xl border border-border bg-white px-8 py-12 text-center">
              <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#eff5ff]">
                <Video className="size-5 text-brand" />
              </div>
              <p className="text-sm font-semibold">No webinars in progress</p>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                Drop a Joel/Lyndon meeting transcript to kick off the 6-step workflow — from EDMs to briefing.
              </p>
              <Button className="mt-5" size="sm" onClick={() => setShowNew(true)}>
                <Plus className="mr-1.5 size-3.5" /> Start from transcript
              </Button>
            </div>
          )}

          <div className="space-y-2.5">
            {projects.map(project => {
              const status = overallStatus(project)
              const activeIdx = getActiveStepIdx(project)
              const completedCount = project.steps.filter(s => s.status === 'completed').length
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
                        <div className="mt-3 flex items-center gap-1">
                          {STEPS.map((s, i) => {
                            const st = project.steps[i].status
                            return (
                              <div key={s.id} title={`Step ${i + 1}: ${s.label}`} className={cn(
                                'h-1.5 flex-1 rounded-full transition-colors',
                                st === 'completed' && 'bg-green-400',
                                st === 'waiting_approval' && 'bg-amber-400',
                                st === 'in_progress' && 'bg-brand',
                                st === 'blocked' && 'bg-red-400',
                                st === 'pending' && 'bg-border',
                              )} />
                            )
                          })}
                          <span className="ml-2 text-[10px] text-muted-foreground">{completedCount}/{STEPS.length}</span>
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

      {showNew && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="new-webinar-title">
          <button type="button" className="absolute inset-0 bg-[#0b1020]/55 backdrop-blur-[3px]" onClick={resetNew} aria-label="Close new webinar" />
          <Card className="relative z-10 flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden border-[#c7dcff] shadow-2xl sm:max-h-[calc(100vh-4rem)]">
            <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 sm:px-8 sm:py-7">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <p id="new-webinar-title" className="text-base font-semibold">New webinar</p>
                  <span className="rounded-full bg-[#eff5ff] px-2.5 py-0.5 text-[11px] font-medium text-brand">
                    {extractLoading ? 'Extracting…' : newStep === 'drop' ? 'Step 1 of 2' : 'Step 2 of 2'}
                  </span>
                </div>
                <button type="button" onClick={resetNew} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>

            {newStep === 'drop' && extractLoading && (
              <div className="flex flex-col items-center justify-center gap-5 rounded-xl border border-[#c7dcff] bg-[#f8fbff] px-6 py-12">
                <Loader2 className="size-7 animate-spin text-brand" />
                <div className="w-full max-w-sm space-y-3">
                  <p className="text-center text-sm font-semibold text-foreground">Extracting webinar details</p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-[#dbe8ff]">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-500"
                      style={{ width: `${((extractStage + 1) / EXTRACT_STAGES.length) * 100}%` }}
                    />
                  </div>
                  <ul className="space-y-2">
                    {EXTRACT_STAGES.map((label, i) => (
                      <li key={label} className="flex items-center gap-2 text-sm">
                        {i < extractStage ? (
                          <CheckCircle className="size-4 text-green-600" />
                        ) : i === extractStage ? (
                          <Loader2 className="size-4 animate-spin text-brand" />
                        ) : (
                          <Clock className="size-4 text-muted-foreground/50" />
                        )}
                        <span className={i <= extractStage ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {newStep === 'drop' && !extractLoading && (
              <div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 transition-all sm:min-h-[200px]',
                    dragging
                      ? 'border-brand bg-[#eff5ff] shadow-inner'
                      : 'border-[#c7dcff] bg-[#f8fbff] hover:border-brand/60 hover:bg-[#e8f1ff]'
                  )}
                >
                  <div className={cn(
                    'flex size-12 items-center justify-center rounded-full transition-colors',
                    dragging ? 'bg-brand/15' : 'bg-[#dbe8ff]'
                  )}>
                    <Upload className="size-5 text-brand" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">Drop your Joel/Lyndon meeting transcript</p>
                    <p className="mt-1 text-xs text-muted-foreground">.txt or .md · Claude will extract topic, speaker, and date</p>
                  </div>
                  <input ref={fileInputRef} type="file" accept=".txt,.md" className="hidden" onChange={handleFileChange} />
                </div>
                <div className="relative">
                  <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
                  <span className="relative mx-auto flex w-fit bg-white px-3 text-[11px] text-muted-foreground">or paste transcript text</span>
                </div>
                <textarea
                  className="min-h-[160px] w-full flex-1 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand"
                  rows={8}
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  onKeyDown={e => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && pasteText.trim().length >= 30) {
                      e.preventDefault()
                      processTranscriptAndSettle(pasteText)
                    }
                  }}
                  placeholder="Paste meeting notes here…"
                />
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-muted-foreground">
                    {pasteText.trim().length < 30
                      ? 'Paste the notes, then extract — or drop a file above.'
                      : `${pasteText.trim().length.toLocaleString()} characters · ⌘ Enter`}
                  </p>
                  <Button
                    size="sm"
                    disabled={pasteText.trim().length < 30}
                    onClick={() => processTranscriptAndSettle(pasteText)}
                  >
                    <Sparkles className="mr-1.5 size-3.5" />
                    Extract details
                  </Button>
                </div>
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
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. How to scale student success"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Speaker(s)</span>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
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
                      'w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand',
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
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
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
        </div>,
        document.body
      )}
    </div>
  )
}

// ── Pipeline view ──────────────────────────────────────────────────────────

function PipelineView({ project, onBack, onStepAction, onDelete, onUpdateDate, onUpdateJoelContext, stepLoading, stepError }) {
  const status = overallStatus(project)
  const activeIdx = getActiveStepIdx(project)

  return (
    <div className="max-w-3xl">
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
        isActive && !isBlocked && 'border-brand bg-white text-brand',
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
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
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
                 stepDef.id === 'zoom' ? 'Creating Zoom webinar…' :
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
