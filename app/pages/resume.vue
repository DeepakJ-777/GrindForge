
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

useHead({ title: 'Resume | GRIND' })

interface ResumeProfile {
  summary: string
  skills: string[]
  education: {
    institution: string
    degree: string
    field: string
    startYear: string
    endYear: string
    details: string
  }[]
  projects: {
    name: string
    description: string
    technologies: string[]
    url: string | null
  }[]
  experience: {
    role: string
    organization: string
    startDate: string
    endDate: string
    description: string
  }[]
  certifications: {
    name: string
    issuer: string
    date: string
  }[]
}

interface SavedResume {
  id: string
  filename: string
  fileSize: number
  pageCount: number
  parsedText: string
  profile: ResumeProfile | null
  fileUrl?: string | null
  createdAt: string
  updatedAt: string
}
const savedResume = ref<SavedResume | null>(null)
const selectedFile = ref<File | null>(null)
const extractedText = ref('')
const pageCount = ref(0)
const loading = ref(false)
const parsing = ref(false)
const saving = ref(false)
const deleting = ref(false)
const confirmDelete = ref(false)
const analysing = ref(false)
const profile = ref<ResumeProfile | null>(null)
const error = ref('')
const message = ref('')

const MAX_FILE_SIZE = 5 * 1024 * 1024
const MAX_TEXT_LENGTH = 60000

const hasText = computed(() => extractedText.value.trim().length > 0)

function formatSize(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}


async function loadResume() {
  loading.value = true
  error.value = ''

  try {
    const result = await $fetch<{
      resume: (Omit<SavedResume, 'profile'> & {
        profile?: ResumeProfile | string | null
      }) | null
    }>('/api/resume')

    if (result.resume) {
      let loadedProfile: ResumeProfile | null = null

      try {
        if (typeof result.resume.profile === 'string') {
          loadedProfile = JSON.parse(result.resume.profile)
        } else if (result.resume.profile) {
          loadedProfile = result.resume.profile
        }
      } catch {
        loadedProfile = null
      }

      savedResume.value = {
        ...result.resume,
        profile: loadedProfile,
      }

      profile.value = loadedProfile
    } else {
      savedResume.value = null
      profile.value = null
    }
  } catch {
    error.value = 'Could not load your resume. Sign in and try again.'
  } finally {
    loading.value = false
  }
}


async function chooseFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  error.value = ''
  message.value = ''
  selectedFile.value = null
  extractedText.value = ''
  pageCount.value = 0

  if (!file) return

  if (!file.name.toLowerCase().endsWith('.pdf') || file.type && file.type !== 'application/pdf') {
    error.value = 'Choose a PDF file.'
    input.value = ''
    return
  }

  if (file.size < 1 || file.size > MAX_FILE_SIZE) {
    error.value = 'The PDF must be smaller than 5 MB.'
    input.value = ''
    return
  }

  selectedFile.value = file
  parsing.value = true

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString()

const pdf = await pdfjs.getDocument({
  data: await file.arrayBuffer(),
}).promise

    if (pdf.numPages > 50) {
      throw new Error('Use a PDF with 50 pages or fewer.')
    }

    pageCount.value = pdf.numPages
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const content = await page.getTextContent()
      const pageText = content.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
      pages.push(pageText)
    }

    extractedText.value = pages.join('\n\n').trim().slice(0, MAX_TEXT_LENGTH)

    if (!extractedText.value) {
      throw new Error('No selectable text found. This may be a scanned PDF.')
    }

    message.value = 'Text extracted. Review it below, then save your resume.'
  }
  catch (cause) {
    selectedFile.value = null
    extractedText.value = ''
    pageCount.value = 0
    error.value = cause instanceof Error
      ? cause.message
      : 'Could not read this PDF.'
  }
  finally {
    parsing.value = false
    input.value = ''
  }
}

async function saveResume() {
  if (!selectedFile.value || !hasText.value || !pageCount.value) return

  saving.value = true
  error.value = ''
  message.value = ''

  try {
    const form = new FormData()
    form.set('file', selectedFile.value)
    form.set('pageCount', String(pageCount.value))
    form.set('parsedText', extractedText.value.trim())
    const result = await $fetch<{ resume: SavedResume }>('/api/resume', {
      method: 'PUT',
      body: form,
    })

    savedResume.value = result.resume
    selectedFile.value = null
    message.value = 'Resume saved successfully.'
  }
  catch (cause: unknown) {
    const responseError = cause as {
      data?: { error?: unknown }
      statusMessage?: string
      message?: string
    }
    const serverMessage = responseError.data?.error
    error.value = typeof serverMessage === 'string'
      ? serverMessage
      : responseError.statusMessage || responseError.message || 'Could not save the resume. Check your connection and sign-in status.'
  }
  finally {
    saving.value = false
  }
}


async function analyseResume(refresh = false) {
  if (!savedResume.value || analysing.value) return

  analysing.value = true
  error.value = ''
  message.value = ''

  try {
    const result = await $fetch<{
      success: boolean
      cached: boolean
      profile: ResumeProfile
    }>(
      `/api/resume/analyse${refresh ? '?refresh=true' : ''}`,
      { method: 'POST' },
    )

    profile.value = result.profile
    savedResume.value.profile = result.profile

    message.value = result.cached
      ? 'Loaded your saved AI profile.'
      : refresh
        ? 'AI profile refreshed successfully!'
        : 'Resume analysed successfully!'
  } catch {
    error.value = 'Could not analyse your resume. Please try again.'
  } finally {
    analysing.value = false
  }
}

async function deleteResume() {
  if (!savedResume.value || deleting.value) return
  if (!confirmDelete.value) {
    confirmDelete.value = true
    return
  }

  deleting.value = true
  error.value = ''
  message.value = ''

  try {
    await $fetch('/api/resume', { method: 'DELETE' })
    savedResume.value = null
    profile.value = null  
    confirmDelete.value = false
    extractedText.value = ''
    selectedFile.value = null
    pageCount.value = 0
    message.value = 'Saved resume deleted.'
  }
  catch {
    error.value = 'Could not delete the resume.'
  }
  finally {
    deleting.value = false
  }
}

onMounted(loadResume)
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="gf-card p-6 sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-[18px] font-semibold text-ink">Resume manager</h2>
          <p class="mt-1 text-[13px] text-sub">
            Keep your experience ready for future AI interview practice.
          </p>
        </div>
        <UBadge color="neutral" variant="soft">
          {{ savedResume ? 'Resume saved' : 'No resume saved' }}
        </UBadge>
      </div>

      <div class="mt-6 rounded-xl border border-line bg-canvas/60 p-5">
        <label for="resume-pdf" class="block text-sm font-semibold text-ink">
          Select your resume (PDF)
        </label>
        <p class="mt-1 text-xs text-sub">
          Maximum 5 MB and 50 pages. Text is extracted locally in your browser.
        </p>
        <input
          id="resume-pdf"
          type="file"
          accept=".pdf,application/pdf"
          class="mt-4 block w-full text-sm text-ink file:mr-4 file:rounded-lg file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:font-medium file:text-primary-700"
          :disabled="parsing || saving"
          @change="chooseFile"
        />
        <p v-if="parsing" class="mt-3 text-sm text-sub">Extracting text from your PDF…</p>
      </div>

      <div v-if="savedResume" class="mt-5 rounded-xl border border-line p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="font-semibold text-ink">{{ savedResume.filename }}</p>
            <p class="mt-1 text-xs text-sub">
              {{ formatSize(savedResume.fileSize) }} · {{ savedResume.pageCount }} pages
            </p>
            <p class="mt-1 text-xs text-sub">
              Updated {{ formatDate(savedResume.updatedAt) }}
            </p>
          </div>
          <UButton
            v-if="savedResume.fileUrl"
            :to="savedResume.fileUrl"
            external
            target="_blank"
            icon="i-lucide-download"
            color="neutral"
            variant="soft"
          >
            Download PDF
          </UButton>
          <UButton
            v-if="!confirmDelete"
            color="error"
            variant="soft"
            :loading="deleting"
            :disabled="deleting"
            @click="deleteResume"
          >
            Delete
          </UButton>
          <div v-else class="flex items-center gap-2">
            <span class="text-xs text-sub">Delete this saved resume?</span>
            <UButton color="error" :loading="deleting" :disabled="deleting" @click="deleteResume">
              Confirm delete
            </UButton>
            <UButton color="neutral" variant="soft" :disabled="deleting" @click="confirmDelete = false">
              Cancel
            </UButton>
          </div>
        </div>
        
<div class="mt-4">
  <UButton
    :loading="analysing"
    :disabled="analysing || deleting"
    @click="analyseResume(!!profile)"
  >
    {{ profile ? 'Refresh AI Profile' : 'Analyse Resume with AI' }}
  </UButton>
  <p class="mt-2 text-xs text-sub">
    Extract skills, education, projects and experience from your saved resume.
  </p>
</div>

        <details class="mt-4">
          <summary class="cursor-pointer text-sm font-medium text-primary-600">
            View saved extracted text
          </summary>
          <pre class="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-canvas p-3 text-xs text-ink">{{ savedResume.parsedText }}</pre>
        </details>
      </div>

      <div v-if="hasText && selectedFile" class="mt-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="font-semibold text-ink">Extracted text preview</h3>
            <p class="mt-1 text-xs text-sub">
              {{ extractedText.length.toLocaleString() }} characters · {{ pageCount }} pages
            </p>
          </div>
          <UButton :loading="saving" :disabled="saving || parsing" @click="saveResume">
            {{ savedResume ? 'Replace saved resume' : 'Save resume' }}
          </UButton>
        </div>
        <pre class="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-canvas/60 p-4 text-xs leading-relaxed text-ink">{{ extractedText }}</pre>
      </div>

      <p v-if="message" role="status" class="mt-4 text-sm text-green-700">
        {{ message }}
      </p>
      <p v-if="error" role="alert" class="mt-4 text-sm text-red-600">
        {{ error }}
      </p>
      
<section v-if="profile" class="mt-5 rounded-xl border border-line p-5">
  <h3 class="text-lg font-semibold text-ink">Your AI Resume Profile</h3>

  <div v-if="profile.summary" class="mt-4">
    <h4 class="font-semibold text-ink">Professional Summary</h4>
    <p class="mt-2 text-sm leading-relaxed text-sub">{{ profile.summary }}</p>
  </div>

  <div v-if="profile.skills.length" class="mt-5">
    <h4 class="font-semibold text-ink">Skills</h4>
    <div class="mt-2 flex flex-wrap gap-2">
      <UBadge
        v-for="(skill, index) in profile.skills"
        :key="`${skill}-${index}`"
        color="neutral"
        variant="soft"
      >
        {{ skill }}
      </UBadge>
    </div>
  </div>

  <div v-if="profile.education.length" class="mt-5">
    <h4 class="font-semibold text-ink">Education</h4>
    <div
      v-for="(item, index) in profile.education"
      :key="index"
      class="mt-3 rounded-lg bg-canvas/60 p-3"
    >
      <p class="font-medium text-ink">{{ item.degree }} {{ item.field ? `— ${item.field}` : '' }}</p>
      <p class="mt-1 text-sm text-sub">{{ item.institution }}</p>
      <p class="mt-1 text-xs text-sub">{{ item.startYear }}{{ item.endYear ? ` – ${item.endYear}` : '' }}</p>
      <p v-if="item.details" class="mt-2 text-sm text-sub">{{ item.details }}</p>
    </div>
  </div>

  <div v-if="profile.projects.length" class="mt-5">
    <h4 class="font-semibold text-ink">Projects</h4>
    <div
      v-for="(item, index) in profile.projects"
      :key="index"
      class="mt-3 rounded-lg bg-canvas/60 p-3"
    >
      <p class="font-medium text-ink">{{ item.name }}</p>
      <p class="mt-2 text-sm text-sub">{{ item.description }}</p>
      <div v-if="item.technologies.length" class="mt-2 flex flex-wrap gap-2">
        <UBadge
          v-for="(technology, techIndex) in item.technologies"
          :key="`${technology}-${techIndex}`"
          color="neutral"
          variant="soft"
        >
          {{ technology }}
        </UBadge>
      </div>
      <a
        v-if="item.url"
        :href="item.url"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-block text-sm text-primary-600"
      >
        View project
      </a>
    </div>
  </div>

  <div v-if="profile.experience.length" class="mt-5">
    <h4 class="font-semibold text-ink">Experience</h4>
    <div
      v-for="(item, index) in profile.experience"
      :key="index"
      class="mt-3 rounded-lg bg-canvas/60 p-3"
    >
      <p class="font-medium text-ink">{{ item.role }}</p>
      <p class="mt-1 text-sm text-sub">{{ item.organization }}</p>
      <p class="mt-1 text-xs text-sub">{{ item.startDate }}{{ item.endDate ? ` – ${item.endDate}` : '' }}</p>
      <p class="mt-2 text-sm text-sub">{{ item.description }}</p>
    </div>
  </div>

  <div v-if="profile.certifications.length" class="mt-5">
    <h4 class="font-semibold text-ink">Certifications</h4>
    <div
      v-for="(item, index) in profile.certifications"
      :key="index"
      class="mt-3 rounded-lg bg-canvas/60 p-3"
    >
      <p class="font-medium text-ink">{{ item.name }}</p>
      <p class="mt-1 text-sm text-sub">{{ item.issuer }}</p>
      <p class="mt-1 text-xs text-sub">{{ item.date }}</p>
    </div>
  </div>
</section>

    </section>

    <section class="gf-card p-5">
      <h3 class="text-sm font-semibold text-ink">Privacy and storage</h3>
      <p class="mt-1 text-sm leading-relaxed text-sub">
        Your original PDF is stored privately in the configured R2 bucket. Extracted text and file details stay in your account for analysis and interview practice.
      </p>
    </section>
  </div>
</template>
