<script setup lang="ts">
import { computed } from 'vue'

const { user } = useAuth()
const settings = useSettings()

const { data: resumeData } = useFetch<{ resume: { filename: string; updatedAt: string } | null }>('/api/resume', {
  key: 'dashboard:resume',
  default: () => ({ resume: null }),
})

const { data: stats } = useFetch<Stats | null>('/api/stats', {
  key: 'dashboard:stats',
  default: () => null,
})

interface DashboardIntegrations {
  leetcode: {
    username: string | null
    stats: {
      solved: {
        all: number
        easy: number
        medium: number
        hard: number
      }
    } | null
    lastSyncedAt: string | null
  }
  github: {
    username: string | null
    connected: boolean
    stats: {
      username: string
      totalContributions: number
    } | null
    lastSyncedAt: string | null
  }
}

const { data: integrationsData } = useFetch<DashboardIntegrations>(
  '/api/integrations',
  {
    key: 'dashboard:integrations',
    default: () => ({
      leetcode: { username: null, stats: null, lastSyncedAt: null },
      github: {
        username: null,
        connected: false,
        stats: null,
        lastSyncedAt: null,
      },
    }),
  },
)


const { data: heatmap } = useFetch<{ days: HeatmapDay[] }>('/api/heatmap', {
  key: 'dashboard:heatmap',
  default: () => ({ days: [] }),
})

const { data: logsData, refresh: refreshLogs } = useFetch<{ logs: LogItem[] }>('/api/logs', {
  key: 'dashboard:logs',
  default: () => ({ logs: [] }),
})

const recentLogs = computed(() => logsData.value.logs.slice(0, 6))


async function refreshAll() {
  await Promise.all([
    refreshLogs(),
    refreshNuxtData('dashboard:stats'),
    refreshNuxtData('dashboard:heatmap'),
    refreshNuxtData('dashboard:integrations'),
  ])
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
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
      <NuxtLink to="/resume" class="block"><StatCard
        label="Resume"
        :value="resumeData?.resume?.filename ?? 'Not uploaded'"
        icon="i-lucide-file-text"
        :hint="resumeData?.resume ? `Updated ${new Date(resumeData.resume.updatedAt).toLocaleDateString()}` : 'Upload your resume'"
      /></NuxtLink>

<StatCard
  label="LeetCode solved"
  :value="integrationsData?.leetcode.stats?.solved.all ?? 0"
  icon="i-lucide-code-2"
  :hint="integrationsData?.leetcode.username
    ? `@${integrationsData.leetcode.username}`
    : 'Connect your profile'"
/>
<StatCard
  label="GitHub contributions"
  :value="integrationsData?.github.stats?.totalContributions ?? 0"
  icon="i-lucide-git-commit-horizontal"
  :hint="integrationsData?.github.connected
    ? `@${integrationsData.github.username}`
    : 'Connect your account'"
/>

    </section>

    <!-- Quick log + rail -->
    <section class="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div class="xl:col-span-2">
        <QuickLog @saved="refreshAll" />
      </div>
      <InfoRail :logs="logsData.logs" :timezone="settings.timezone" />
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
