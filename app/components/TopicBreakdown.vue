<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ tagCounts: Array<{ tag: string, count: number }> }>()

const BAR_COLORS = [
  'bg-primary-600',
  'bg-primary-400',
  'bg-secondary-500',
  'bg-primary-300',
  'bg-secondary-300',
  'bg-primary-200',
]

const rows = computed(() => {
  const top = props.tagCounts.slice(0, 6)
  const max = Math.max(1, ...top.map(t => t.count))
  return top.map((t, i) => ({
    ...t,
    pct: Math.round((t.count / max) * 100),
    color: BAR_COLORS[i % BAR_COLORS.length]!,
  }))
})

const total = computed(() => props.tagCounts.reduce((s, t) => s + t.count, 0))
</script>

<template>
  <div class="gf-card p-5 sm:p-6">
    <div class="flex items-center gap-2.5">
      <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
        <UIcon name="i-lucide-chart-column" class="size-4 text-primary-600" />
      </span>
      <div>
        <h2 class="text-[15px] font-semibold text-ink">Topics</h2>
        <p class="text-[12.5px] text-sub">{{ total }} tagged logs in total</p>
      </div>
    </div>

    <p v-if="!rows.length" class="py-8 text-center text-[13px] text-sub">
      Tag your logs to see a topic breakdown.
    </p>

    <div v-else class="mt-4 flex flex-col gap-3">
      <div v-for="row in rows" :key="row.tag">
        <div class="mb-1 flex items-baseline justify-between">
          <span class="text-[13px] font-medium text-ink">{{ row.tag }}</span>
          <span class="text-[11.5px] text-sub">{{ row.count }}</span>
        </div>
        <div class="h-[6px] w-full overflow-hidden rounded-full bg-lav">
          <div
            class="h-full rounded-full transition-[width] duration-500"
            :class="row.color"
            :style="{ width: `${row.pct}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
