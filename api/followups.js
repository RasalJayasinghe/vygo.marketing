import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { webinarFollowups } from '../db/schema.js'

export async function upsertFollowup({ projectId, projectTitle, speaker, date }) {
  const now = new Date().toISOString()
  const [existing] = await db
    .select()
    .from(webinarFollowups)
    .where(eq(webinarFollowups.projectId, projectId))
    .limit(1)

  if (existing) {
    const [updated] = await db
      .update(webinarFollowups)
      .set({
        projectTitle,
        speaker: speaker || null,
        date: date || null,
        lastPing: now,
        pingCount: (existing.pingCount || 0) + 1,
      })
      .where(eq(webinarFollowups.projectId, projectId))
      .returning()
    return updated
  }

  const [created] = await db
    .insert(webinarFollowups)
    .values({
      projectId,
      projectTitle,
      speaker: speaker || null,
      date: date || null,
      lastPing: now,
      pingCount: 1,
    })
    .returning()
  return created
}

export async function clearFollowup(projectId) {
  await db.delete(webinarFollowups).where(eq(webinarFollowups.projectId, projectId))
}

function waitingOnGuest(project) {
  if (!project || project.kind !== 'webinar' || !project.chase?.open) return false
  const steps = Array.isArray(project.steps) ? project.steps : []
  const idx = steps.findIndex(s => s.status !== 'completed')
  if (idx < 0) return false
  return steps[idx]?.status === 'in_progress'
}

export async function syncFollowups(projectList) {
  const byId = new Map((projectList || []).filter(p => p?.id).map(p => [p.id, p]))
  const rows = await db.select().from(webinarFollowups)
  for (const row of rows) {
    const project = byId.get(row.projectId)
    if (!project || !waitingOnGuest(project)) {
      await db.delete(webinarFollowups).where(eq(webinarFollowups.projectId, row.projectId))
    }
  }
}

export async function dueFollowups(days = 3) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const rows = await db.select().from(webinarFollowups)
  return rows.filter(row => {
    if ((row.pingCount || 0) >= 3) return false
    const last = row.lastPing ? Date.parse(row.lastPing) : 0
    return !last || last <= cutoff
  })
}
