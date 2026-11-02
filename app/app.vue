<script setup lang="ts">
useHead({
  titleTemplate: title => (title ? `${title} · GRIND` : 'GRIND'),
})
</script>

<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
