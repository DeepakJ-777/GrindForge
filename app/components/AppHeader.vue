<script setup lang="ts">
import { computed } from 'vue'
import { ref } from 'vue'

const route = useRoute()
const { user } = useAuth()
const sidebarOpen = useState('sidebar-open', () => false)

const titles: Array<[string, string]> = [
  ['/', 'Dashboard'],
  ['/activity', 'Activity'],
  ['/resume', 'Resume'],
  ['/interview', 'AI Interview'],
  ['/settings', 'Settings'],
  ['/profile', 'Profile'],
]

const title = computed(() => titles.find(([prefix]) => route.path === prefix)?.[1] ?? 'Dashboard')

const initials = computed(() => {
  const name = user.value?.name?.trim() ?? ''
  if (!name) return '?'
  const parts = name.split(/\s+/)
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase()
})

const showSearch = computed(() => route.path === '/activity')
const notificationsOpen = ref(false)
const { data: noticeData, refresh: refreshNotices } = useFetch<{ notifications: Array<{ id: string; title: string; body: string; readAt: string | null; createdAt: string }> }>('/api/notifications', {
  key: 'app:notifications',
  default: () => ({ notifications: [] }),
})
const unreadCount = computed(() => noticeData.value.notifications.filter(item => !item.readAt).length)

async function markRead(id: string) {
  await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
  await refreshNotices()
}

async function markAllRead() {
  await $fetch('/api/notifications/read-all', { method: 'POST' })
  await refreshNotices()
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur">
    <div class="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
      <!-- Mobile menu -->
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        class="lg:hidden"
        aria-label="Open menu"
        @click="sidebarOpen = true"
      />

      <h1 class="text-[17px] font-semibold text-ink">
        {{ title }}
      </h1>

      <div class="ml-auto flex items-center gap-2">
        <!-- Search lives only where it does something -->
        <UInput
          v-if="showSearch"
          icon="i-lucide-search"
          placeholder="Search activity…"
          size="sm"
          class="hidden sm:flex w-56"
          :model-value="($route.query.q as string) ?? ''"
          @update:model-value="$router.replace({ query: { ...$route.query, q: $event || undefined } })"
        />

        <UPopover v-model:open="notificationsOpen">
          <UButton icon="i-lucide-bell" color="neutral" variant="ghost" aria-label="Notifications">
            <span v-if="unreadCount" class="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary-600 text-[9px] text-white">{{ Math.min(unreadCount, 9) }}</span>
          </UButton>
          <template #content>
            <div class="w-[min(360px,calc(100vw-2rem))] p-3">
              <div class="flex items-center justify-between px-1 pb-2">
                <h2 class="text-sm font-semibold text-ink">Notifications</h2>
                <UButton v-if="unreadCount" size="xs" color="neutral" variant="ghost" @click="markAllRead">Mark all read</UButton>
              </div>
              <p v-if="!noticeData.notifications.length" class="px-1 py-5 text-center text-xs text-sub">You're all caught up.</p>
              <button v-for="notice in noticeData.notifications" :key="notice.id" type="button" class="block w-full rounded-lg px-2 py-2 text-left hover:bg-lav" @click="!notice.readAt && markRead(notice.id)">
                <span class="flex items-center gap-2 text-sm font-medium text-ink"><span v-if="!notice.readAt" class="size-2 rounded-full bg-primary-600" />{{ notice.title }}</span>
                <span class="mt-1 block text-xs leading-relaxed text-sub">{{ notice.body }}</span>
              </button>
            </div>
          </template>
        </UPopover>

        <NuxtLink to="/profile" class="ml-1 shrink-0 rounded-full transition hover:opacity-85">
          <UAvatar
            :src="user?.image ?? undefined"
            :text="initials"
            :alt="user?.name ?? 'User'"
            size="2xs"
          />
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
