import { defineNuxtPlugin } from '#app'
import { initAnalytics, trackPageView } from '@/helpers/analytics.js'
import { useUserStore } from '@/stores/user'

export default defineNuxtPlugin((nuxtApp) => {
    if (process.server) return

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
