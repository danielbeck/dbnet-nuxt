import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from './user'
import { API_BASE } from '@/helpers/api'
import { fromDatetimeLocal } from '@/helpers'

export const usePageStore = defineStore('page', () => {
    // State
    const page = ref({})

    // Helper function (replaces StoreHelper.prepForStorage)
    function prepForStorage(data) {
        const userStore = useUserStore()
        if (!userStore.currentUser?.user) {
            return false
        }

        data._user = userStore.currentUser.user
        data._nonce = userStore.currentUser.nonce

        if (!data._created) {
            data._created = new Date().getTime()
        }
        data._edited = new Date().getTime()

        if (data.date) {
            data.date = fromDatetimeLocal(data.date)
        }

        return data
    }

    // Actions
    async function getAll() {
        const response = await fetch(`${API_BASE}/page.php`)
        const data = await response.json()
        processPages(data)
        document.dispatchEvent(new Event('page-getAll'))
    }

    async function get(id) {
        const response = await fetch(`${API_BASE}/page.php?id=${id}`)
        const data = await response.json()
        processPages(data)
        document.dispatchEvent(new Event('page-get-' + id))
    }

    async function edit(data) {
        const userStore = useUserStore()
        data = prepForStorage(data)

        const response = await fetch(`${API_BASE}/page-post.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })

        if (response.status === 401) {
            userStore.logout()
            return
        }

        const newNonce = response.headers.get('X-New-Nonce')
        if (newNonce) {
            userStore.setCurrentUser({
                user: userStore.currentUser.user,
                nonce: newNonce
            })
        }

        const result = await response.json()
        processPages(result)
        // Try to update local cache on the dev/server so .cache/pages.json reflects edits
        try {
            const payload = Array.isArray(result) ? { items: result } : { items: [result] }
            const url = (typeof window !== 'undefined') ? (window.location.origin + '/api/cache/pages') : '/api/cache/pages'
            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            try {
                console.log('[cache] POST url:', url)
                console.log('[cache] response url:', resp.url, 'status:', resp.status)
                const text = await resp.text().catch(() => '')
                try {
                    const json = text ? JSON.parse(text) : null
                    console.log('[cache] response body (json):', json)
                } catch (e) {
                    console.log('[cache] response body (text):', text)
                }
            } catch (e) {
                console.warn('[cache] error reading response', e)
            }
        } catch (e) {
            console.error('[cache] error posting to /api/cache/pages', e)
        }
    }

    async function erase(id) {
        const userStore = useUserStore()
        const user = userStore.currentUser.user
        const nonce = userStore.currentUser.nonce

        const response = await fetch(`${API_BASE}/page-delete.php?id=${id}&_user=${user}&_nonce=${nonce}`)

        if (response.status === 401) {
            userStore.logout()
            return
        }

        const newNonce = response.headers.get('X-New-Nonce')
        if (newNonce) {
            userStore.setCurrentUser({
                user: user,
                nonce: newNonce
            })
        }

        delete page.value[id]
        page.value = { ...page.value }
    }

    // Internal helper to process page data
    function processPages(payload) {
        for (let item of payload) {
            if (!item || typeof item !== 'object' || !item.id) {
                console.warn('[page.js] Skipping invalid page item:', item)
                continue
            }
            if (item._created) item._created = new Date(Number(item._created))
            if (item._edited) item._edited = new Date(Number(item._edited))
            page.value[item.id] = item
        }
    }

    return {
        // State
        page,
        // Actions
        getAll,
        get,
        edit,
        erase
    }
})
