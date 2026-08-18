import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects, webinarFollowups } from '../db/schema.js'

function unavailable(res, err) {
  console.error('Netlify Database error', err)
  res.status(503).json({
    error: 'Database is not ready. Deploy with @netlify/database installed, or run `npx netlify dev` after `npm run db:migrate`.',
    detail: String(err?.message || err),
  })
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')

  try {
    if (req.method === 'GET') {
      const rows = await db.select().from(projects)
      const list = rows
        .map(row => row.payload)
        .filter(Boolean)
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
      res.status(200).json({ projects: list })
      return
    }

    if (req.method === 'PUT') {
      const incoming = Array.isArray(req.body?.projects) ? req.body.projects : null
      if (!incoming) {
        res.status(400).json({ error: 'Body must be { projects: [...] }' })
        return
      }

      const ids = new Set(incoming.map(p => p?.id).filter(Boolean))
      const existing = await db.select({ id: projects.id }).from(projects)
      for (const row of existing) {
        if (!ids.has(row.id)) {
          await db.delete(webinarFollowups).where(eq(webinarFollowups.projectId, row.id))
          await db.delete(projects).where(eq(projects.id, row.id))
        }
      }

      const now = new Date().toISOString()
      for (const project of incoming) {
        if (!project?.id) continue
        await db
          .insert(projects)
          .values({ id: project.id, payload: project, updatedAt: now })
          .onConflictDoUpdate({
            target: projects.id,
            set: { payload: project, updatedAt: now },
          })
      }

      res.status(200).json({ ok: true, count: incoming.length })
      return
    }

    res.setHeader('Allow', 'GET, PUT')
    res.status(405).end()
  } catch (err) {
    unavailable(res, err)
  }
}
