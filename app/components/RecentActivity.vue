<script setup lang="ts">
import { shallowRef } from 'vue'

const props = defineProps<{
  logs: Array<{
    id: string
    logDate: string
    note: string
    tags: string[]
  }>
}>()

const emit = defineEmits<{ changed: [] }>()

const confirmId = shallowRef<string | null>(null)

const TAG_ICONS: Array<[string[], string]> = [
  [['dsa'], 'i-lucide-binary'],
  [['development', 'dev'], 'i-lucide-code-2'],
  [['ml', 'machine learning', 'ai'], 'i-lucide-cpu'],
  [['cs fundamentals', 'cs', 'fundamentals'], 'i-lucide-book-open'],
  [['projects', 'project'], 'i-lucide-folder-git-2'],
  [['interview prep', 'interview'], 'i-lucide-mic'],
]

function iconFor(tags: string[]): string {
  const lower = tags.map(t => t.toLowerCase())
  for (const [keys, icon] of TAG_ICONS) {
    if (lower.some(t => keys.some(k => t.includes(k)))) return icon
  }
  return 'i-lucide-pencil-line'
}

async function remove(id: string) {
  if (confirmId.value !== id) {
    confirmId.value = id
    setTimeout(() => {
      if (confirmId.value === id) confirmId.value = null
    }, 3000)
    return
  }
  confirmId.value = null
  try {
    await $fetch(`/api/logs/${id}`, { method: 'DELETE' })
    emit('changed')
  }
  catch (err) {
    console.error('Failed to delete log', err)
  }
}
</script>

<template>
  <div class="gf-card p-5 sm:p-6">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
          <UIcon name="i-lucide-history" class="size-4 text-primary-600" />
        </span>
        <h2 class="text-[15px] font-semibold text-ink">Recent activity</h2>
      </div>
      <UButton
        to="/activity"
        label="View all"
        color="neutral"
        variant="ghost"
        size="xs"
        trailing-icon="i-lucide-arrow-right"
      />
    </div>

    <div class="mt-3 flex flex-col">
      <p v-if="!props.logs.length" class="py-8 text-center text-[13px] text-sub">
        No activity yet — log today's prep to start your history.
      </p>

      <div
        v-for="log in props.logs"
        :key="log.id"
        class="group flex items-start gap-3 border-b border-line/60 py-3 last:border-0"
      >
        <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-lav">
          <UIcon :name="iconFor(log.tags)" class="size-4 text-primary-600" />
        </span>

        <div class="min-w-0 flex-1">
          <p class="text-[11px] font-medium tracking-wide text-sub uppercase">{{ relativeDay(log.logDate) }}</p>
          <p class="mt-0.5 text-[13.5px] leading-snug text-ink">{{ log.note }}</p>
          <div v-if="log.tags.length" class="mt-1.5 flex flex-wrap gap-1">
            <span
              v-for="tag in log.tags"
              :key="tag"
              class="rounded-full bg-lav px-2 py-0.5 text-[11px] font-medium text-primary-700"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <UTooltip text="Edit on Activity page">
            <UButton
              to="/activity"
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="xs"
              aria-label="Edit log"
            />
          </UTooltip>
          <UTooltip :text="confirmId === log.id ? 'Click again to confirm' : 'Delete'">
            <UButton
              :icon="confirmId === log.id ? 'i-lucide-alert-triangle' : 'i-lucide-trash-2'"
              :color="confirmId === log.id ? 'error' : 'neutral'"
              variant="ghost"
              size="xs"
              aria-label="Delete log"
              @click="remove(log.id)"
            />
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
