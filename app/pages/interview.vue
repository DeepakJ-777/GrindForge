<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const TYPES = [
  { id: 'technical', label: 'Technical', icon: 'i-lucide-binary' },
  { id: 'hr', label: 'HR', icon: 'i-lucide-users' },
  { id: 'project', label: 'Project Deep Dive', icon: 'i-lucide-folder-git-2' },
  { id: 'full', label: 'Full Interview', icon: 'i-lucide-layers' },
] as const
const durations = [15, 30, 45]
const config = reactive({ type: 'technical', duration: 30, jobDescription: '' })
const resume = ref<{ filename: string } | null>(null)
const sessions = ref<any[]>([])
const active = ref<{ id: string; question: string; questionNumber: number; totalQuestions: number } | null>(null)
const answer = ref('')
const feedback = ref('')
const report = ref<{ score: number; summary: string; strengths: string[]; improvements: string[] } | null>(null)
const busy = ref(false)
const error = ref('')
const completed = computed(() => !active.value && !!report.value)
const voice = useGeminiLive()
const voiceStatus = voice.status
const voiceTranscript = voice.transcript
const voiceInterimText = voice.interimText
const voiceError = voice.error
const voiceMuted = voice.muted
const voiceReport = voice.report
const voiceActive = computed(() => voiceStatus.value !== 'idle')

function mergeTranscript(turns: Array<{ speaker: string; text: string }> = []) {
  return turns.reduce<Array<{ speaker: string; text: string }>>((merged, turn) => {
    const text = turn.text?.trim()
    if (!text) return merged
    const previous = merged.at(-1)
    if (previous?.speaker === turn.speaker) {
      if (previous.text === text || previous.text.endsWith(text)) return merged
      if (text.startsWith(previous.text)) previous.text = text
      else previous.text += `${/\s$/.test(previous.text) || /^[,.;:!?]/.test(text) ? '' : ' '}${text}`
    } else merged.push({ speaker: turn.speaker, text })
    return merged
  }, [])
}

async function load() {
  try {
    const [resumeResult, historyResult] = await Promise.all([
      $fetch<{ resume: { filename: string } | null }>('/api/resume'),
      $fetch<{ sessions: any[] }>('/api/interviews'),
    ])
    resume.value = resumeResult.resume
    sessions.value = historyResult.sessions
  } catch (cause: any) {
    error.value = cause?.data?.error ?? 'Could not load interview data. Sign in and try again.'
  }
}

async function start() {
  busy.value = true
  error.value = ''
  report.value = null
  feedback.value = ''
  try {
    const result = await $fetch<{ session: NonNullable<typeof active.value> }>('/api/interviews', {
      method: 'POST', body: config,
    })
    active.value = result.session
    answer.value = ''
    await load()
  } catch (cause: any) {
    error.value = cause?.data?.error ?? 'Could not start the interview.'
  } finally {
    busy.value = false
  }
}

async function submitAnswer() {
  if (!active.value || !answer.value.trim()) return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{
      feedback: string
      completed: boolean
      nextQuestion: string | null
      questionNumber: number
      totalQuestions: number
      report: typeof report.value
    }>(`/api/interviews/${active.value.id}/answer`, { method: 'POST', body: { answer: answer.value } })
    feedback.value = result.feedback
    answer.value = ''
    if (result.completed) {
      active.value = null
      report.value = result.report
      await load()
    } else if (result.nextQuestion) {
      active.value = { ...active.value, question: result.nextQuestion, questionNumber: result.questionNumber, totalQuestions: result.totalQuestions }
    }
  } catch (cause: any) {
    error.value = cause?.data?.error ?? 'Could not submit your answer.'
  } finally {
    busy.value = false
  }
}

async function startVoice() {
  error.value = ''
  await voice.start({ type: config.type, jobDescription: config.jobDescription })
  await load()
}

async function finishVoice() {
  await voice.finish()
  await load()
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

onMounted(load)
onBeforeUnmount(() => {
  if (voiceStatus.value !== 'idle') void voice.finish()
})
useHead({ title: 'AI Interview' })
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="gf-card flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
      <div class="max-w-lg">
        <h2 class="text-[18px] font-semibold text-ink">AI Interview</h2>
        <p class="mt-1 text-[13.5px] leading-relaxed text-sub">Practice a text or live voice interview tailored to your saved resume.</p>
      </div>
      <UBadge :color="resume ? 'success' : 'neutral'" variant="soft">{{ resume?.filename ?? 'Save a resume first' }}</UBadge>
    </section>

    <section v-if="!active && !voiceActive" class="gf-card p-5 sm:p-6">
      <h3 class="text-[15px] font-semibold text-ink">Set up a session</h3>
      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p class="text-[13px] font-semibold text-sub">Interview type</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button v-for="type in TYPES" :key="type.id" type="button" class="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs" :class="config.type === type.id ? 'border-primary-300 bg-primary-50 text-primary-400' : 'border-line text-sub'" @click="config.type = type.id">
              <UIcon :name="type.icon" class="size-4" />{{ type.label }}
            </button>
          </div>
        </div>
        <div>
          <p class="text-[13px] font-semibold text-sub">Duration</p>
          <div class="mt-2 flex gap-2">
            <button v-for="duration in durations" :key="duration" type="button" class="flex-1 rounded-lg border px-3 py-2 text-xs" :class="config.duration === duration ? 'border-primary-300 bg-primary-50 text-primary-400' : 'border-line text-sub'" @click="config.duration = duration">{{ duration }} min</button>
          </div>
        </div>
        <label class="text-[13px] font-semibold text-sub">Optional job description
          <textarea v-model="config.jobDescription" maxlength="6000" rows="3" class="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" placeholder="Paste a role description to tailor questions…" />
        </label>
      </div>
      <p class="mt-3 text-xs text-sub">Your resume and optional job description are sent to the AI provider you choose for the session. Voice calls use Gemini 3.8 Live and require microphone access.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton icon="i-lucide-play" :loading="busy" :disabled="busy || !resume" @click="start">Start text interview</UButton>
        <UButton icon="i-lucide-mic" color="neutral" variant="soft" :disabled="busy || !resume || voiceStatus !== 'idle'" @click="startVoice">Start voice interview</UButton>
      </div>
    </section>

    <section v-if="voiceActive" class="gf-card p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold text-ink">Live voice interview</h3>
          <p class="mt-1 text-sm text-sub">Gemini 3.8 Live · Audio stays in this live session; a transcript is saved when you end the call.</p>
        </div>
        <UBadge :color="voiceStatus === 'connected' ? 'success' : 'neutral'" variant="soft">
          {{ voiceStatus === 'connected' ? 'Connected' : voiceStatus === 'ending' ? 'Saving transcript' : 'Connecting…' }}
        </UBadge>
      </div>
      <div class="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-xl border border-line bg-canvas/60 p-4" aria-live="polite">
        <p v-if="!voiceTranscript.length && !voiceInterimText" class="text-sm text-sub">The interviewer will begin shortly. Speak naturally and pause when you finish an answer.</p>
        <article v-for="(turn, index) in voiceTranscript" :key="`${index}-${turn.speaker}`" class="text-sm">
          <p class="font-semibold text-ink">{{ turn.speaker }}</p>
          <p class="mt-1 whitespace-pre-wrap leading-relaxed text-sub">{{ turn.text }}</p>
        </article>
        <p v-if="voiceInterimText" class="text-sm italic text-sub">Hearing: {{ voiceInterimText }}</p>
      </div>
      <p v-if="voiceError" role="alert" class="mt-3 text-sm text-red-600">{{ voiceError }}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <UButton color="neutral" variant="soft" :disabled="voiceStatus !== 'connected'" :icon="voiceMuted ? 'i-lucide-mic-off' : 'i-lucide-mic'" @click="voice.toggleMute()">
          {{ voiceMuted ? 'Unmute microphone' : 'Mute microphone' }}
        </UButton>
        <UButton color="error" icon="i-lucide-phone-off" :loading="voiceStatus === 'ending'" :disabled="voiceStatus === 'ending'" @click="finishVoice">End interview</UButton>
      </div>
    </section>

    <section v-if="active" class="gf-card p-5 sm:p-6">
      <div class="flex items-center justify-between gap-3">
        <p class="text-xs font-semibold tracking-wide text-sub uppercase">Question {{ active.questionNumber }} of {{ active.totalQuestions }}</p>
        <UProgress :model-value="Math.round((active.questionNumber - 1) / active.totalQuestions * 100)" class="w-36" />
      </div>
      <h3 class="mt-4 text-lg font-semibold leading-relaxed text-ink">{{ active.question }}</h3>
      <label class="mt-5 block text-sm font-medium text-ink">Your answer
        <textarea v-model="answer" maxlength="6000" rows="6" class="mt-2 block w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink" placeholder="Structure your answer clearly. You can include examples…" />
      </label>
      <p v-if="feedback" class="mt-4 rounded-lg bg-lav p-4 text-sm leading-relaxed text-ink"><strong>Feedback:</strong> {{ feedback }}</p>
      <UButton class="mt-4" :loading="busy" :disabled="busy || !answer.trim()" icon="i-lucide-send" @click="submitAnswer">Submit answer</UButton>
    </section>

    <section v-if="report" class="gf-card p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><h3 class="text-lg font-semibold text-ink">Interview report</h3><UBadge color="primary" variant="soft">Score {{ report.score }}/100</UBadge></div>
      <p class="mt-3 text-sm leading-relaxed text-sub">{{ report.summary }}</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div><h4 class="font-semibold text-ink">Strengths</h4><ul class="mt-2 list-disc pl-5 text-sm text-sub"><li v-for="item in report.strengths" :key="item">{{ item }}</li></ul></div>
        <div><h4 class="font-semibold text-ink">Areas to improve</h4><ul class="mt-2 list-disc pl-5 text-sm text-sub"><li v-for="item in report.improvements" :key="item">{{ item }}</li></ul></div>
      </div>
      <UButton class="mt-5" color="neutral" variant="soft" @click="report = null">New interview</UButton>
    </section>

    <section v-if="voiceReport" class="gf-card p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><h3 class="text-lg font-semibold text-ink">Voice interview report</h3><UBadge color="primary" variant="soft">Score {{ voiceReport.score }}/100</UBadge></div>
      <p class="mt-3 text-sm leading-relaxed text-sub">{{ voiceReport.summary }}</p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <div><h4 class="font-semibold text-ink">Strengths</h4><ul class="mt-2 list-disc pl-5 text-sm text-sub"><li v-for="item in voiceReport.strengths" :key="item">{{ item }}</li></ul></div>
        <div><h4 class="font-semibold text-ink">Areas to improve</h4><ul class="mt-2 list-disc pl-5 text-sm text-sub"><li v-for="item in voiceReport.improvements" :key="item">{{ item }}</li></ul></div>
      </div>
      <UButton class="mt-5" color="neutral" variant="soft" @click="voice.resetReport()">New interview</UButton>
    </section>

    <section v-if="!voiceActive && voiceTranscript.length && !voiceReport" class="gf-card p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-lg font-semibold text-ink">Voice interview transcript</h3>
        <UButton color="neutral" variant="soft" @click="voice.resetReport()">New interview</UButton>
      </div>
      <article v-for="(turn, index) in voiceTranscript" :key="`last-${index}-${turn.speaker}`" class="mt-4 text-sm">
        <p class="font-semibold text-ink">{{ turn.speaker }}</p>
        <p class="mt-1 whitespace-pre-wrap leading-relaxed text-sub">{{ turn.text }}</p>
      </article>
    </section>

    <p v-if="error" role="alert" class="text-sm text-red-600">{{ error }}</p>

    <section class="gf-card overflow-hidden">
      <div class="flex items-center gap-2.5 px-5 py-4"><UIcon name="i-lucide-history" class="size-4 text-primary-600" /><h3 class="text-[15px] font-semibold text-ink">Interview history</h3></div>
      <p v-if="!sessions.length" class="px-5 pb-8 text-center text-[13px] text-sub">No interviews yet. Completed sessions and reports will appear here.</p>
      <div v-else class="divide-y divide-line/60">
        <article v-for="session in sessions" :key="session.id" class="px-5 py-3 text-sm">
          <div class="flex flex-wrap items-center gap-3">
            <span class="flex-1 text-ink">{{ formatDate(session.startedAt) }} · {{ session.type.replace('voice_', 'Voice · ') }} · {{ session.duration }} min</span>
            <UBadge :color="session.status === 'completed' ? 'success' : 'neutral'" variant="soft">{{ session.status }}</UBadge>
            <span v-if="session.report" class="text-sub">Score {{ session.report.score }}/100</span>
          </div>
          <details v-if="session.transcript?.length" class="mt-2">
            <summary class="cursor-pointer text-xs font-medium text-primary-600">View voice transcript</summary>
            <div class="mt-2 space-y-3 rounded-lg bg-canvas/60 p-3">
              <div v-for="(turn, index) in mergeTranscript(session.transcript)" :key="`${session.id}-${index}`">
                <p class="font-semibold text-ink">{{ turn.speaker }}</p>
                <p class="mt-1 whitespace-pre-wrap text-sub">{{ turn.text }}</p>
              </div>
            </div>
          </details>
        </article>
      </div>
    </section>
  </div>
</template>
