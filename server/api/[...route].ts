import { toWebRequest } from 'h3'
import { app } from '../lib/api'

/**
 * Bridge Nitro -> Hono. Static routes (e.g. /api/db-test.ts) take
 * precedence over this catch-all, so both can coexist.
 */
export default defineEventHandler((event) => {
  return app.fetch(toWebRequest(event), event.context.cloudflare?.env)
})
