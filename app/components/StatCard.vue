<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  hint?: string
}>()
</script>

<template>
  <div class="gf-card h-full p-4">
    <div class="flex items-center gap-2.5">
      <span class="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-lav">
        <UIcon :name="icon" class="size-4 text-primary-600" />
      </span>
      <p class="min-w-0 truncate text-[22px] leading-tight font-semibold text-ink">{{ value }}</p>
    </div>
    <p class="mt-2 truncate text-[11px] font-semibold tracking-[0.08em] text-sub uppercase">{{ label }}</p>
    <p v-if="hint" class="mt-0.5 truncate text-[12px] text-sub">{{ hint }}</p>
  </div>
</template>
