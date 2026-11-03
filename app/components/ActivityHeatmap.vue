<script setup lang="ts">
import { computed } from 'vue'


const props = defineProps<{
  days: Array<{
    date: string
    count: number
    logs?: number
    leetcode?: number
    github?: number
  }>
}>()


interface Cell {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
  inFuture: boolean
}

const countByDate = computed(() => {
  const map = new Map<string, number>()
  for (const d of props.days ?? []) map.set(d.date, d.count)
  return map
})

function levelFor(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

const WEEKS = 53

const weeks = computed<Cell[][]>(() => {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

  // Sunday of the current week
  const thisSunday = new Date(todayUtc)
  thisSunday.setUTCDate(thisSunday.getUTCDate() - thisSunday.getUTCDay())

  const start = new Date(thisSunday)
  start.setUTCDate(start.getUTCDate() - (WEEKS - 1) * 7)

  const columns: Cell[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < WEEKS; w++) {
    const column: Cell[] = []
    for (let dow = 0; dow < 7; dow++) {
      const iso = cursor.toISOString().slice(0, 10)
      const count = countByDate.value.get(iso) ?? 0
      column.push({
        date: iso,
        count,
        level: levelFor(count),
        inFuture: cursor.getTime() > todayUtc.getTime(),
      })
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    columns.push(column)
  }
  return columns
})

const monthLabels = computed<string[]>(() => {
  const labels: string[] = []
  let lastMonth = -1
  for (const week of weeks.value) {
    // Label a week whose Monday-ish mid cells enter a new month
    const mid = week[0]
    if (!mid) {
      labels.push('')
      continue
    }
    const month = new Date(`${mid.date}T00:00:00.000Z`).getUTCMonth()
    if (month !== lastMonth && week.some(c => new Date(`${c.date}T00:00:00.000Z`).getUTCDate() <= 7)) {
      labels.push(new Date(`${mid.date}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }))
      lastMonth = month
    }
    else {
      labels.push('')
    }
  }
  return labels
})


function titleFor(cell: Cell): string {
  if (cell.inFuture) return cell.date

  const day = props.days.find(item => item.date === cell.date)

  if (!day || cell.count === 0) {
    return `No recorded activity · ${cell.date}`
  }

  return [
    cell.date,
    `Prep logs: ${day.logs ?? 0}`,
    `LeetCode submissions: ${day.leetcode ?? 0}`,
    `GitHub contributions: ${day.github ?? 0}`,
  ].join(' · ')
}


</script>

<template>
  <div class="gf-card p-5 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2.5">
        <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
          <UIcon name="i-lucide-calendar-days" class="size-4 text-primary-600" />
        </span>
        <div>
          <h2 class="text-[15px] font-semibold text-ink">Activity heatmap</h2>
<p class="text-[12.5px] text-sub"></p>        </div>
      </div>
    </div>

    <div class="mt-4 overflow-x-auto pb-1">
      <div class="min-w-max">
        <!-- Month labels -->
        <div class="flex gap-[3px] pl-[34px]">
          <div
            v-for="(label, i) in monthLabels"
            :key="i"
            class="w-[12px] text-[10px] leading-4 text-sub"
          >
            <span v-if="label" class="whitespace-nowrap">{{ label }}</span>
          </div>
        </div>

        <div class="flex gap-[3px]">
          <!-- Weekday labels: rows are Sun..Sat, label Mon/Wed/Fri -->
          <div class="mr-1 flex w-[30px] flex-col gap-[3px] text-[9px] leading-[12px] text-sub">
            <div class="h-[12px]" />
            <div class="h-[12px]">Mon</div>
            <div class="h-[12px]" />
            <div class="h-[12px]">Wed</div>
            <div class="h-[12px]" />
            <div class="h-[12px]">Fri</div>
            <div class="h-[12px]" />
          </div>

          <!-- Grid -->
          <div class="flex gap-[3px]">
            <div v-for="(week, wi) in weeks" :key="wi" class="flex flex-col gap-[3px]">
              <div
                v-for="cell in week"
                :key="cell.date"
                :title="titleFor(cell)"
                class="size-[12px] rounded-[3px]"
                :class="[`bg-heat-${cell.level}`, cell.inFuture && 'opacity-30']"
              />
            </div>
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-sub">
          <span>Less</span>
          <span class="size-[12px] rounded-[3px] bg-heat-0" />
          <span class="size-[12px] rounded-[3px] bg-heat-1" />
          <span class="size-[12px] rounded-[3px] bg-heat-2" />
          <span class="size-[12px] rounded-[3px] bg-heat-3" />
          <span class="size-[12px] rounded-[3px] bg-heat-4" />
          <span>More</span>
        </div>
      </div>
    </div>
  </div>
</template>
