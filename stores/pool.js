import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from './user'
import { API_BASE } from '@/helpers/api'
import { fromDatetimeLocal } from '@/helpers'

export const usePoolStore = defineStore('pool', () => {
    // State
    const pool = ref({})
    const tagLoaded = ref({})

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
        const response = await fetch(`${API_BASE}/pool.php`)
        const data = await response.json()
        processPool(data)
        if (typeof document !== 'undefined') document.dispatchEvent(new Event('pool-getAll'))
    }

    async function getHomepage() {
        const response = await fetch(`${API_BASE}/homepage.php`)
        const data = await response.json()
        processPool(data)
    }

    async function getByTag(tag) {
        if (tagLoaded.value[tag]) {
            // already loaded, don't go to the server again
            return Promise.resolve()
        }

        const response = await fetch(`${API_BASE}/pool.php?tag=${tag}`)
        const data = await response.json()
        tagLoaded.value[tag] = true
        processPool(data)
        if (typeof document !== 'undefined') document.dispatchEvent(new Event('pool-getByTag-' + tag))
    }

    async function get(id) {
        if (id === undefined || id === null || id === '') {
            // Do not make a request if id is not provided
            return;
        }
        // Determine if id is numeric (fetch by id) or a slug (fetch by slug)
        const isNumeric = /^\d+$/.test(id)
        const param = isNumeric ? 'id' : 'slug'
        const response = await fetch(`${API_BASE}/pool.php?${param}=${id}`)
        const data = await response.json()
        if (data.length) {
            processPool(data)
        }
    }

    async function edit(data) {
        const userStore = useUserStore()
        data = prepForStorage(data)

        try {
            const response = await fetch(`${API_BASE}/pool-post.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const newNonce = response.headers.get('X-New-Nonce')
            if (newNonce) {
                userStore.setCurrentUser({
                    user: userStore.currentUser.user,
                    nonce: newNonce
                })
            }

            const result = await response.json()

            if (response.status === 409) {
                if (result.error === 'Duplicate slug') {
                    return { success: false, error: 'duplicate-slug' }
                }
                return { success: false, error: 'conflict' }
            }

            processPool(result)
            // Update local cache on the server (if available) so .cache/pool.json stays up-to-date
            try {
                const payload = Array.isArray(result) ? { items: result } : { items: [result] }
                // make origin explicit to avoid ambiguous relative routing in some environments
                const url = (typeof window !== 'undefined') ? (window.location.origin + '/api/cache/pool') : '/api/cache/pool'
                const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                // Log response details for debugging
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
                console.error('[cache] error posting to /api/cache/pool', e)
            }

            // Refresh the pool list in-memory so UI reflects the newly added/edited item
            try {
                await getAll()
            } catch (e) {
                console.warn('[pool] getAll() failed after edit', e)
            }

            return { success: true }
        } catch (error) {
            return { success: false, error: 'unknown' }
        }
    }

    async function erase(id) {
        const userStore = useUserStore()
        const user = userStore.currentUser.user
        const nonce = userStore.currentUser.nonce

        const response = await fetch(`${API_BASE}/pool-delete.php?id=${id}&_user=${user}&_nonce=${nonce}`)

        const newNonce = response.headers.get('X-New-Nonce')
        if (newNonce) {
            userStore.setCurrentUser({
                user: user,
                nonce: newNonce
            })
        }

        // Update on-disk cache so deleted item is removed from .cache/pool.json
        try {
            const payload = { remove: [String(id)] }
            const url = (typeof window !== 'undefined') ? (window.location.origin + '/api/cache/pool') : '/api/cache/pool'
            const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
            try { console.log('[cache] delete POST status:', resp.status) } catch (e) { }
        } catch (e) {
            console.warn('[cache] error posting delete to /api/cache/pool', e)
        }

        // Remove from in-memory map for both numeric and string keys
        try { delete pool.value[id] } catch (e) { }
        try { delete pool.value[String(id)] } catch (e) { }
        pool.value = { ...pool.value }
    }

    // Internal helper to process pool data
    function processPool(payload) {
        let newItems = {}
        for (let item of payload) {
            if (item._created) item._created = new Date(Number(item._created))
            if (item._edited) item._edited = new Date(Number(item._edited))
            if (item.date) item.date = new Date(Number(item.date))
            if (item.img) {
                if (item.img && !item.img.startsWith('/pool/')) {
                    item.img = "/pool/" + item.img
                }
                item.thumbnail = item.img.replace(/_image/, '_thumbnail')
            }
            newItems[item.id] = item
        }
        // merge the new items in:
        pool.value = {
            ...pool.value,
            ...newItems
        }
    }

    return {
        // State
        pool,
        tagLoaded,
        // Actions
        getAll,
        getHomepage,
        getByTag,
        get,
        edit,
        erase
    }
})
