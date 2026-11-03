import { ref, shallowRef } from 'vue'

export interface VoiceTranscriptTurn {
  speaker: 'Interviewer' | 'Candidate'
  text: string
}

interface VoiceReport {
  score: number
  summary: string
  strengths: string[]
  improvements: string[]
}

interface LiveSessionHandle {
  sendRealtimeInput(input: { audio?: { data: string; mimeType: string }; text?: string }): void
  close(): void
}

const LIVE_MODEL = 'gemini-3.8-live'
const INPUT_RATE = 16_000
const MAX_SESSION_MS = 15 * 60 * 1000

export function useGeminiLive() {
  const status = ref<'idle' | 'connecting' | 'connected' | 'ending'>('idle')
  const sessionId = ref('')
  const transcript = ref<VoiceTranscriptTurn[]>([])
  const interimText = ref('')
  const error = ref('')
  const muted = ref(false)
  const report = ref<VoiceReport | null>(null)
  // Side-branch analysers for the voice orb visualiser. They receive the same
  // audio as the engine but are never connected onward, so playback and
  // capture are untouched.
  const micAnalyser = shallowRef<AnalyserNode | null>(null)
  const outputAnalyser = shallowRef<AnalyserNode | null>(null)

  let session: LiveSessionHandle | null = null
  let mediaStream: MediaStream | null = null
  let audioContext: AudioContext | null = null
  let audioSource: MediaStreamAudioSourceNode | null = null
  let processor: ScriptProcessorNode | null = null
  let silenceGain: GainNode | null = null
  let nextPlaybackTime = 0
  let ending = false
  let endTimer: ReturnType<typeof setTimeout> | undefined

  function addTranscript(speaker: VoiceTranscriptTurn['speaker'], rawText: string) {
    const text = rawText.trim()
    if (!text) return
    const previous = transcript.value.at(-1)
    if (previous?.speaker === speaker) {
      // Gemini streams transcription in small chunks. Keep chunks from the same
      // speaker together so the transcript reads as a sentence instead of a
      // stack of two or three word fragments.
      if (previous.text === text || previous.text.endsWith(text)) return
      if (text.startsWith(previous.text)) {
        previous.text = text
        return
      }
      const needsSpace = !/\s$/.test(previous.text) && !/^[,.;:!?]/.test(text)
      previous.text += `${needsSpace ? ' ' : ''}${text}`
      return
    }
    transcript.value.push({ speaker, text })
  }

  function decodePcm(data: string, mimeType = 'audio/pcm;rate=24000') {
    if (!audioContext) return
    const rate = Number(mimeType.match(/rate=(\d+)/)?.[1] ?? 24_000)
    const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0))
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    const frames = Math.floor(bytes.byteLength / 2)
    if (!frames) return
    const buffer = audioContext.createBuffer(1, frames, rate)
    const channel = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) channel[i] = view.getInt16(i * 2, true) / 32768
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    if (outputAnalyser.value) source.connect(outputAnalyser.value)
    const startAt = Math.max(audioContext.currentTime, nextPlaybackTime)
    source.start(startAt)
    nextPlaybackTime = startAt + buffer.duration
  }

  function handleMessage(message: any) {
    const content = message?.serverContent
    const input = content?.inputTranscription?.text
    const interim = content?.interimInputTranscription?.text
    const output = content?.outputTranscription?.text
    if (typeof input === 'string' && input.trim()) {
      addTranscript('Candidate', input)
      interimText.value = ''
    } else if (typeof interim === 'string') {
      interimText.value = interim
    }
    if (typeof output === 'string' && output.trim()) addTranscript('Interviewer', output)
    for (const part of content?.modelTurn?.parts ?? []) {
      const inline = part?.inlineData
      if (typeof inline?.data === 'string') decodePcm(inline.data, inline.mimeType)
    }
    if (content?.interrupted && audioContext) nextPlaybackTime = audioContext.currentTime
    if (message?.error?.message) error.value = String(message.error.message)
  }

  function pcmToBase64(input: Float32Array, inputRate: number) {
    const step = inputRate / INPUT_RATE
    const frames = Math.floor(input.length / step)
    const buffer = new ArrayBuffer(frames * 2)
    const view = new DataView(buffer)
    for (let i = 0; i < frames; i++) {
      const start = Math.floor(i * step)
      const end = Math.min(input.length, Math.floor((i + 1) * step))
      let sum = 0
      for (let j = start; j < end; j++) sum += input[j] ?? 0
      const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)))
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    }
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 0x8000, bytes.length)))
    }
    return btoa(binary)
  }

  function startMicrophone() {
    if (!mediaStream || !audioContext || !session) return
    audioSource = audioContext.createMediaStreamSource(mediaStream)
    micAnalyser.value = audioContext.createAnalyser()
    audioSource.connect(micAnalyser.value)
    processor = audioContext.createScriptProcessor(4096, 1, 1)
    silenceGain = audioContext.createGain()
    silenceGain.gain.value = 0
    processor.onaudioprocess = (event) => {
      if (muted.value || !session || status.value !== 'connected') return
      const data = pcmToBase64(event.inputBuffer.getChannelData(0), audioContext?.sampleRate ?? 48_000)
      if (data) session.sendRealtimeInput({ audio: { data, mimeType: `audio/pcm;rate=${INPUT_RATE}` } })
    }
    audioSource.connect(processor)
    processor.connect(silenceGain)
    silenceGain.connect(audioContext.destination)
  }

  function releaseAudio() {
    if (endTimer) clearTimeout(endTimer)
    endTimer = undefined
    if (processor) processor.onaudioprocess = null
    processor?.disconnect()
    audioSource?.disconnect()
    silenceGain?.disconnect()
    micAnalyser.value?.disconnect()
    outputAnalyser.value?.disconnect()
    micAnalyser.value = null
    outputAnalyser.value = null
    mediaStream?.getTracks().forEach(track => track.stop())
    if (audioContext && audioContext.state !== 'closed') void audioContext.close()
    processor = null
    audioSource = null
    silenceGain = null
    mediaStream = null
    audioContext = null
  }

  async function start(options: { type: string; jobDescription: string }) {
    if (status.value !== 'idle') return
    status.value = 'connecting'
    error.value = ''
    report.value = null
    transcript.value = []
    interimText.value = ''
    ending = false

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is not available in this browser.')
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      audioContext = new AudioContext()
      await audioContext.resume()
      outputAnalyser.value = audioContext.createAnalyser()

      const provisioned = await $fetch<{ sessionId: string; token: string; model: string; systemInstruction: string }>('/api/interviews/live', {
        method: 'POST',
        body: { type: options.type, jobDescription: options.jobDescription },
      })
      sessionId.value = provisioned.sessionId
      const { GoogleGenAI, Modality } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: provisioned.token })
      session = await ai.live.connect({
        model: provisioned.model || LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: { parts: [{ text: provisioned.systemInstruction }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: handleMessage,
          onerror: (event) => { error.value = event.message || 'The Gemini Live connection failed.' },
        },
      })
      status.value = 'connected'
      startMicrophone()
      session.sendRealtimeInput({ text: 'Begin the interview now with a short spoken introduction and your first question.' })
      endTimer = setTimeout(() => { void finish() }, MAX_SESSION_MS)
    } catch (cause: any) {
      error.value = cause?.data?.error ?? cause?.message ?? 'Could not start the voice interview.'
      session?.close()
      session = null
      releaseAudio()
      status.value = 'idle'
    }
  }

  async function finish() {
    if (ending || !sessionId.value) return
    ending = true
    status.value = 'ending'
    const finishedId = sessionId.value
    sessionId.value = ''
    session?.close()
    session = null
    releaseAudio()
    try {
      const result = await $fetch<{ report: VoiceReport | null }>(`/api/interviews/${finishedId}/finish`, {
        method: 'POST',
        body: { transcript: transcript.value },
      })
      report.value = result.report
    } catch (cause: any) {
      error.value = cause?.data?.error ?? 'The call ended, but its transcript could not be saved.'
    } finally {
      status.value = 'idle'
      ending = false
    }
  }

  function toggleMute() {
    muted.value = !muted.value
    if (mediaStream) mediaStream.getAudioTracks().forEach(track => { track.enabled = !muted.value })
  }

  function resetReport() {
    report.value = null
    transcript.value = []
    interimText.value = ''
    error.value = ''
  }

  return { status, transcript, interimText, error, muted, report, micAnalyser, outputAnalyser, start, finish, toggleMute, resetReport }
}
