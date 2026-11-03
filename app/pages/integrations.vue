
<script setup lang="ts">
import { ref, onMounted } from 'vue'

useHead({ title: 'Integrations | GRINDFORGE' })

interface LeetCodeStats {
  username: string
  realName: string | null
  ranking: number | null
  avatar: string | null
  country: string | null
  solved: {
    all: number
    easy: number
    medium: number
    hard: number
  }
}

const username = ref('')
const stats = ref<LeetCodeStats | null>(null)
const lastSyncedAt = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const syncing = ref(false)
const error = ref('')
const message = ref('')
const githubUsername = ref<string | null>(null)
const githubConnected = ref(false)
const githubSyncing = ref(false)
const githubStats = ref<{
  username: string
  totalContributions: number
} | null>(null)
const githubLastSyncedAt = ref<string | null>(null)

async function loadIntegrations() {
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch<{
  leetcode: {
    username: string | null
    stats: LeetCodeStats | null
    lastSyncedAt: string | null
  }
  github: {
  username: string | null
  connected: boolean
  stats: {
    username: string
    totalContributions: number
  } | null
  lastSyncedAt: string | null
}
}>('/api/integrations')

    username.value = result.leetcode.username ?? ''
    stats.value = result.leetcode.stats
    lastSyncedAt.value = result.leetcode.lastSyncedAt
    githubUsername.value = result.github.username
githubConnected.value = result.github.connected
githubStats.value = result.github.stats as {
  username: string
  totalContributions: number
} | null

githubLastSyncedAt.value = result.github.lastSyncedAt
  } catch {
    error.value = 'Could not load integrations. Please sign in and try again.'
  } finally {
    loading.value = false
  }
}

async function saveUsername() {
  saving.value = true
  error.value = ''
  message.value = ''

  try {
    const result = await $fetch<{ success: boolean; username: string }>(
      '/api/integrations/leetcode',
      {
        method: 'PUT',
        body: { username: username.value },
      },
    )

    username.value = result.username
    stats.value = null
    lastSyncedAt.value = null
    message.value = 'LeetCode username saved. Sync your profile next.'
  } catch (cause: unknown) {
    error.value = 'Could not save the username. Check it and try again.'
  } finally {
    saving.value = false
  }
}

async function syncLeetCode() {
  syncing.value = true
  error.value = ''
  message.value = ''

  try {
    const result = await $fetch<{
      success: boolean
      stats: LeetCodeStats
      lastSyncedAt: string
    }>('/api/integrations/leetcode/sync', {
      method: 'POST',
    })

    stats.value = result.stats
    lastSyncedAt.value = result.lastSyncedAt
    message.value = 'LeetCode statistics synced successfully!'
  } catch (cause: any) {
    error.value = cause?.data?.error
      ?? 'Could not sync LeetCode. Please try again.'
  } finally {
    syncing.value = false
  }
}
async function syncGitHub() {
  githubSyncing.value = true
  error.value = ''
  message.value = ''

  try {
    const result = await $fetch<{
      success: boolean
      stats: {
        username: string
        totalContributions: number
      }
      lastSyncedAt: string
    }>('/api/integrations/github/sync', {
      method: 'POST',
    })

    githubStats.value = result.stats
    githubUsername.value = result.stats.username
    githubLastSyncedAt.value = result.lastSyncedAt
    githubConnected.value = true

    message.value = 'GitHub contributions synced successfully!'
  } catch (cause: any) {
    error.value = cause?.data?.error
      ?? 'Could not sync GitHub. Please try again.'
  } finally {
    githubSyncing.value = false
  }
}
function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(loadIntegrations)
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="gf-card p-6 sm:p-7">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-xl font-bold text-orange-600">
          LC
        </div>
        <div class="flex-1">
          <h2 class="text-lg font-semibold text-ink">LeetCode</h2>
          <p class="mt-1 text-sm text-sub">
            Connect your coding profile and track your problem-solving progress.
          </p>
        </div>
        <UBadge :color="stats ? 'success' : 'neutral'" variant="soft">
          {{ stats ? 'Synced' : username ? 'Connected' : 'Not connected' }}
        </UBadge>
      </div>

      <p v-if="loading" class="mt-6 text-sm text-sub">
        Loading your integration…
      </p>

      <template v-else>
        <form class="mt-6 flex flex-col gap-3" @submit.prevent="saveUsername">
          <div>
            <label for="leetcode-username" class="mb-2 block text-sm font-medium text-ink">
              LeetCode username
            </label>
            <input
              id="leetcode-username"
              v-model="username"
              type="text"
              maxlength="30"
              autocomplete="off"
              placeholder="Enter your LeetCode username"
              class="w-full rounded-lg border border-line bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-primary-500"
              :disabled="saving || syncing"
            />
          </div>

          <div class="flex items-center gap-3">
            <UButton
              type="submit"
              :loading="saving"
              :disabled="saving || syncing || !username.trim()"
            >
              Save username
            </UButton>

            <UButton
              type="button"
              :loading="syncing"
              :disabled="syncing || saving || !username.trim()"
              @click="syncLeetCode"
            >
              Sync LeetCode
            </UButton>
          </div>
        </form>
      </template>

      <div v-if="stats" class="mt-7 border-t border-line pt-6">
        <div class="flex items-center gap-3">
          <img
            v-if="stats.avatar"
            :src="stats.avatar"
            alt="LeetCode avatar"
            class="h-12 w-12 rounded-full object-cover"
          />
          <div>
            <h3 class="font-semibold text-ink">
              {{ stats.realName || stats.username }}
            </h3>
            <a
              :href="`https://leetcode.com/u/${encodeURIComponent(stats.username)}/`"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-primary-600"
            >
              @{{ stats.username }} ↗
            </a>
          </div>
        </div>

        <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="rounded-xl border border-line p-4">
            <p class="text-xs text-sub">Total solved</p>
            <p class="mt-2 text-2xl font-bold text-ink">{{ stats.solved.all }}</p>
          </div>
          <div class="rounded-xl border border-line p-4">
            <p class="text-xs text-sub">Easy</p>
            <p class="mt-2 text-2xl font-bold text-green-600">{{ stats.solved.easy }}</p>
          </div>
          <div class="rounded-xl border border-line p-4">
            <p class="text-xs text-sub">Medium</p>
            <p class="mt-2 text-2xl font-bold text-orange-500">{{ stats.solved.medium }}</p>
          </div>
          <div class="rounded-xl border border-line p-4">
            <p class="text-xs text-sub">Hard</p>
            <p class="mt-2 text-2xl font-bold text-red-500">{{ stats.solved.hard }}</p>
          </div>
        </div>

        <div v-if="stats.ranking" class="mt-4 rounded-xl bg-canvas/60 p-4">
          <p class="text-sm text-sub">Global ranking</p>
          <p class="mt-1 text-xl font-semibold text-ink">
            #{{ stats.ranking.toLocaleString() }}
          </p>
        </div>

        <p v-if="lastSyncedAt" class="mt-4 text-xs text-sub">
          Last synced: {{ formatDate(lastSyncedAt) }}
        </p>
      </div>

      <p v-if="message" role="status" class="mt-4 text-sm text-green-700">
        {{ message }}
      </p>
      <p v-if="error" role="alert" class="mt-4 text-sm text-red-600">
        {{ error }}
      </p>
    </section>
        <section class="gf-card p-6 sm:p-7">
      <div class="flex items-start gap-4">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-lav text-xl font-bold text-ink">
          GH
        </div>

        <div class="flex-1">
          <h2 class="text-lg font-semibold text-ink">GitHub</h2>
          <p class="mt-1 text-sm text-sub">
            Connect your GitHub profile to track your coding activity and contribution history.
          </p>
        </div>

        <UBadge :color="githubConnected ? 'success' : 'neutral'" variant="soft">
          {{ githubConnected ? 'Connected' : 'Not connected' }}
        </UBadge>
      </div>

      <div v-if="githubConnected" class="mt-5">
        <p class="text-sm text-ink">
          Connected as
          <a
            :href="`https://github.com/${encodeURIComponent(githubUsername || '')}`"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary-600"
          >
            @{{ githubUsername }} ↗
          </a>
        </p>
        <div v-if="githubStats" class="mt-4 rounded-xl border border-line p-4">
  <p class="text-sm text-sub">Contributions in the last year</p>
  <p class="mt-2 text-2xl font-bold text-ink">
    {{ githubStats.totalContributions.toLocaleString() }}
  </p>
  <p v-if="githubLastSyncedAt" class="mt-2 text-xs text-sub">
    Last synced: {{ formatDate(githubLastSyncedAt) }}
  </p>
</div>

<div class="mt-4 flex flex-wrap items-center gap-3">
  <UButton
    :loading="githubSyncing"
    :disabled="githubSyncing"
    @click="syncGitHub"
  >
    Sync GitHub
  </UButton>

  <a
    href="/api/integrations/github/connect?switch=1"
    class="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:bg-canvas"
  >
    Use another account
  </a>
</div>
      </div>

      <div v-else class="mt-5">
        <a
  href="/api/integrations/github/connect"
  class="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
>
  Connect GitHub
</a>
      </div>
    </section>
    <section class="gf-card p-5">
      <h3 class="text-sm font-semibold text-ink">About this integration</h3>
      <p class="mt-1 text-sm leading-relaxed text-sub">
        GRINDFORGE fetches publicly available LeetCode profile statistics. Availability
        depends on LeetCode's public GraphQL service. Your saved snapshot remains
        available until you change the username or sync again.
      </p>
    </section>
  </div>
</template>
