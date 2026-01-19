import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
    // State
    const currentUser = ref(false)
    const hash = ref(false)
    const initialized = ref(false)

    // Getters
    const getCurrentUser = computed(() => {
        return currentUser.value?.user ? currentUser.value : false
    })

    const getHash = computed(() => hash.value)

    // Actions
    function setCurrentUser(data) {
        if (data && data.nonce && data.nonce != 0) {
            currentUser.value = {
                user: data.user,
                nonce: data.nonce
            }
            localStorage.setItem('auth', JSON.stringify(currentUser.value))
        } else {
            currentUser.value = false
            localStorage.removeItem('auth')
        }
    }

    function setHash(newHash) {
        hash.value = newHash
    }

    function initFromStorage() {
        if (initialized.value) return
        initialized.value = true

        if (typeof localStorage === 'undefined') return

        try {
            const storedAuth = localStorage.getItem('auth')
            if (storedAuth) {
                const parsed = JSON.parse(storedAuth)
                if (parsed && parsed.user && parsed.nonce) {
                    currentUser.value = parsed
                }
            }
        } catch (e) {
            // Invalid data, ignore
        }
    }

    function logout() {
        setCurrentUser(false)
    }

    return {
        // State
        currentUser,
        hash,
        // Getters
        getCurrentUser,
        getHash,
        // Actions
        setCurrentUser,
        setHash,
        initFromStorage,
        logout
    }
})
