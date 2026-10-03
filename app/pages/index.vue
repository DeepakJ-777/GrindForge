<script setup lang="ts">
import { computed, reactive, shallowRef, watch } from 'vue'

interface MeUser {
  id: string
  name: string
  email: string
  image?: string | null
  emailVerified?: boolean
}

interface LogItem {
  id: string
  logDate: string
  note: string
  tags: string[]
  createdAt: string
}

const { data: me, pending, refresh: refreshMe } = await useFetch<{ user: MeUser | null }>('/api/me', {
  default: () => ({ user: null }),
})

const user = computed(() => me.value?.user ?? null)
const loading = computed(() => pending.value)

/* --------------------------------- Logs UI -------------------------------- */

const logs = shallowRef<LogItem[]>([])
const logsLoading = shallowRef(false)
const logsError = shallowRef<string | null>(null)

const form = reactive({
  logDate: new Date().toISOString().slice(0, 10),
  note: '',
  tags: '',
})

const saving = shallowRef(false)

async function loadLogs() {
  if (!user.value) {
    logs.value = []
    return
  }
  logsLoading.value = true
  logsError.value = null
  try {
    const res = await $fetch<{ logs: LogItem[] }>('/api/logs')
    logs.value = res.logs
  }
  catch (err) {
    logsError.value = (err as Error).message || 'Failed to load logs'
  }
  finally {
    logsLoading.value = false
  }
}

watch(user, () => { void loadLogs() }, { immediate: true })

async function submitLog() {
  saving.value = true
  try {
    await $fetch('/api/logs', {
      method: 'POST',
      body: {
        logDate: form.logDate,
        note: form.note,
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0),
      },
    })
    form.note = ''
    form.tags = ''
    await loadLogs()
  }
  catch (err) {
    logsError.value = (err as Error).message || 'Failed to save log'
  }
  finally {
    saving.value = false
  }
}

/* ---------------------------------- Auth ---------------------------------- */

async function logout() {
  await authClient.signOut()
  await refreshMe()
}

useHead({ title: 'Placement' })
</script>

<template>
  <main class="page">
    <section class="card">
      <header class="header">
        <h1>Placement</h1>
        <template v-if="user">
          <div class="user">
            <img v-if="user.image" :src="user.image" alt="" class="avatar">
            <div>
              <strong>{{ user.name }}</strong>
              <div class="muted">{{ user.email }}</div>
            </div>
          </div>
          <button class="danger" @click="logout">Log out</button>
        </template>
      </header>

      <p v-if="loading" class="muted">Loading session…</p>

      <template v-else-if="user">
        <form class="log-form" @submit.prevent="submitLog">
          <label>
            Date
            <input v-model="form.logDate" type="date" required>
          </label>
          <label>
            Note
            <textarea
              v-model="form.note"
              placeholder="What did you do today?"
              rows="3"
              maxlength="2000"
              required
            />
          </label>
          <label>
            Tags (comma separated)
            <input v-model="form.tags" type="text" placeholder="leetcode, interview, resume">
          </label>
          <button type="submit" :disabled="saving || form.note.trim().length === 0">
            {{ saving ? 'Saving…' : 'Add log' }}
          </button>
        </form>

        <p v-if="logsError" class="error">{{ logsError }}</p>
        <p v-else-if="logsLoading" class="muted">Loading logs…</p>

        <div v-else class="logs">
          <p v-if="logs.length === 0" class="muted">No logs yet. Add your first one above.</p>
          <article v-for="log in logs" :key="log.id" class="log">
            <div class="log-head">
              <time :datetime="log.logDate">{{ log.logDate }}</time>
              <div v-if="log.tags.length" class="tags">
                <span v-for="tag in log.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <p class="log-note">{{ log.note }}</p>
          </article>
        </div>
      </template>

      <template v-else>
        <p class="muted">You are not logged in. /api/me returns 401.</p>
        <button @click="authClient.signIn.social({ provider: 'google', callbackURL: '/' })">
          Sign in with Google
        </button>
      </template>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 0;
  font-family: system-ui, sans-serif;
  background: #f6f7f9;
  color: #111;
  margin: 0;
}
.card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  width: min(92vw, 520px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
h1 {
  margin: 0;
  font-size: 1.5rem;
}
.user {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.muted {
  color: #6b7280;
  font-size: 0.875rem;
}
.error {
  color: #dc2626;
  font-size: 0.875rem;
}
.log-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.log-form label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #374151;
}
.log-form input,
.log-form textarea {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  font: inherit;
}
.log-form textarea {
  resize: vertical;
}
.logs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.log {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}
.log-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.log-head time {
  font-weight: 600;
  font-size: 0.875rem;
}
.tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.tag {
  background: #e0e7ff;
  color: #3730a3;
  border-radius: 999px;
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
}
.log-note {
  margin: 0.5rem 0 0;
  font-size: 0.925rem;
  white-space: pre-wrap;
}
button {
  border: 0;
  border-radius: 8px;
  padding: 0.6rem 1rem;
  font-size: 0.95rem;
  background: #1d4ed8;
  color: #fff;
  cursor: pointer;
}
button:hover { background: #1e40af; }
button.danger { background: #dc2626; }
button.danger:hover { background: #b91c1c; }
button:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
