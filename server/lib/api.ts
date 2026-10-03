import { Hono, type Context, type Next } from 'hono'
import { desc, eq } from 'drizzle-orm'
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
