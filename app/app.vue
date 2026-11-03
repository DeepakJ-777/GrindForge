<script setup lang="ts">
useHead({
  titleTemplate: title => (title ? `${title} · GRINDFORGE` : 'GRINDFORGE'),
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
