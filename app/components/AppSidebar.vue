<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const { user, logout } = useAuth()

const mainNav = [
  { label: 'Dashboard', to: '/', icon: 'i-lucide-layout-dashboard' },
  { label: 'Activity', to: '/activity', icon: 'i-lucide-activity' },
  { label: 'Resume', to: '/resume', icon: 'i-lucide-file-text' },
  { label: 'AI Interview', to: '/interview', icon: 'i-lucide-mic' },
]

const secondaryNav = [
  { label: 'Integrations', to: '/integrations', icon: 'i-lucide-plug-zap' },
  { label: 'Settings', to: '/settings', icon: 'i-lucide-settings' },
  { label: 'Profile', to: '/profile', icon: 'i-lucide-user-round' },
]

const initials = computed(() => {
  const name = user.value?.name?.trim() ?? ''
  if (!name) return '?'
  const parts = name.split(/\s+/)
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase()
})

function isActive(to: string) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div class="flex h-full flex-col bg-surface">
    <!-- Brand -->
    <NuxtLink to="/" class="flex items-center gap-2.5 px-5 pt-6 pb-5">
      <span class="flex size-9 items-center justify-center rounded-[10px] bg-primary-600 shadow-sm">
        <UIcon name="i-lucide-flame" class="size-5 text-white" />
      </span>
      <span class="text-[15px] font-bold tracking-[0.18em] text-ink">GRINDFORGE</span>
    </NuxtLink>

    <!-- Primary nav -->
    <nav class="flex flex-col gap-1 px-3">
      <NuxtLink
        v-for="item in mainNav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-lav text-primary-400'
          : 'text-sub hover:bg-lav/60 hover:text-ink'"
      >
        <UIcon
          :name="item.icon"
          class="size-[18px]"
          :class="isActive(item.to) ? 'text-primary-600' : 'text-sub/80'"
        />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="mx-5 my-4 h-px bg-line" />

    <!-- Secondary nav -->
    <nav class="flex flex-col gap-1 px-3">
      <NuxtLink
        v-for="item in secondaryNav"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-lav text-primary-400'
          : 'text-sub hover:bg-lav/60 hover:text-ink'"
      >
        <UIcon
          :name="item.icon"
          class="size-[18px]"
          :class="isActive(item.to) ? 'text-primary-600' : 'text-sub/80'"
        />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- User -->
    <div class="mt-auto border-t border-line p-4">
      <div class="flex items-center gap-3">
        <UAvatar
          :src="user?.image ?? undefined"
          :text="initials"
          :alt="user?.name ?? 'User'"
          size="sm"
          class="shrink-0"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-semibold text-ink">{{ user?.name }}</p>
          <p class="truncate text-[11.5px] text-sub">{{ user?.email }}</p>
        </div>
        <UTooltip text="Log out">
          <UButton
            icon="i-lucide-log-out"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Log out"
            @click="logout"
          />
        </UTooltip>
      </div>
    </div>
  </div>
</template>
