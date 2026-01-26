import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUserStore } from './user'
import { API_BASE } from '@/helpers/api'
import { fromDatetimeLocal } from '@/helpers'
import { mergeCache, removeFromCache, syncCacheToServer } from '@/helpers/cache.js'
// Prefer using the static expanded page cache for dev hydration parity
let pagesCache = []
try {
    // relative to /stores
    // eslint-disable-next-line import/no-unresolved
    pagesCache = require('../.cache/pages.json')
} catch (e) {
    pagesCache = []
}

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
    const pendingGets = {}

    async function getAll() {
        const response = await fetch(`${API_BASE}/page.php`)
        const data = await response.json()
        processPages(data)
        document.dispatchEvent(new Event('page-getAll'))
    }

    async function get(id) {
        if (!id) return;
        if (pendingGets[`get:${id}`]) return pendingGets[`get:${id}`]
        const p = (async () => {
            const response = await fetch(`${API_BASE}/page.php?id=${id}`)
            const data = await response.json()
            processPages(data)
            document.dispatchEvent(new Event('page-get-' + id))
        })()
        pendingGets[`get:${id}`] = p
        try { await p } finally { delete pendingGets[`get:${id}`] }
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
        // Update in-memory pagesCache so edits are immediately reflected
        try {
            mergeCache(pagesCache, result, 'id')
        } catch (e) {
            // ...existing code...
        }
        processPages(result)
        // Try to update local cache on the dev/server so .cache/pages.json reflects edits
        try {
            const payload = Array.isArray(result) ? { items: result } : { items: [result] }
            const url = (typeof window !== 'undefined') ? (window.location.origin + '/api/cache/pages') : '/api/cache/pages'
            await syncCacheToServer(url, payload)
        } catch (e) {
            // ...existing code...
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

        // Update in-memory and on-disk caches so deleted page is removed from .cache/pages.json
        try {
            const payload = { remove: [String(id)] }
            const url = (typeof window !== 'undefined') ? (window.location.origin + '/api/cache/pages') : '/api/cache/pages'
            await syncCacheToServer(url, payload)
        } catch (e) {
            // ...existing code...
        }
        // remove from pagesCache in-memory
        try {
            pagesCache = removeFromCache(pagesCache, id, 'id')
        } catch (e) { }

        delete page.value[id]
        page.value = { ...page.value }
    }

    // Internal helper to process page data
    function processPages(payload) {
        for (let item of payload) {
            if (!item || typeof item !== 'object' || !item.id) {
                continue
            }
            // If a static expanded page exists in the on-disk cache, prefer its body
            try {
                const staticMatch = pagesCache && Array.isArray(pagesCache) && pagesCache.find(p => String(p.id) === String(item.id))
                if (staticMatch && staticMatch.body) {
                    item.body = staticMatch.body
                }
            } catch (e) {
                // ignore cache read errors
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
