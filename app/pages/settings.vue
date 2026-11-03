<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const { user, logout } = useAuth()
const settings = useSettings()
const busy = ref(false)
const error = ref('')
const message = ref('')
const timezone = ref(settings.value.timezone)
const reminderHour = ref(settings.value.reminderHour)

const joined = computed(() => user.value?.createdAt
  ? new Date(user.value.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  : null)
const initials = computed(() => {
  const parts = user.value?.name?.trim().split(/\s+/) ?? []
  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || '?'
})

async function saveSettings() {
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    const result = await $fetch<{ settings: typeof settings.value }>('/api/settings', {
      method: 'PUT',
      body: { ...settings.value, timezone: timezone.value, reminderHour: Number(reminderHour.value) },
    })
    settings.value = result.settings
    message.value = 'Preferences saved.'
  } catch (cause: any) {
    error.value = cause?.data?.error ?? 'Could not save preferences.'
  } finally {
    busy.value = false
  }
}

async function loadSettings() {
  try {
    const result = await $fetch<{ settings: typeof settings.value }>('/api/settings')
    settings.value = result.settings
    timezone.value = result.settings.timezone
    reminderHour.value = result.settings.reminderHour
  } catch {
    error.value = 'Could not load your preferences. Sign in and try again.'
  }
}

async function exportData() {
  try {
    const [logs, prefs, interviews, notices] = await Promise.all([
      $fetch('/api/export'), $fetch('/api/settings'), $fetch('/api/interviews'), $fetch('/api/notifications'),
    ])
    const blob = new Blob([JSON.stringify({ logs, prefs, interviews, notices }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'grindforge-export.json'
    anchor.click()
    URL.revokeObjectURL(url)
  } catch {
    error.value = 'Could not export your data.'
  }
}

onMounted(loadSettings)
useHead({ title: 'Settings' })
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="gf-card p-6">
      <h2 class="text-[16px] font-semibold text-ink">Account</h2>
      <div class="mt-4 flex flex-wrap items-center gap-4">
        <UAvatar :src="user?.image ?? undefined" :text="initials" :alt="user?.name ?? 'User'" size="xl" />
        <div class="grid flex-1 gap-3 sm:grid-cols-2">
          <div><p class="text-[11px] font-semibold tracking-wide text-sub uppercase">Name</p><p class="mt-0.5 text-[13.5px] text-ink">{{ user?.name }}</p></div>
          <div><p class="text-[11px] font-semibold tracking-wide text-sub uppercase">Email</p><p class="mt-0.5 text-[13.5px] text-ink">{{ user?.email }}</p></div>
          <div v-if="joined"><p class="text-[11px] font-semibold tracking-wide text-sub uppercase">Member since</p><p class="mt-0.5 text-[13.5px] text-ink">{{ joined }}</p></div>
          <div><p class="text-[11px] font-semibold tracking-wide text-sub uppercase">Picture</p><p class="mt-0.5 text-[13.5px] text-sub">Managed by your Google account</p></div>
        </div>
      </div>
    </section>



    <section class="gf-card p-6">
      <h2 class="text-[16px] font-semibold text-ink">Authentication</h2>
      <p class="mt-1 text-[13px] text-sub">You're signed in with Google. Signing out keeps your data linked to your account.</p>
      <UButton
        icon="i-lucide-log-out"
        class="mt-4 !bg-red-600 !text-white hover:!bg-red-700 !border-red-600"
        @click="logout"
      >
        Sign out
      </UButton>
    </section>
  </div>
</template>
