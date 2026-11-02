<script setup lang="ts">
import { shallowRef } from 'vue'

const emit = defineEmits<{ saved: [] }>()
const settings = useSettings()

const PRESET_TAGS = ['DSA', 'Development', 'ML', 'CS Fundamentals', 'Projects', 'Interview Prep']

const note = shallowRef('')
const selectedTags = shallowRef<string[]>([])
const saving = shallowRef(false)
const justSaved = shallowRef(false)

function toggleTag(tag: string) {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(t => t !== tag)
    : [...selectedTags.value, tag]
}

async function save() {
  const trimmed = note.value.trim()
  if (!trimmed || saving.value) return

  saving.value = true
  try {
    await $fetch('/api/logs', {
      method: 'POST',
      body: {
        logDate: todayString(settings.value.timezone),
        note: trimmed,
        tags: selectedTags.value,
      },
    })
    note.value = ''
    selectedTags.value = []
    emit('saved')
    justSaved.value = true
    setTimeout(() => (justSaved.value = false), 2000)
  }
  catch (err) {
    console.error('Failed to save log', err)
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="gf-card p-5 sm:p-6">
    <div class="flex items-center gap-2.5">
      <span class="flex size-8 items-center justify-center rounded-[9px] bg-lav">
        <UIcon name="i-lucide-zap" class="size-4 text-primary-600" />
      </span>
      <div>
        <h2 class="text-[15px] font-semibold text-ink">Quick log</h2>
        <p class="text-[12.5px] text-sub">How did you prepare today?</p>
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-3">
      <UTextarea
        v-model="note"
        :rows="3"
        maxlength="2000"
        placeholder="Write a quick note — problems solved, concepts revised, projects pushed…"
        class="w-full"
      />

      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="tag in PRESET_TAGS"
          :key="tag"
          type="button"
          class="rounded-full border px-3 py-1 text-[12px] font-medium transition-colors"
          :class="selectedTags.includes(tag)
            ? 'border-primary-200 bg-primary-50 text-primary-700'
            : 'border-line bg-surface text-sub hover:border-primary-200 hover:text-ink'"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          :loading="saving"
          :disabled="!note.trim()"
          icon="i-lucide-check"
          size="md"
          @click="save"
        >
          Save today's log
        </UButton>
        <Transition name="fade">
          <span v-if="justSaved" class="flex items-center gap-1 text-[12.5px] font-medium text-emerald-600">
            <UIcon name="i-lucide-check-circle-2" class="size-4" />
            Logged
          </span>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
