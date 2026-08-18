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

export async function dueFollowups(days = 3) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  const rows = await db.select().from(webinarFollowups)
  return rows.filter(row => {
    const last = row.lastPing ? Date.parse(row.lastPing) : 0
    return !last || last <= cutoff
  })
}
