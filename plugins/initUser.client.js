import { useUserStore } from '@/stores/user'

export default defineNuxtPlugin(() => {
    try {
        const userStore = useUserStore()
        if (process.client && userStore && typeof userStore.initFromStorage === 'function') {
            userStore.initFromStorage()
        }
    } catch (e) {
        // ignore
    }
})
