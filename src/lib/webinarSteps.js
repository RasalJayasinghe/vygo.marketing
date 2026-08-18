// Plain step metadata shared by the webinar system and the projects board.
// Kept free of components so the projects board can stay in the main bundle
// while WebinarWorkflow remains lazy-loaded.

export const WEBINAR_STEPS = [
  { id: 'edm', label: 'EDM creation', short: 'EDMs' },
  { id: 'future-campus', label: 'Future Campus email to Jayson', short: 'Email Jayson' },
  { id: 'zoom', label: 'Zoom event & guest invites', short: 'Zoom event' },
  { id: 'chase', label: 'Chase Joel / Lyndon', short: 'Chase Joel' },
  { id: 'guest-response', label: 'Guest response', short: 'Guest confirms' },
  { id: 'brief', label: 'Brief & questions', short: 'Brief' },
  { id: 'content-approval', label: 'Speaker content approval', short: 'Speaker sign-off' },
  { id: 'promote', label: 'Promote & remind', short: 'Promote' },
  { id: 'wrap', label: 'Post-webinar wrap', short: 'Wrap' },
]

export const BRIEF_ASSETS = [
  'Title + alternatives',
  'Short description',
  'Speaker Q&A',
]

export const PROMOTE_ASSETS = [
  'Landing page copy',
  'LinkedIn launch post',
  'Speaker announcement post',
  'Registration EDM',
  'Reminder EDM',
  'Last chance to register',
]

export const WRAP_ASSETS = [
  'Post-webinar follow-up',
  'Repurposing ideas',
]

export const CHASE_FOLLOWUP_DAYS = 3
export const CHASE_ESCALATE_DAYS = 6
export const DAY_MS = 24 * 60 * 60 * 1000

export function stepIndex(id) {
  return WEBINAR_STEPS.findIndex(s => s.id === id)
}

export function activeStepIndex(project) {
  return Array.isArray(project?.steps) ? project.steps.findIndex(s => s.status !== 'completed') : -1
}

export function isWaitingOnGuest(project) {
  const idx = activeStepIndex(project)
  if (idx < 0) return false
  if (project.steps[idx]?.status !== 'in_progress') return false
  return WEBINAR_STEPS[idx]?.id === 'guest-response'
}

export function emptyChase() {
  return {
    open: false,
    firstPingAt: null,
    lastPingAt: null,
    pingCount: 0,
    callBookedAt: null,
    confirmedVia: null,
  }
}

export function startChase(project, at = new Date().toISOString()) {
  return {
    open: true,
    firstPingAt: project?.chase?.firstPingAt || at,
    lastPingAt: at,
    pingCount: (project?.chase?.pingCount || 0) + 1,
    callBookedAt: null,
    confirmedVia: null,
  }
}

export function resolveChase(project, extra = {}) {
  return {
    ...(project?.chase || emptyChase()),
    open: false,
    ...extra,
  }
}

function parseTime(value) {
  const t = Date.parse(value || '')
  return Number.isFinite(t) ? t : 0
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return 'now'
  const hours = Math.round(ms / (60 * 60 * 1000))
  if (hours < 24) {
    if (hours <= 1) return 'about an hour'
    return `${hours}h`
  }
  const days = Math.round(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}

export function chaseStatus(project, now = Date.now()) {
  if (!isWaitingOnGuest(project)) return null
  const chase = project?.chase || emptyChase()
  const first = parseTime(chase.firstPingAt)
  if (!first) {
    return {
      phase: 'waiting',
      label: 'Waiting on guest',
      tone: 'blue',
      daysQuiet: 0,
      followUpDue: true,
      detail: 'No timer on file yet. Send a Slack follow-up to start the 3-day clock.',
    }
  }

  const quietMs = Math.max(0, now - first)
  const daysQuiet = quietMs / DAY_MS
  const last = parseTime(chase.lastPingAt) || first
  const sinceLast = Math.max(0, now - last)
  const followUpDue = sinceLast >= CHASE_FOLLOWUP_DAYS * DAY_MS
  const nextFollowUpMs = Math.max(0, CHASE_FOLLOWUP_DAYS * DAY_MS - sinceLast)

  if (chase.callBookedAt) {
    return {
      phase: 'call_booked',
      label: 'Call booked',
      tone: 'amber',
      daysQuiet,
      followUpDue: false,
      detail: `Call booked ${formatDuration(now - parseTime(chase.callBookedAt))} ago. Still waiting on a confirmation.`,
    }
  }

  const pingCount = chase.pingCount || 0
  const shouldEscalate = daysQuiet >= CHASE_ESCALATE_DAYS || (pingCount >= 2 && followUpDue)
  if (shouldEscalate) {
    return {
      phase: 'escalate',
      label: 'Book a call',
      tone: 'red',
      daysQuiet,
      followUpDue: false,
      detail: `No reply after ${formatDuration(quietMs)}. Slack follow-up is done — pick up the phone.`,
    }
  }

  if (pingCount >= 2) {
    const escalateInMs = Math.max(0, first + CHASE_ESCALATE_DAYS * DAY_MS - now)
    return {
      phase: 'waiting',
      label: 'Waiting after follow-up',
      tone: 'amber',
      daysQuiet,
      followUpDue: false,
      detail: `Slack follow-up sent. Escalate to a call in ${formatDuration(escalateInMs)} if they stay quiet.`,
    }
  }

  if (followUpDue || daysQuiet >= CHASE_FOLLOWUP_DAYS) {
    return {
      phase: 'no_reply',
      label: 'Guest quiet',
      tone: 'amber',
      daysQuiet,
      followUpDue: true,
      detail: `No reply for ${formatDuration(quietMs)}. Send the 3-day Slack follow-up, or mark a confirmation if they replied by email.`,
    }
  }

  return {
    phase: 'waiting',
    label: 'Waiting on guest',
    tone: 'blue',
    daysQuiet,
    followUpDue: false,
    nextFollowUpMs,
    detail: `Timer running. Next Slack nudge in ${formatDuration(nextFollowUpMs)} if nobody marks a reply.`,
  }
}
