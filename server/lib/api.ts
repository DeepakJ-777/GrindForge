import { Hono, type Context, type Next } from 'hono'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getAuth, type AuthSession, type AuthUser } from './auth'
import { getDb } from './db'
import { dailyLogs, type DailyLog } from '../../db/schema'

/**
 * Hono app mounted under /api via server/api/[...route].ts.
 * Bindings come from the Cloudflare env (D1, secrets) — available both in
 * dev (nitro-cloudflare-dev) and in production (cloudflare_module preset).
 */
export type AppEnv = {
  Bindings: Cloudflare.Env
  Variables: {
    user: AuthUser
    session: AuthSession
  }
}

export const app = new Hono<AppEnv>().basePath('/api')

/* ------------------------------ Health checks ----------------------------- */

app.get('/ping', async (c) => {
  const result = await c.env.placement_db
    .prepare('SELECT 1 AS test')
    .first<{ test: number }>()

  return c.json({
    message: 'Hono API is working',
    database: result?.test === 1 ? 'connected' : 'error',
  })
})

/* ---------------------------------- Auth ---------------------------------- */

app.on(['POST', 'GET'], '/auth/*', (c) => getAuth(c.env).handler(c.req.raw))

/** Requires a valid session; populates c.var.user / c.var.session. */
export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const session = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}

app.get('/me', async (c) => {
  const session = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const { user, session: s } = session
  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
    expiresAt: s.expiresAt,
  })
})

/* ------------------------------- Daily logs -------------------------------- */

interface SerializedLog {
  id: string
  logDate: string
  note: string
  tags: string[]
  createdAt: string
}

function serializeLog(row: DailyLog): SerializedLog {
  let tags: string[] = []
  try {
    const parsed = JSON.parse(row.tags ?? '[]')
    if (Array.isArray(parsed)) {
      tags = parsed.filter((t): t is string => typeof t === 'string')
    }
  }
  catch {
    tags = []
  }

  return {
    id: row.id,
    logDate: row.logDate,
    note: row.note,
    tags,
    createdAt: row.createdAt.toISOString(),
  }
}

app.use('/logs', requireAuth)
app.use('/logs/*', requireAuth)
app.use('/stats', requireAuth)
app.use('/heatmap', requireAuth)
app.use('/export', requireAuth)

app.post('/logs', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)

  const logDate = typeof body?.logDate === 'string' ? body.logDate.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  const rawTags = Array.isArray(body?.tags) ? body.tags : []
  const tags = rawTags
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .slice(0, 20)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return c.json({ error: 'logDate is required and must be YYYY-MM-DD' }, 400)
  }
  if (note.length === 0 || note.length > 2000) {
    return c.json({ error: 'note is required (1-2000 characters)' }, 400)
  }

  const db = getDb(c.env)
  const [row] = await db
    .insert(dailyLogs)
    .values({
      id: crypto.randomUUID(),
      userId: c.var.user.id,
      logDate,
      note,
      tags: JSON.stringify(tags),
      createdAt: new Date(),
    })
    .returning()

  if (!row) {
    return c.json({ error: 'Failed to create log' }, 500)
  }

  return c.json({ log: serializeLog(row) }, 201)
})

app.get('/logs', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, c.var.user.id))
    .orderBy(desc(dailyLogs.logDate), desc(dailyLogs.createdAt))
    .limit(100)

  return c.json({ logs: rows.map(serializeLog) })
})

app.put('/logs/:id', async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null)

  const logDate = typeof body?.logDate === 'string' ? body.logDate.trim() : ''
  const note = typeof body?.note === 'string' ? body.note.trim() : ''
  const rawTags = Array.isArray(body?.tags) ? body.tags : []
  const tags = rawTags
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.trim())
    .filter(t => t.length > 0)
    .slice(0, 20)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return c.json({ error: 'logDate is required and must be YYYY-MM-DD' }, 400)
  }
  if (note.length === 0 || note.length > 2000) {
    return c.json({ error: 'note is required (1-2000 characters)' }, 400)
  }

  const db = getDb(c.env)
  const [row] = await db
    .update(dailyLogs)
    .set({ logDate, note, tags: JSON.stringify(tags) })
    .where(and(eq(dailyLogs.id, c.req.param('id')), eq(dailyLogs.userId, c.var.user.id)))
    .returning()

  if (!row) {
    return c.json({ error: 'Log not found' }, 404)
  }

  return c.json({ log: serializeLog(row) })
})

app.delete('/logs/:id', async (c) => {
  const db = getDb(c.env)
  const [row] = await db
    .delete(dailyLogs)
    .where(and(eq(dailyLogs.id, c.req.param('id')), eq(dailyLogs.userId, c.var.user.id)))
    .returning()

  if (!row) {
    return c.json({ error: 'Log not found' }, 404)
  }

  return c.json({ ok: true })
})

/* --------------------------------- Stats ---------------------------------- */

function toDayString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return toDayString(d)
}

app.get('/stats', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .select({ logDate: dailyLogs.logDate, tags: dailyLogs.tags })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, c.var.user.id))
    .orderBy(dailyLogs.logDate)
    .limit(5000)

  const days = [...new Set(rows.map(r => r.logDate))].sort()

  // Current streak: consecutive days ending today (or yesterday, so today's
  // missing log doesn't instantly reset the streak).
  let currentStreak = 0
  const today = toDayString(new Date())
  let cursor = days.includes(today) ? today : shiftDay(today, -1)
  while (days.includes(cursor)) {
    currentStreak++
    cursor = shiftDay(cursor, -1)
  }

  // Longest streak + total distinct days.
  let longestStreak = 0
  let run = 0
  let prev: string | null = null
  for (const day of days) {
    run = prev !== null && shiftDay(prev, 1) === day ? run + 1 : 1
    if (run > longestStreak) longestStreak = run
    prev = day
  }

  // Tag frequency across all logs.
  const tagCounts = new Map<string, number>()
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.tags ?? '[]')
      if (Array.isArray(parsed)) {
        for (const tag of parsed) {
          if (typeof tag === 'string' && tag.trim()) {
            tagCounts.set(tag.trim(), (tagCounts.get(tag.trim()) ?? 0) + 1)
          }
        }
      }
    }
    catch {
      // ignore malformed tags
    }
  }

  return c.json({
    currentStreak,
    longestStreak,
    totalDays: days.length,
    tagCounts: [...tagCounts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 8),
  })
})

app.get('/heatmap', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .select({ logDate: dailyLogs.logDate, count: sql<number>`count(*)` })
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, c.var.user.id))
    .groupBy(dailyLogs.logDate)

  return c.json({
    days: rows.map(r => ({ date: r.logDate, count: Number(r.count) })),
  })
})

/* --------------------------------- Export --------------------------------- */

app.get('/export', async (c) => {
  const db = getDb(c.env)
  const rows = await db
    .select()
    .from(dailyLogs)
    .where(eq(dailyLogs.userId, c.var.user.id))
    .orderBy(desc(dailyLogs.logDate))

  return c.json({
    exportedAt: new Date().toISOString(),
    user: {
      id: c.var.user.id,
      name: c.var.user.name,
      email: c.var.user.email,
      image: c.var.user.image,
    },
    logs: rows.map(serializeLog),
  })
})
