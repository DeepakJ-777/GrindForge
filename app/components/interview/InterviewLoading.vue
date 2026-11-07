<script setup lang="ts">
import { computed } from 'vue'

/**
 * Full-screen loading experience for the AI Interview workflow.
 *
 * Shown only while a real interview operation is in flight (session setup,
 * answer/question evaluation, report generation). The stage prop selects the
 * copy and the orb choreography; everything is pure CSS animation — no timers,
 * no fake progress. Motion is disabled under prefers-reduced-motion.
 */

type LoadingStage = 'starting' | 'generating' | 'reviewing'

const props = defineProps<{ stage: LoadingStage }>()

const COPY: Record<LoadingStage, { title: string; subtitle: string }> = {
  starting: { title: 'Preparing your interview...', subtitle: 'Setting up your interview environment' },
  generating: { title: 'Crafting your interview...', subtitle: 'Personalizing questions for your interview' },
  reviewing: { title: 'Reviewing your performance...', subtitle: 'Analyzing your answers and preparing feedback' },
}

const copy = computed(() => COPY[props.stage] ?? COPY.starting)

// Particle orbits for the "generating" stage. Each dot sits on its orbit's
// circumference (left/top derived from the angle); the orbit itself rotates,
// carrying the dots around the orb. Sizes/durations are % of the scene and
// seconds, tuned for a calm, premium drift rather than a spinner blur.
const ORBITS = [
  { size: 116, duration: 11, reverse: false, dot: '7px', dots: [18, 198] },
  { size: 140, duration: 16, reverse: true, dot: '6px', dots: [78, 258] },
  { size: 164, duration: 22, reverse: false, dot: '5px', dots: [138, 318] },
] as const

function dotOffset(angle: number) {
  const rad = (angle * Math.PI) / 180
  return {
    left: `${(50 + 50 * Math.cos(rad)).toFixed(2)}%`,
    top: `${(50 + 50 * Math.sin(rad)).toFixed(2)}%`,
  }
}
</script>

<template>
  <div class="interview-loading" :data-stage="stage" role="status" aria-live="polite">
    <div class="il-stage">
      <div class="il-scene" aria-hidden="true">
        <span class="il-ambient" />
        <span class="il-ring il-ring--1" />
        <span class="il-ring il-ring--2" />
        <span class="il-ring il-ring--3" />
        <span
          v-for="orbit in ORBITS"
          :key="orbit.size"
          class="il-orbit"
          :style="{
            width: `${orbit.size}%`,
            height: `${orbit.size}%`,
            animationDuration: `${orbit.duration}s`,
            animationDirection: orbit.reverse ? 'reverse' : 'normal',
            '--dot': orbit.dot,
          }"
        >
          <i
            v-for="angle in orbit.dots"
            :key="angle"
            class="il-dot"
            :style="{ ...dotOffset(angle), animationDelay: `${(orbit.duration / 10).toFixed(2)}s` }"
          />
        </span>
        <span class="il-halo" />
        <span class="il-orb-wrap">
          <span class="il-orb">
            <span class="il-scan" />
          </span>
        </span>
      </div>

      <Transition name="il-copy" mode="out-in">
        <div :key="stage" class="il-copy">
          <p class="il-title">{{ copy.title }}</p>
          <p class="il-subtitle">{{ copy.subtitle }}</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.interview-loading {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 32px 24px;
  background:
    radial-gradient(62% 48% at 50% 42%, rgba(219, 234, 255, 0.5), transparent 72%),
    rgba(245, 246, 252, 0.8);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.il-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(22px, 5vw, 32px);
}

/* ---- Scene ---------------------------------------------------------- */

.il-scene {
  --il-scene: clamp(180px, 46vw, 250px);
  position: relative;
  width: var(--il-scene);
  height: var(--il-scene);
  display: grid;
  place-items: center;
  animation: il-scene-in 0.9s cubic-bezier(0.2, 0.85, 0.25, 1) both;
}

@keyframes il-scene-in {
  from { opacity: 0; transform: scale(0.82); }
  to { opacity: 1; transform: scale(1); }
}

/* Wide ambient glow behind everything. */
.il-ambient {
  position: absolute;
  inset: -36%;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(77, 141, 255, 0.32),
    rgba(48, 56, 184, 0.14) 55%,
    transparent 76%
  );
  filter: blur(22px);
  animation: il-ambient 5.4s ease-in-out infinite;
  will-change: transform, opacity;
}

@keyframes il-ambient {
  0%, 100% { opacity: 0.72; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.06); }
}

/* Tighter glow hugging the orb. */
.il-halo {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 78%;
  height: 78%;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    rgba(145, 195, 255, 0.55),
    rgba(77, 141, 255, 0.2) 60%,
    transparent
  );
  filter: blur(10px);
  animation: il-halo 4.4s ease-in-out infinite;
  will-change: transform, opacity;
}

@keyframes il-halo {
  0%, 100% { opacity: 0.65; transform: scale(1); }
  50% { opacity: 0.95; transform: scale(1.07); }
}

@keyframes il-halo-strong {
  0%, 100% { opacity: 0.7; transform: scale(0.97); }
  50% { opacity: 1; transform: scale(1.12); }
}

/* ---- Rings ---------------------------------------------------------- */
/* starting: rings expand outward like the orb materializing them.
   reviewing: they become rotating scanner arcs + one calm guide ring.
   generating: hidden (particles take over). */

.il-ring {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1.5px solid rgba(77, 141, 255, 0.5);
  opacity: 0;
  transition: opacity 0.5s ease, border-color 0.5s ease;
  will-change: transform, opacity;
}

@keyframes il-ring-expand {
  0% { transform: scale(0.4); opacity: 0; }
  14% { opacity: 0.8; }
  100% { transform: scale(1.52); opacity: 0; }
}

@keyframes il-spin {
  to { transform: rotate(360deg); }
}

[data-stage='starting'] .il-ring {
  animation: il-ring-expand 2.7s cubic-bezier(0.18, 0.7, 0.35, 1) infinite;
}
[data-stage='starting'] .il-ring--2 { animation-delay: 0.9s; }
[data-stage='starting'] .il-ring--3 { animation-delay: 1.8s; }

[data-stage='reviewing'] .il-ring {
  border-color: transparent;
}
[data-stage='reviewing'] .il-ring--1 {
  opacity: 0.95;
  border-top-color: rgba(255, 255, 255, 0.95);
  border-right-color: rgba(107, 166, 255, 0.55);
  animation: il-spin 7.5s linear infinite;
}
[data-stage='reviewing'] .il-ring--2 {
  opacity: 0.85;
  border-top-color: rgba(145, 195, 255, 0.9);
  border-left-color: rgba(77, 141, 255, 0.4);
  animation: il-spin 11s linear infinite reverse;
}
[data-stage='reviewing'] .il-ring--3 {
  opacity: 0.3;
  border-color: rgba(77, 141, 255, 0.35);
  transform: scale(1.14);
}

/* ---- Particle orbits (generating) ----------------------------------- */

.il-orbit {
  position: absolute;
  inset: 0;
  margin: auto;
  border-radius: 50%;
  border: 1px solid rgba(77, 141, 255, 0.12);
  opacity: 0;
  transition: opacity 0.6s ease;
  animation: il-spin 14s linear infinite;
  animation-play-state: paused;
  will-change: transform;
}


[data-stage='generating'] .il-orbit {
  opacity: 1;
  animation-play-state: running;
}

.il-dot {
  position: absolute;
  width: var(--dot);
  height: var(--dot);
  margin: calc(var(--dot) / -2) 0 0 calc(var(--dot) / -2);
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ffffff, #91c3ff 55%, #4d8dff);
  box-shadow: 0 0 10px 2px rgba(107, 166, 255, 0.65);
  animation: il-twinkle 2.6s ease-in-out infinite;
  will-change: opacity, transform;
}

@keyframes il-twinkle {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.25); }
}

/* ---- Orb ------------------------------------------------------------ */

.il-orb-wrap {
  position: relative;
  width: 60%;
  aspect-ratio: 1;
  animation: il-breathe 4.6s ease-in-out 0.85s infinite;
  will-change: transform;
}

@keyframes il-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.035); }
}

@keyframes il-breathe-strong {
  0%, 100% { transform: scale(0.985); }
  50% { transform: scale(1.06); }
}

[data-stage='generating'] .il-orb-wrap {
  animation-name: il-breathe-strong;
  animation-duration: 2.9s;
}

[data-stage='reviewing'] .il-orb-wrap {
  animation-duration: 3.8s;
}

.il-orb {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: radial-gradient(
    circle at 32% 28%,
    #dbeaff 0%,
    #8fb7ff 26%,
    #4d8dff 54%,
    #3038b8 82%,
    #232782 100%
  );
  box-shadow:
    inset -12px -16px 34px rgba(16, 20, 80, 0.5),
    inset 8px 10px 22px rgba(255, 255, 255, 0.55),
    0 0 34px rgba(77, 141, 255, 0.4),
    0 16px 40px rgba(48, 56, 184, 0.28);
}

/* Glossy highlight. */
.il-orb::before {
  content: '';
  position: absolute;
  left: 16%;
  top: 10%;
  width: 44%;
  height: 30%;
  border-radius: 50%;
  background: radial-gradient(rgba(255, 255, 255, 0.9), transparent 70%);
  filter: blur(2px);
}

/* Bottom rim light. */
.il-orb::after {
  content: '';
  position: absolute;
  left: 22%;
  bottom: 6%;
  width: 56%;
  height: 18%;
  border-radius: 50%;
  background: radial-gradient(rgba(145, 195, 255, 0.55), transparent 70%);
  filter: blur(3px);
}

/* Scanning light band, clipped inside the orb (reviewing). */
.il-scan {
  position: absolute;
  left: -30%;
  width: 160%;
  height: 36%;
  top: 0;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(255, 255, 255, 0.5) 42%,
    rgba(235, 244, 255, 0.95) 50%,
    rgba(255, 255, 255, 0.5) 58%,
    transparent
  );
  filter: blur(4px);
  mix-blend-mode: screen;
  opacity: 0;
  transform: translateY(-130%) skewY(-4deg);
  will-change: transform;
}

@keyframes il-scan {
  0% { transform: translateY(-130%) skewY(-4deg); }
  55%, 100% { transform: translateY(430%) skewY(-4deg); }
}

[data-stage='reviewing'] .il-scan {
  opacity: 1;
  animation: il-scan 2.7s cubic-bezier(0.4, 0.1, 0.6, 0.9) 0.3s infinite;
}

[data-stage='generating'] .il-halo {
  animation-name: il-halo-strong;
  animation-duration: 2.8s;
}

/* ---- Copy ----------------------------------------------------------- */

.il-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  text-align: center;
  max-width: 36ch;
}

.il-title {
  font-size: clamp(16px, 2.4vw, 17.5px);
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--color-ink, #1e2339);
}

.il-subtitle {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--color-sub, #6a7194);
}

.il-copy-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.il-copy-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.il-copy-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.il-copy-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---- Reduced motion -------------------------------------------------- */
/* Everything static: the orb, a faint ring, resting particles and the copy
   remain — only movement is removed. The scan band is hidden because a
   frozen bright stripe reads as a defect rather than a state. */

@media (prefers-reduced-motion: reduce) {
  .interview-loading,
  .interview-loading * {
    animation: none !important;
    transition: none !important;
  }

  .il-scan { display: none; }

  .il-ring {
    opacity: 0.28;
    transform: scale(1.06);
  }

  .il-orbit { opacity: 1; }
  .il-dot { opacity: 0.85; }
}
</style>
