<script setup lang="ts">
const { user } = useAuth()
const route = useRoute()
const sidebarOpen = useState('sidebar-open', () => false)

// Close the mobile drawer on navigation
watch(() => route.fullPath, () => {
  sidebarOpen.value = false
})
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <template v-if="user">
      <!-- Desktop sidebar -->
      <aside class="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-line/80 bg-surface lg:block">
        <AppSidebar />
      </aside>

      <!-- Mobile drawer -->
      <Teleport to="body">
        <Transition name="drawer-fade">
          <div
            v-if="sidebarOpen"
            class="fixed inset-0 z-50 bg-ink/25 backdrop-blur-[2px] lg:hidden"
            @click="sidebarOpen = false"
          />
        </Transition>
        <Transition name="drawer-slide">
          <aside
            v-if="sidebarOpen"
            class="fixed inset-y-0 left-0 z-50 w-[252px] shadow-pop lg:hidden"
          >
            <AppSidebar />
          </aside>
        </Transition>
      </Teleport>

      <!-- Main column -->
      <div class="lg:pl-[240px]">
        <AppHeader />
        <main class="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <slot />
        </main>
      </div>
    </template>

    <LoginCard v-else />
  </div>
</template>

<style scoped>
.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(-100%);
}
</style>
