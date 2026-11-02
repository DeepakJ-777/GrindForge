import { computed } from 'vue'
import type { Ref } from 'vue'

export interface AuthUser {
  id: string
  name: string
  email: string
  image?: string | null
  emailVerified?: boolean
  createdAt?: string
}

/**
 * App-wide auth state, hydrated once per request by plugins/auth.ts.
 * Login/logout mutate the shared state directly.
 */
export function useAuth() {
  const user = useState<AuthUser | null>('auth:user', () => null)

  const isLoggedIn = computed(() => user.value !== null)

  async function loginWithGoogle() {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/',
    })
  }

  async function logout() {
    await authClient.signOut()
    user.value = null
    await navigateTo('/')
  }

  async function refresh() {
    try {
      const res = await $fetch<{ user: AuthUser }>('/api/me')
      user.value = res.user
    }
    catch {
      user.value = null
    }
  }

  return { user: user as Ref<AuthUser | null>, isLoggedIn, loginWithGoogle, logout, refresh }
}
