import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { InferSession, InferUser } from 'better-auth/types'
import * as schema from '../../db/schema'
import { getDb } from './db'

declare global {
  namespace Cloudflare {
    interface Env {
      BETTER_AUTH_SECRET?: string
      BETTER_AUTH_URL?: string
      GOOGLE_CLIENT_ID?: string
      GOOGLE_CLIENT_SECRET?: string
    }
  }
}

export type Auth = ReturnType<typeof createAuthInstance>
export type AuthSession = InferSession<Auth>
export type AuthUser = InferUser<Auth>

function createAuthInstance(env: Cloudflare.Env) {
  const db = getDb(env)

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || undefined,
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },
  })
}

const authCache = new WeakMap<object, Auth>()

/** Auth instance bound to a request's Cloudflare env (D1 + secrets). */
export function getAuth(env: Cloudflare.Env): Auth {
  let auth = authCache.get(env)
  if (!auth) {
    auth = createAuthInstance(env)
    authCache.set(env, auth)
  }
  return auth
}
