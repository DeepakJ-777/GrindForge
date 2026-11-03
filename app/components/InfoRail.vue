<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ logs: Array<{ logDate: string }>; timezone?: string }>(), {
  timezone: 'Asia/Kolkata',
})

function isThisWeek(iso: string): boolean {
  const todayStringInZone = todayString(props.timezone)
  const today = new Date(`${todayStringInZone}T00:00:00.000Z`)
  const sunday = new Date(today)
  sunday.setUTCDate(sunday.getUTCDate() - sunday.getUTCDay())
  const d = new Date(`${iso}T00:00:00.000Z`)
  return d.getTime() >= sunday.getTime() && d.getTime() <= today.getTime()
}

const thisWeekLogs = computed(() => props.logs.filter(l => isThisWeek(l.logDate)).length)
const thisWeekDays = computed(() => new Set(props.logs.filter(l => isThisWeek(l.logDate)).map(l => l.logDate)).size)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- This week (real data) -->
    <div class="gf-card flex flex-col p-5 xl:min-h-[265px]">
      <div class="flex items-center gap-2.5">
        <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
          <UIcon name="i-lucide-calendar-check" class="size-4 text-primary-600" />
        </span>
        <h2 class="text-[15px] font-semibold text-ink">This week</h2>
      </div>
      <div class="mt-4 flex flex-1 items-center gap-6 xl:mt-0 xl:px-4">
        <div>
          <p class="text-[22px] leading-tight font-semibold text-ink">{{ thisWeekDays }}</p>
          <p class="text-[11.5px] text-sub">active days</p>
        </div>
        <div>
          <p class="text-[22px] leading-tight font-semibold text-ink">{{ thisWeekLogs }}</p>
          <p class="text-[11.5px] text-sub">logs</p>
        </div>
      </div>
    </div>

    <!-- Upcoming -->

  </div>
</template>
