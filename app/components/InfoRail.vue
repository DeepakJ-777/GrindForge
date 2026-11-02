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
    <div class="gf-card p-5">
      <div class="flex items-center gap-2.5">
        <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
          <UIcon name="i-lucide-calendar-check" class="size-4 text-primary-600" />
        </span>
        <h2 class="text-[15px] font-semibold text-ink">This week</h2>
      </div>
      <div class="mt-3 flex items-end gap-6">
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
    <div class="gf-card p-5">
      <div class="flex items-center gap-2.5">
        <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
          <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary-600" />
        </span>
        <h2 class="text-[15px] font-semibold text-ink">Upcoming</h2>
      </div>
      <div class="mt-3 flex flex-col gap-2.5">
        <div class="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5">
          <UIcon name="i-lucide-mic" class="size-4 text-sub" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-medium text-ink">Mock interview</p>
            <p class="text-[11.5px] text-sub">Not scheduled</p>
          </div>
        </div>
        <div class="flex items-center gap-3 rounded-[10px] border border-line px-3 py-2.5">
          <UIcon name="i-lucide-file-search" class="size-4 text-sub" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] font-medium text-ink">Resume review</p>
            <p class="text-[11.5px] text-sub">Not scheduled</p>
          </div>
        </div>
      </div>
      <UButton
        to="/interview"
        label="Practice an interview"
        color="neutral"
        variant="soft"
        size="xs"
        block
        class="mt-3"
        trailing-icon="i-lucide-arrow-right"
      />
    </div>
  </div>
</template>
