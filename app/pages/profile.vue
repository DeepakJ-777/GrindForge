<script setup lang="ts">
import { computed } from 'vue'

const { user } = useAuth()

const initials = computed(() => {
  const name = user.value?.name?.trim() ?? ''
  if (!name) return '?'
  const parts = name.split(/\s+/)
  return (parts[0]?.[0] ?? '').concat(parts[1]?.[0] ?? '').toUpperCase()
})

const joined = computed(() => {
  if (!user.value?.createdAt) return null
  return new Date(user.value.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
})

useHead({ title: 'Profile' })
</script>

<template>
  <div class="flex justify-center">
    <section class="gf-card w-full max-w-xl p-7 text-center">
      <UAvatar
        :src="user?.image ?? undefined"
        :text="initials"
        :alt="user?.name ?? 'User'"
        size="3xl"
        class="mx-auto"
      />
      <h2 class="mt-4 text-[20px] font-semibold text-ink">{{ user?.name }}</h2>
      <p class="mt-0.5 text-[13.5px] text-sub">{{ user?.email }}</p>

      <div v-if="joined" class="mx-auto mt-6 grid max-w-xs grid-cols-2 gap-3">
        <div class="rounded-[10px] border border-line px-4 py-3">
          <p class="text-[11px] font-semibold tracking-wide text-sub uppercase">Member since</p>
          <p class="mt-0.5 text-[13px] text-ink">{{ joined }}</p>
        </div>
        <div class="rounded-[10px] border border-line px-4 py-3">
          <p class="text-[11px] font-semibold tracking-wide text-sub uppercase">Sign-in</p>
          <p class="mt-0.5 text-[13px] text-ink">Google</p>
        </div>
      </div>

      <UButton
        to="/settings"

        class="mt-6"
        trailing-icon="i-lucide-arrow-right"
      >
        Manage settings
      </UButton>
    </section>
  </div>
</template>
