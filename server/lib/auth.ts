import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { Session, User } from 'better-auth/types'
import * as schema from '../../db/schema'
import { getDb } from './db'

declare global {
  namespace Cloudflare {
    interface Env {
      BETTER_AUTH_SECRET?: string
      BETTER_AUTH_URL?: string
      GOOGLE_CLIENT_ID?: string
      GOOGLE_CLIENT_SECRET?: string
      GROQ_API_KEY: string
      GEMINI_API_KEY: string
      CRON_SECRET: string
    }
  }
}

export type Auth = ReturnType<typeof createAuthInstance>
export type AuthSession = Session
export type AuthUser = User

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

/** Auth instance bound to a request's Cloudflare env (D1 + secrets). */
export function getAuth(env: Cloudflare.Env): Auth {
  // The local Miniflare runtime can replace its D1 stub during HMR while
  // retaining the same env proxy. Caching Better Auth here leaves it holding
  // a poisoned D1 stub, which breaks session checks and sign-in.
  return createAuthInstance(env)
}
