import type { AuthUser } from '../composables/useAuth'

/**
 * Fetches the session once per request (SSR) with forwarded cookies so the
 * whole app shell can render from the serialized payload.
 */
export default defineNuxtPlugin(async () => {
  const user = useState<AuthUser | null>('auth:user', () => null)

  if (import.meta.server) {
    const $if = useRequestFetch()
    try {
      const res = await $if<{ user: AuthUser }>('/api/me')
      user.value = res.user
    }
    catch {
      user.value = null
    }
  }

  // Client relies on the SSR payload; state is mutated in place by
  // useAuth() after login/logout actions.
})
