<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  hint?: string
}>()
</script>

<template>
  <div class="gf-card flex items-center gap-4 p-5">
    <span class="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-lav">
      <UIcon :name="icon" class="size-5 text-primary-600" />
    </span>
    <div class="min-w-0">
      <p class="text-[11px] font-semibold tracking-[0.08em] text-sub uppercase">{{ label }}</p>
      <p class="mt-0.5 truncate text-[22px] leading-tight font-semibold text-ink">{{ value }}</p>
      <p v-if="hint" class="mt-0.5 truncate text-[12px] text-sub">{{ hint }}</p>
    </div>
  </div>
</template>
