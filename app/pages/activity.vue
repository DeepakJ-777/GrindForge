<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'

const { data: logsData, refresh: refreshLogs } = useFetch<{ logs: LogItem[] }>('/api/logs', {
  key: 'activity:logs',
  default: () => ({ logs: [] }),
})

const { data: statsData } = useFetch<Stats | null>('/api/stats', {
  key: 'activity:stats',
  default: () => null,
})

const route = useRoute()
const router = useRouter()

const search = computed({
  get: () => (route.query.q as string) ?? '',
  set: (v: string) => router.replace({ query: { ...route.query, q: v || undefined } }),
})

const activeTag = shallowRef<string | null>(null)
const activeMonth = shallowRef('')

const availableTags = computed(() =>
  [...new Set(logsData.value.logs.flatMap(l => l.tags))].sort(),
)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const month = activeMonth.value // YYYY-MM
  return logsData.value.logs.filter((log) => {
    if (activeTag.value && !log.tags.includes(activeTag.value)) return false
    if (month && !log.logDate.startsWith(month)) return false
    if (q && !log.note.toLowerCase().includes(q) && !log.tags.some(t => t.toLowerCase().includes(q))) return false
    return true
  })
})

/* ------------------------------ inline editing ----------------------------- */

const editingId = shallowRef<string | null>(null)
const editForm = reactive({ logDate: '', note: '', tags: '' })
const savingEdit = shallowRef(false)

function startEdit(log: LogItem) {
  editingId.value = log.id
  editForm.logDate = log.logDate
  editForm.note = log.note
  editForm.tags = log.tags.join(', ')
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: string) {
  if (savingEdit.value) return
  savingEdit.value = true
  try {
    await $fetch(`/api/logs/${id}`, {
      method: 'PUT',
      body: {
        logDate: editForm.logDate,
        note: editForm.note,
        tags: editForm.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      },
    })
    editingId.value = null
    await refreshLogs()
    void refreshNuxtData('dashboard:stats')
    void refreshNuxtData('dashboard:heatmap')
    void refreshNuxtData('activity:stats')
  }
  catch (err) {
    console.error('Failed to update log', err)
  }
  finally {
    savingEdit.value = false
  }
}

const confirmId = shallowRef<string | null>(null)

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
    await refreshLogs()
    void refreshNuxtData('dashboard:stats')
    void refreshNuxtData('dashboard:heatmap')
    void refreshNuxtData('activity:stats')
  }
  catch (err) {
    console.error('Failed to delete log', err)
  }
}

function clearFilters() {
  activeTag.value = null
  activeMonth.value = ''
  search.value = ''
}

const hasFilters = computed(() => !!search.value || !!activeTag.value || !!activeMonth.value)

useHead({ title: 'Activity' })
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Filters -->
    <section class="gf-card flex flex-wrap items-center gap-3 p-4 sm:p-5">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search notes and tags…"
        size="sm"
        class="w-full sm:w-64"
      />

      <input
        v-model="activeMonth"
        type="month"
        class="h-8 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink"
        aria-label="Filter by month"
      >

      <div class="flex flex-wrap items-center gap-1.5">
        <button
          v-for="tag in availableTags.slice(0, 10)"
          :key="tag"
          type="button"
          class="rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
          :class="activeTag === tag
            ? 'border-primary-200 bg-primary-50 text-primary-400'
            : 'border-line text-sub hover:border-primary-200 hover:text-ink'"
          @click="activeTag = activeTag === tag ? null : tag"
        >
          {{ tag }}
        </button>
        <UButton
          v-if="hasFilters"
          label="Clear"
          color="neutral"
          variant="ghost"
          size="xs"
          icon="i-lucide-x"
          @click="clearFilters"
        />
      </div>

      <span class="ml-auto text-[12px] text-sub">{{ filtered.length }} entries</span>
    </section>

    <!-- List -->
    <section class="gf-card overflow-hidden">
      <p v-if="!filtered.length" class="py-14 text-center text-[13px] text-sub">
        {{ logsData.logs.length ? 'No entries match these filters.' : 'No activity yet — add your first log from the Dashboard.' }}
      </p>

      <ul v-else class="divide-y divide-line/60">
        <li v-for="log in filtered" :key="log.id" class="px-4 sm:px-5">
          <!-- View row -->
          <div v-if="editingId !== log.id" class="flex items-start gap-3 py-3.5">
            <span class="mt-0.5 w-20 shrink-0 text-[11.5px] font-medium tracking-wide text-sub uppercase">
              {{ relativeDay(log.logDate) }}
            </span>
            <p class="min-w-0 flex-1 text-[13.5px] leading-snug text-ink">{{ log.note }}</p>
            <div class="hidden flex-wrap justify-end gap-1 sm:flex sm:max-w-[220px]">
              <span
                v-for="tag in log.tags"
                :key="tag"
                class="rounded-full bg-lav px-2 py-0.5 text-[11px] font-medium text-primary-400"
              >
                {{ tag }}
              </span>
            </div>
            <div class="flex shrink-0 items-center gap-0.5">
              <UTooltip text="Edit">
                <UButton
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  aria-label="Edit log"
                  @click="startEdit(log)"
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

          <!-- Edit row -->
          <div v-else class="flex flex-col gap-2.5 py-4">
            <div class="flex flex-wrap gap-2.5">
              <input
                v-model="editForm.logDate"
                type="date"
                class="h-9 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink"
                aria-label="Date"
              >
              <input
                v-model="editForm.tags"
                type="text"
                placeholder="Tags, comma separated"
                class="h-9 flex-1 rounded-lg border border-line bg-surface px-2.5 text-[13px] text-ink"
                aria-label="Tags"
              >
            </div>
            <UTextarea v-model="editForm.note" :rows="3" maxlength="2000" class="w-full" />
            <div class="flex gap-2">
              <UButton
                label="Save"
                size="sm"
                :loading="savingEdit"
                :disabled="!editForm.note.trim() || !editForm.logDate"
                @click="saveEdit(log.id)"
              />
              <UButton
                label="Cancel"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="cancelEdit"
              />
            </div>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
