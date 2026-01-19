export default defineNuxtPlugin((nuxtApp) => {
    // Only run on client
    if (process.server) return

    // Wait until the app is mounted so Pinia is installed and stores can be used safely.
    nuxtApp.hook('app:mounted', async () => {
        try {
            const mod = await import('~/stores/user')
            const useUserStore = mod.useUserStore || (mod.default && mod.default.useUserStore)
            if (!useUserStore) return
            const userStore = useUserStore()
            if (userStore && typeof userStore.initFromStorage === 'function') {
                userStore.initFromStorage()
            }
        } catch (e) {
            // ignore import/init errors
        }
    })
})
