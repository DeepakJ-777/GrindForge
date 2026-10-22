<script setup lang="ts">
import { computed } from 'vue'

const { user } = useAuth()

const { data: stats } = useFetch<Stats | null>('/api/stats', {
  key: 'dashboard:stats',
  default: () => null,
})

const { data: heatmap } = useFetch<{ days: HeatmapDay[] }>('/api/heatmap', {
  key: 'dashboard:heatmap',
  default: () => ({ days: [] }),
})

const { data: logsData, refresh: refreshLogs } = useFetch<{ logs: LogItem[] }>('/api/logs', {
  key: 'dashboard:logs',
  default: () => ({ logs: [] }),
})

const recentLogs = computed(() => logsData.value.logs.slice(0, 6))

function refreshAll() {
  void refreshLogs()
  void refreshNuxtData('dashboard:stats')
  void refreshNuxtData('dashboard:heatmap')
}

const firstName = computed(() => user.value?.name?.split(/\s+/)[0] ?? 'there')

useHead({ title: 'Dashboard' })
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Welcome -->
    <section class="gf-card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
      <div>
        <h2 class="text-[24px] leading-tight font-semibold text-ink sm:text-[26px]">
          Welcome back, {{ firstName }}
        </h2>
        <p class="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-sub">
          Keep building your skills. Your next opportunity is built through consistent preparation.
        </p>
      </div>
      <UButton
        to="/activity"
        color="neutral"
        variant="soft"
        trailing-icon="i-lucide-arrow-right"
      >
        View all activity
      </UButton>
    </section>

    <!-- Stats -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Current streak"
        :value="stats?.currentStreak ?? 0"
        icon="i-lucide-flame"
        :hint="stats?.currentStreak ? 'days in a row' : 'log today to start'"
      />
      <StatCard
        label="Longest streak"
        :value="stats?.longestStreak ?? 0"
        icon="i-lucide-trophy"
        :hint="stats?.longestStreak ? 'personal best' : 'not set yet'"
      />
      <StatCard
        label="Prep days"
        :value="stats?.totalDays ?? 0"
        icon="i-lucide-calendar-check"
        hint="total days logged"
      />
      <StatCard
        label="Resume"
        value="Not uploaded"
        icon="i-lucide-file-text"
        hint="uploads coming soon"
      />
    </section>

    <!-- Quick log + rail -->
    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <QuickLog @saved="refreshAll" />
      </div>
      <InfoRail :logs="logsData.logs" />
    </section>

    <!-- Heatmap -->
    <ActivityHeatmap :days="heatmap.days" />

    <!-- Recent + topics -->
    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <RecentActivity :logs="recentLogs" @changed="refreshAll" />
      </div>
      <TopicBreakdown :tag-counts="stats?.tagCounts ?? []" />
    </section>
  </div>
</template>
