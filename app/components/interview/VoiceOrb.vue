<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Audio-reactive orb for the live voice interview.
 *
 * Reads levels from the side-branch AnalyserNodes owned by useGeminiLive
 * (mic + AI output). The component never creates an AudioContext, never
 * requests microphone access, and never connects nodes onward — the voice
 * engine's graph and lifecycle stay fully in charge. Cleanup here is limited
 * to cancelling the animation frame; the nodes themselves are disconnected by
 * the engine's releaseAudio().
 */
const props = withDefaults(defineProps<{
  status?: 'idle' | 'connecting' | 'connected' | 'ending'
  muted?: boolean
  micAnalyser?: AnalyserNode | null
  outputAnalyser?: AnalyserNode | null
}>(), {
  status: 'idle',
  muted: false,
  micAnalyser: null,
  outputAnalyser: null,
})

const prefersReducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const level = ref(0)

let raf = 0
let smooth = 0
let micBuffer: Uint8Array<ArrayBuffer> | null = null
let outBuffer: Uint8Array<ArrayBuffer> | null = null

function readRms(analyser: AnalyserNode, buffer: Uint8Array<ArrayBuffer>): number {
  analyser.getByteTimeDomainData(buffer)
  let sum = 0
  for (let i = 0; i < buffer.length; i++) {
    const v = ((buffer[i] ?? 128) - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / buffer.length)
}

function frame() {
  let target = 0

  if (props.micAnalyser && !props.muted) {
    if (!micBuffer || micBuffer.length !== props.micAnalyser.fftSize) {
      micBuffer = new Uint8Array(props.micAnalyser.fftSize)
    }
    target = Math.max(target, readRms(props.micAnalyser, micBuffer))
  }

  // AI output still plays while muted, so the orb keeps reacting to it.
  if (props.outputAnalyser) {
    if (!outBuffer || outBuffer.length !== props.outputAnalyser.fftSize) {
      outBuffer = new Uint8Array(props.outputAnalyser.fftSize)
    }
    target = Math.max(target, readRms(props.outputAnalyser, outBuffer))
  }

  // Speech RMS is small; lift it into a usable visual range, then smooth with
  // a fast attack and slow release so the orb swells quickly and settles.
  target = Math.min(1, target * 5)
  smooth += (target - smooth) * (target > smooth ? 0.4 : 0.08)
  level.value = smooth

  raf = requestAnimationFrame(frame)
}

function shouldRun() {
  return props.status === 'connected'
    && !prefersReducedMotion
    && !!(props.micAnalyser || props.outputAnalyser)
}

function sync() {
  if (shouldRun()) {
    if (!raf) raf = requestAnimationFrame(frame)
    return
  }
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  smooth = 0
  level.value = 0
}

watch(() => [props.status, props.muted, props.micAnalyser, props.outputAnalyser] as const, sync)

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
})

const coreStyle = computed(() => ({
  transform: `scale(${(1 + level.value * 0.14).toFixed(3)})`,
}))

const haloStyle = computed(() => ({
  transform: `scale(${(1 + level.value * 0.35).toFixed(3)})`,
  opacity: (0.3 + level.value * 0.55).toFixed(3),
}))

const ariaLabel = computed(() => {
  const state = props.muted
    ? 'microphone muted'
    : props.status === 'connected'
      ? 'listening'
      : props.status === 'connecting'
        ? 'connecting'
        : props.status === 'ending'
          ? 'ending call'
          : 'idle'
  return `Voice interview status: ${state}`
})
</script>

<template>
  <div
    class="voice-orb"
    :class="[`is-${status}`, muted && 'is-muted']"
    role="img"
    :aria-label="ariaLabel"
  >
    <div class="orb-halo" :style="haloStyle" />
    <div class="orb-breathe">
      <div class="orb-core" :style="coreStyle">
        <span class="orb-sheen" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.voice-orb {
  --orb-size: clamp(150px, 38vw, 210px);
  position: relative;
  width: var(--orb-size);
  height: var(--orb-size);
  display: grid;
  place-items: center;
  user-select: none;
}

.orb-halo {
  position: absolute;
  inset: -16%;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(77, 141, 255, 0.5),
    rgba(48, 56, 184, 0.2) 62%,
    transparent
  );
  filter: blur(14px);
  will-change: transform, opacity;
}

.orb-breathe {
  position: relative;
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  will-change: transform;
}

.orb-core {
  position: relative;
  width: 62%;
  aspect-ratio: 1;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 28%, #dbeaff 0%, #8fb7ff 24%, #4d8dff 52%, #3038b8 82%, #232782 100%);
  box-shadow:
    inset -10px -14px 30px rgba(16, 20, 80, 0.45),
    inset 6px 8px 18px rgba(255, 255, 255, 0.5),
    0 12px 32px rgba(48, 56, 184, 0.3);
  will-change: transform;
}

.orb-sheen {
  position: absolute;
  left: 14%;
  top: 9%;
  width: 46%;
  height: 32%;
  border-radius: 50%;
  background: radial-gradient(rgba(255, 255, 255, 0.85), transparent 70%);
  filter: blur(2px);
}

/* Connected: gentle idle breathing. Level-driven scale lives on .orb-core,
   the breathing animation on .orb-breathe, so they never fight each other. */
.is-connected:not(.is-muted) .orb-breathe {
  animation: orb-breathe 4.2s ease-in-out infinite;
}

/* Connecting: slow, dim pulse while the session warms up. */
.is-connecting .orb-breathe {
  animation: orb-connecting 1.6s ease-in-out infinite;
}
.is-connecting .orb-core {
  filter: saturate(0.8) brightness(0.97);
}

/* Ending: settle down while the transcript is saved. */
.is-ending .orb-breathe {
  animation: none;
}
.is-ending .orb-core {
  filter: saturate(0.6) brightness(0.95);
  transform: scale(0.94);
  transition: transform 0.6s ease, filter 0.6s ease;
}

/* Muted: inactive and desaturated, breathing stops. AI audio may still tick
   the level slightly, which is acceptable — the visual state stays clear. */
.is-muted .orb-breathe {
  animation: none;
}
.is-muted .orb-core {
  filter: saturate(0.3) brightness(0.96);
}
.is-muted .orb-halo {
  opacity: 0.18;
}

@keyframes orb-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.045); }
}

@keyframes orb-connecting {
  0%, 100% { transform: scale(0.97); opacity: 0.75; }
  50% { transform: scale(1.03); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .orb-breathe,
  .orb-core,
  .orb-halo {
    animation: none !important;
    transition: none !important;
  }
}
</style>
