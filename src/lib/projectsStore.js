import { useSyncExternalStore } from 'react'
import { WEBINAR_STEPS, stepIndex } from './webinarSteps.js'

const STORAGE_KEY = 'vygo-webinar-projects'

export const POST_WEBINAR_TASKS = [
  'Upload the recording and transcript',
  'Send the post-webinar follow-up EDM',
  'Cut three highlight clips for LinkedIn',
  'Publish the recap post',
  'Log registrations and attendance in the master sheet',
  'Repurpose into a podcast episode or blog',
]

const GENERAL_LISTS = [
  { id: 'todo', name: 'To do' },
  { id: 'next', name: 'Next up' },
]

let idCounter = 0
function uid(prefix) {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function makeActivity(message, kind = 'note', at = new Date().toISOString()) {
  return { id: uid('a'), message, kind, at }
}

export function makeTask(title, extra = {}) {
  return { id: uid('t'), title, done: false, createdAt: new Date().toISOString(), ...extra }
}

export function makeGeneralProject({ title, description = '' }) {
  const createdAt = new Date().toISOString()
  return {
    id: uid('p'),
    kind: 'general',
    title: title || 'Untitled project',
    description,
    createdAt,
    board: { lists: GENERAL_LISTS.map(l => ({ ...l, tasks: [] })) },
    activity: [makeActivity('Project created', 'created', createdAt)],
  }
}

function defaultBoard(project) {
  if (project.kind === 'general') {
    return { lists: GENERAL_LISTS.map(l => ({ ...l, tasks: [] })) }
  }
  return {
    lists: [
      {
        id: 'delivery',
        name: 'Webinar delivery',
        tasks: WEBINAR_STEPS.map(s => makeTask(s.label, { stepId: s.id })),
      },
      {
        id: 'post',
        name: 'Post-webinar',
        tasks: POST_WEBINAR_TASKS.map(t => makeTask(t)),
      },
    ],
  }
}

// Fills in fields added after a project was first written to localStorage.
function normalize(project) {
  const next = { ...project }
  if (!next.kind) next.kind = Array.isArray(next.steps) ? 'webinar' : 'general'
  if (!next.board || !Array.isArray(next.board.lists) || next.board.lists.length === 0) {
    next.board = defaultBoard(next)
  }
  if (!Array.isArray(next.activity)) {
    next.activity = [makeActivity('Project created', 'created', next.createdAt)]
  }
  return next
}

let projects = typeof window !== 'undefined' ? read() : []
let persistTimer
const listeners = new Set()

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(raw) ? raw.map(normalize) : []
  } catch {
    return []
  }
}

function emit() {
  listeners.forEach(fn => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key !== STORAGE_KEY) return
    projects = read()
    emit()
  })
}

function writeLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch { /* quota or private mode — keep the in-memory copy */ }
}

function persistRemote(list) {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    fetch('/api/projects', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: list }),
    }).catch(() => { /* keep local cache if Netlify Database is not up yet */ })
  }, 400)
}

async function hydrateFromDatabase() {
  try {
    const res = await fetch('/api/projects', { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const remote = Array.isArray(data.projects) ? data.projects.map(normalize) : []
    if (remote.length) {
      projects = remote
      writeLocal(projects)
      emit()
      return
    }
    if (projects.length) {
      persistRemote(projects)
    }
  } catch {
    /* Vite-only local dev has no functions; localStorage stays the source. */
  }
}

if (typeof window !== 'undefined') {
  hydrateFromDatabase()
}

export function setProjects(next) {
  const value = typeof next === 'function' ? next(projects) : next
  projects = value.map(normalize)
  writeLocal(projects)
  persistRemote(projects)
  emit()
}

export function updateProject(id, fn) {
  setProjects(prev => prev.map(p => (p.id === id ? fn(p) : p)))
}

export function addProject(project) {
  const normalized = normalize(project)
  setProjects(prev => [normalized, ...prev])
  return normalized
}

export function deleteProject(id) {
  setProjects(prev => prev.filter(p => p.id !== id))
}

export function logActivity(id, message, kind = 'note') {
  updateProject(id, p => ({ ...p, activity: [makeActivity(message, kind), ...(p.activity || [])] }))
}

export function withActivity(project, message, kind = 'note') {
  return { ...project, activity: [makeActivity(message, kind), ...(project.activity || [])] }
}

export function useProjects() {
  return useSyncExternalStore(subscribe, () => projects, () => projects)
}

// ── Derived state ──────────────────────────────────────────────────────────

// Delivery tasks mirror the webinar pipeline, so their tick state is owned by
// the workflow rather than the board.
export function isTaskDone(project, task) {
  if (task.stepId) {
    const idx = stepIndex(task.stepId)
    return idx >= 0 && project.steps?.[idx]?.status === 'completed'
  }
  return !!task.done
}

export function allTasks(project) {
  return (project.board?.lists || []).flatMap(list => list.tasks)
}

export function projectProgress(project) {
  const tasks = allTasks(project)
  const done = tasks.filter(t => isTaskDone(project, t)).length
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 }
}

export function isWebinarDelivered(project) {
  if (project.kind === 'general' || !Array.isArray(project.steps)) return false
  return project.steps.every(s => s.status === 'completed')
}

export function projectStatus(project) {
  const { done, total } = projectProgress(project)

  if (project.kind === 'general' || !Array.isArray(project.steps)) {
    if (total > 0 && done === total) return { label: 'Complete', tone: 'green' }
    if (done > 0) return { label: 'In progress', tone: 'blue' }
    return { label: 'Not started', tone: 'slate' }
  }

  if (isWebinarDelivered(project)) {
    return done === total
      ? { label: 'Wrapped', tone: 'green' }
      : { label: 'Webinar delivered', tone: 'violet' }
  }

  const activeIdx = project.steps.findIndex(s => s.status !== 'completed')
  const active = project.steps[activeIdx]
  if (active?.status === 'blocked') return { label: 'Blocked', tone: 'red' }
  if (active?.status === 'waiting_approval') return { label: 'Needs approval', tone: 'amber' }
  return { label: `Step ${activeIdx + 1} of ${project.steps.length}`, tone: 'blue' }
}

export function nextTask(project) {
  for (const list of project.board?.lists || []) {
    const task = list.tasks.find(t => !isTaskDone(project, t))
    if (task) return { task, list }
  }
  return null
}
