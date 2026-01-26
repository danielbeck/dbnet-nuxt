import { defineNuxtPlugin } from '#app'
import { initAnalytics, trackPageView } from '@/helpers/analytics.js'
import { useUserStore } from '@/stores/user'
import { useRouter } from '#imports'

export default defineNuxtPlugin((nuxtApp) => {
    if (process.server) return

    // Delay initialization until the app is mounted so Pinia and router are ready
    nuxtApp.hook('app:mounted', () => {
        try {
            const userStore = useUserStore()
            initAnalytics(userStore)
            try {
                const router = useRouter()
                router.afterEach((to, from) => {
                    try { trackPageView(to, from) } catch (e) { }
                })
            } catch (e) {
                // router not available, ignore
            }
        } catch (e) {
            // ignore init errors
        }
    })
})
