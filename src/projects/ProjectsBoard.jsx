import { useCallback, useMemo, useState } from 'react'
import {
  ArrowLeft, Calendar, CheckCircle2, Circle, Clock, ExternalLink,
  FolderKanban, ListTodo, Plus, Send, Sparkles, Trash2, User, Video, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent } from '@/components/ui/card.jsx'
import {
  addProject, allTasks, deleteProject, isTaskDone, isWebinarDelivered, logActivity,
  makeGeneralProject, makeTask, nextTask, projectProgress, projectStatus,
  updateProject, useProjects, withActivity,
} from '@/lib/projectsStore.js'
import { cn } from '@/lib/utils'

const TONES = {
  green: 'text-green-700 bg-green-50 border-green-200',
  blue: 'text-blue-700 bg-blue-50 border-blue-200',
  amber: 'text-amber-700 bg-amber-50 border-amber-200',
  red: 'text-red-700 bg-red-50 border-red-200',
  violet: 'text-violet-700 bg-violet-50 border-violet-200',
  slate: 'text-muted-foreground bg-muted border-border',
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In progress' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'complete', label: 'Complete' },
]

const ACTIVITY_ICONS = {
  created: Sparkles,
  step: CheckCircle2,
  approval: Clock,
  blocked: X,
  task: ListTodo,
  update: Send,
  note: Circle,
}

function matchesFilter(status, filter) {
  if (filter === 'all') return true
  if (filter === 'attention') return status.tone === 'amber' || status.tone === 'red'
  if (filter === 'complete') return status.tone === 'green'
  return status.tone !== 'green'
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRelative(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const minutes = Math.round((Date.now() - d.getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso)
}

// ── Task mutations ─────────────────────────────────────────────────────────

function mapList(project, listId, fn) {
  return { ...project, board: { ...project.board, lists: project.board.lists.map(l => (l.id === listId ? fn(l) : l)) } }
}

function toggleTask(projectId, listId, taskId) {
  updateProject(projectId, p => {
    const task = p.board.lists.find(l => l.id === listId)?.tasks.find(t => t.id === taskId)
    if (!task || task.stepId) return p
    const next = mapList(p, listId, l => ({
      ...l,
      tasks: l.tasks.map(t => (t.id === taskId ? { ...t, done: !t.done } : t)),
    }))
    return withActivity(next, `${task.done ? 'Reopened' : 'Completed'} “${task.title}”`, 'task')
  })
}

function addTask(projectId, listId, title) {
  updateProject(projectId, p =>
    withActivity(
      mapList(p, listId, l => ({ ...l, tasks: [...l.tasks, makeTask(title)] })),
      `Added task “${title}”`,
      'task'
    )
  )
}

function removeTask(projectId, listId, taskId) {
  updateProject(projectId, p => mapList(p, listId, l => ({ ...l, tasks: l.tasks.filter(t => t.id !== taskId) })))
}

// ── Board ──────────────────────────────────────────────────────────────────

export default function ProjectsBoard({ onOpenWorkflow }) {
  const projects = useProjects()
  const [selectedId, setSelectedId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showNew, setShowNew] = useState(false)
  const [draft, setDraft] = useState({ title: '', description: '' })

  const selected = projects.find(p => p.id === selectedId) ?? null

  const visible = useMemo(
    () => projects.filter(p => matchesFilter(projectStatus(p), filter)),
    [projects, filter]
  )

  const summary = useMemo(() => {
    let openTasks = 0
    let attention = 0
    let complete = 0
    for (const p of projects) {
      const { done, total } = projectProgress(p)
      openTasks += total - done
      const tone = projectStatus(p).tone
      if (tone === 'amber' || tone === 'red') attention += 1
      if (tone === 'green') complete += 1
    }
    return { openTasks, attention, complete }
  }, [projects])

  const createProject = useCallback(() => {
    if (!draft.title.trim()) return
    const project = addProject(makeGeneralProject({ title: draft.title.trim(), description: draft.description.trim() }))
    setDraft({ title: '', description: '' })
    setShowNew(false)
    setSelectedId(project.id)
  }, [draft])

  if (selected) {
    return (
      <ProjectDetail
        project={selected}
        onBack={() => setSelectedId(null)}
        onOpenWorkflow={onOpenWorkflow}
        onDelete={() => { deleteProject(selected.id); setSelectedId(null) }}
      />
    )
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 grid gap-2.5 sm:grid-cols-4">
        <SummaryTile label="Projects" value={projects.length} />
        <SummaryTile label="Open tasks" value={summary.openTasks} />
        <SummaryTile label="Needs attention" value={summary.attention} tone={summary.attention ? 'amber' : undefined} />
        <SummaryTile label="Complete" value={summary.complete} tone={summary.complete ? 'green' : undefined} />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                filter === f.id ? 'bg-brand-soft text-brand' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowNew(v => !v)}>
          <Plus className="mr-1.5 size-3.5" /> New project
        </Button>
      </div>

      {showNew && (
        <Card className="mb-4 border-[#c7dcff]">
          <CardContent className="space-y-3 py-4">
            <input
              autoFocus
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="Project name — e.g. Q3 partner campaign"
              value={draft.title}
              onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') createProject() }}
            />
            <textarea
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
              rows={2}
              placeholder="What is this project for? (optional)"
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={createProject} disabled={!draft.title.trim()}>Create project</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
              <p className="ml-auto text-[11px] text-muted-foreground">
                Webinars created under Systems appear here automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {projects.length === 0 && !showNew && (
        <div className="rounded-xl border border-border bg-white px-8 py-12 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-[#eff5ff]">
            <FolderKanban className="size-5 text-brand" />
          </div>
          <p className="text-sm font-semibold">No projects yet</p>
          <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
            Start a webinar under Systems and it lands here with its own to-do lists, or create a standalone project to track anything else.
          </p>
          <Button className="mt-5" size="sm" onClick={() => setShowNew(true)}>
            <Plus className="mr-1.5 size-3.5" /> New project
          </Button>
        </div>
      )}

      {projects.length > 0 && visible.length === 0 && (
        <p className="rounded-xl border border-border bg-white px-6 py-10 text-center text-sm text-muted-foreground">
          No projects match this filter.
        </p>
      )}

      <div className="space-y-2.5">
        {visible.map(project => (
          <ProjectCard key={project.id} project={project} onOpen={() => setSelectedId(project.id)} />
        ))}
      </div>
    </div>
  )
}

function SummaryTile({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={cn(
        'mt-1 text-[22px] font-semibold tabular-nums leading-none',
        tone === 'amber' && 'text-amber-600',
        tone === 'green' && 'text-green-600'
      )}>
        {value}
      </p>
    </div>
  )
}

function ProjectCard({ project, onOpen }) {
  const status = projectStatus(project)
  const { done, total, pct } = projectProgress(project)
  const upNext = nextTask(project)

  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-sm" onClick={onOpen}>
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
            project.kind === 'webinar' ? 'bg-[#eff5ff] text-brand' : 'bg-muted text-muted-foreground'
          )}>
            {project.kind === 'webinar' ? <Video className="size-4" /> : <FolderKanban className="size-4" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{project.title}</p>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', TONES[status.tone])}>
                {status.label}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap gap-4 text-xs text-muted-foreground">
              {project.speaker && <span className="flex items-center gap-1"><User className="size-3" />{project.speaker}</span>}
              {project.kind === 'webinar' && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-3" />
                  {project.date || <span className="text-amber-600">Date TBC</span>}
                </span>
              )}
              {upNext && (
                <span className="flex min-w-0 items-center gap-1">
                  <ListTodo className="size-3 shrink-0" />
                  <span className="truncate">Next: {upNext.task.title}</span>
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <div
                  className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-brand')}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{done}/{total} tasks</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Detail ─────────────────────────────────────────────────────────────────

function ProjectDetail({ project, onBack, onOpenWorkflow, onDelete }) {
  const status = projectStatus(project)
  const { done, total, pct } = projectProgress(project)
  const [update, setUpdate] = useState('')
  const delivered = isWebinarDelivered(project)

  const postUpdate = () => {
    if (!update.trim()) return
    logActivity(project.id, update.trim(), 'update')
    setUpdate('')
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> All projects
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{project.title}</h2>
            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', TONES[status.tone])}>
              {status.label}
            </span>
          </div>
          {project.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {project.kind === 'webinar' && (
            <Button size="sm" variant="outline" onClick={() => onOpenWorkflow?.(project.id)}>
              <ExternalLink className="mr-1.5 size-3.5" /> Open workflow
            </Button>
          )}
          <button type="button" onClick={onDelete} className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">Progress</span>
            <span className="tabular-nums text-muted-foreground">{done} of {total} tasks · {pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
            <div
              className={cn('h-full rounded-full transition-all', pct === 100 ? 'bg-green-500' : 'bg-brand')}
              style={{ width: `${pct}%` }}
            />
          </div>
          {delivered && pct < 100 && (
            <p className="mt-2.5 text-xs text-violet-700">
              Webinar delivered — the post-webinar list is what's left.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {project.board.lists.map(list => (
              <TaskList key={list.id} project={project} list={list} />
            ))}
          </div>

          <Card>
            <CardContent className="py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Post an update</p>
              <textarea
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
                rows={2}
                value={update}
                onChange={e => setUpdate(e.target.value)}
                placeholder="e.g. Guest confirmed for 28 Aug — landing page copy is with design."
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={postUpdate} disabled={!update.trim()}>
                  <Send className="mr-1.5 size-3.5" /> Add update
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <KeyInfo project={project} />
          <Timeline project={project} />
        </div>
      </div>
    </div>
  )
}

function TaskList({ project, list }) {
  const [title, setTitle] = useState('')
  const doneCount = list.tasks.filter(t => isTaskDone(project, t)).length
  const linked = list.tasks.some(t => t.stepId)

  const submit = () => {
    if (!title.trim()) return
    addTask(project.id, list.id, title.trim())
    setTitle('')
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="flex min-h-full flex-col py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold">{list.name}</p>
          <span className="text-[11px] tabular-nums text-muted-foreground">{doneCount}/{list.tasks.length}</span>
        </div>

        {linked && (
          <p className="mb-2.5 text-[11px] text-muted-foreground">
            Ticks off automatically as the webinar workflow advances.
          </p>
        )}

        <ul className="flex-1 space-y-0.5">
          {list.tasks.length === 0 && (
            <li className="py-2 text-xs text-muted-foreground">Nothing here yet.</li>
          )}
          {list.tasks.map(task => {
            const checked = isTaskDone(project, task)
            const locked = !!task.stepId
            return (
              <li key={task.id} className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-muted/60">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => toggleTask(project.id, list.id, task.id)}
                  title={locked ? 'Managed by the webinar workflow' : checked ? 'Mark as not done' : 'Mark as done'}
                  className={cn(
                    'mt-[1px] shrink-0 rounded-full',
                    checked ? 'text-green-600' : 'text-muted-foreground hover:text-foreground',
                    locked && 'cursor-default'
                  )}
                >
                  {checked ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" strokeWidth={1.6} />}
                </button>
                <span className={cn('min-w-0 flex-1 text-xs leading-5', checked && 'text-muted-foreground line-through')}>
                  {task.title}
                </span>
                {!locked && (
                  <button
                    type="button"
                    onClick={() => removeTask(project.id, list.id, task.id)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
                    aria-label={`Remove ${task.title}`}
                  >
                    <X className="size-3" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>

        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
          <Plus className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none"
            placeholder="Add a task"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            onBlur={submit}
          />
        </div>
      </CardContent>
    </Card>
  )
}

function KeyInfo({ project }) {
  const fields = project.kind === 'webinar'
    ? [
        { key: 'speaker', label: 'Speaker', placeholder: 'Add speaker' },
        { key: 'date', label: 'Webinar date', placeholder: 'e.g. 28 Aug, 12pm AEST' },
        { key: 'owner', label: 'Owner', placeholder: 'Add owner' },
      ]
    : [
        { key: 'owner', label: 'Owner', placeholder: 'Add owner' },
        { key: 'dueDate', label: 'Due', placeholder: 'e.g. end of Q3' },
      ]

  return (
    <Card>
      <CardContent className="py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Key information</p>
        <dl className="space-y-2.5">
          {fields.map(field => (
            <div key={field.key}>
              <dt className="text-[11px] text-muted-foreground">{field.label}</dt>
              <dd>
                <input
                  className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs hover:border-border focus:border-border focus:bg-background focus:outline-none focus:ring-1 focus:ring-brand"
                  defaultValue={project[field.key] || ''}
                  placeholder={field.placeholder}
                  onBlur={e => {
                    const value = e.target.value.trim()
                    if (value === (project[field.key] || '')) return
                    updateProject(project.id, p => withActivity({ ...p, [field.key]: value }, `${field.label} set to ${value || '—'}`, 'note'))
                  }}
                />
              </dd>
            </div>
          ))}
          <div className="px-1.5">
            <dt className="text-[11px] text-muted-foreground">Source</dt>
            <dd className="text-xs">{project.kind === 'webinar' ? 'Webinar system' : 'Created in Projects'}</dd>
          </div>
          <div className="px-1.5">
            <dt className="text-[11px] text-muted-foreground">Created</dt>
            <dd className="text-xs">{formatDate(project.createdAt)}</dd>
          </div>
          <div className="px-1.5">
            <dt className="text-[11px] text-muted-foreground">Tasks</dt>
            <dd className="text-xs">{allTasks(project).length} across {project.board.lists.length} lists</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}

function Timeline({ project }) {
  const activity = project.activity || []
  return (
    <Card>
      <CardContent className="py-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Timeline</p>
        {activity.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
        <ol className="relative space-y-3.5">
          {activity.length > 1 && <div className="absolute bottom-3 left-[7px] top-3 w-px bg-border" />}
          {activity.map(entry => {
            const Icon = ACTIVITY_ICONS[entry.kind] || Circle
            return (
              <li key={entry.id} className="relative flex gap-2.5">
                <span className={cn(
                  'z-10 mt-[1px] flex size-[15px] shrink-0 items-center justify-center rounded-full bg-white',
                  entry.kind === 'step' && 'text-green-600',
                  entry.kind === 'blocked' && 'text-red-500',
                  entry.kind === 'approval' && 'text-amber-500',
                  entry.kind === 'update' && 'text-brand',
                  !['step', 'blocked', 'approval', 'update'].includes(entry.kind) && 'text-muted-foreground'
                )}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-5 text-foreground">{entry.message}</p>
                  <p className="text-[10px] text-muted-foreground">{formatRelative(entry.at)}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
