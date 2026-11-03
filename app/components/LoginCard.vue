<script setup lang="ts">
const { loginWithGoogle } = useAuth()
const signingIn = shallowRef(false)

async function signIn() {
  signingIn.value = true
  await loginWithGoogle()
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-canvas p-6">
    <div class="gf-card w-full max-w-sm p-8 text-center">
      <div class="mx-auto flex size-12 items-center justify-center rounded-[14px] bg-primary-600 shadow-sm">
        <UIcon name="i-lucide-flame" class="size-6 text-white" />
      </div>
      <p class="mt-4 text-[15px] font-bold tracking-[0.18em] text-ink">GRINDFORGE</p>

      <h1 class="mt-6 text-[22px] font-semibold text-ink">Welcome back</h1>
      <p class="mt-1.5 text-[13.5px] leading-relaxed text-sub">
        Track your placement prep, keep your streak alive, and practice interviews — all in one place.
      </p>

      <UButton
        :loading="signingIn"
        size="lg"
        block
        class="mt-7"
        @click="signIn"
      >
        <template #leading>
          <svg class="size-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#EA4335" d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.46 1.8 14.96.72 12 .72 7.44.72 3.56 3.36 1.68 7.32l3.66 2.84C6.24 7.14 8.88 5.04 12 5.04z" />
            <path fill="#4285F4" d="M23.28 12.26c0-.92-.08-1.6-.26-2.3H12v4.34h6.44c-.13 1.08-.83 2.7-2.39 3.79l3.57 2.77c2.14-1.97 3.66-4.87 3.66-8.6z" />
            <path fill="#FBBC05" d="M5.35 14.6a6.9 6.9 0 0 1 0-4.44L1.68 7.32a11.28 11.28 0 0 0 0 10.12l3.67-2.84z" />
            <path fill="#34A853" d="M12 23.28c3.04 0 5.58-1 7.45-2.72l-3.57-2.77c-.95.66-2.23 1.12-3.88 1.12-3.12 0-5.76-2.1-6.66-5.06l-3.66 2.84c1.87 3.96 5.75 6.59 10.32 6.59z" />
          </svg>
        </template>
        Sign in with Google
      </UButton>

      <p class="mt-5 text-[11.5px] leading-relaxed text-sub">
        Your data stays tied to your account. Log prep daily, review anytime.
      </p>
    </div>
  </div>
</template>
