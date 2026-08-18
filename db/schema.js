import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
  id: text('id').primaryKey(),
  payload: jsonb('payload').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
})

export const webinarFollowups = pgTable('webinar_followups', {
  projectId: text('project_id').primaryKey(),
  projectTitle: text('project_title').notNull(),
  speaker: text('speaker'),
  date: text('date'),
  lastPing: timestamp('last_ping', { withTimezone: true, mode: 'string' }),
  pingCount: integer('ping_count').notNull().default(0),
})
