export default defineNuxtPlugin(async () => {
  const settings = useSettings()
  if (import.meta.server) {
    try {
      const requestFetch = useRequestFetch()
      const result = await requestFetch<{ settings: typeof settings.value }>('/api/settings')
      settings.value = { ...settings.value, ...result.settings }
    } catch {
      // Unauthenticated pages keep the defaults.
    }
  }

})
