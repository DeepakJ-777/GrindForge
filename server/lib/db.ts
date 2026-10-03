import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../../db/schema'

/** Drizzle instance bound to the request's D1 database. */
export function getDb(env: Cloudflare.Env) {
  return drizzle(env.placement_db, { schema })
}
