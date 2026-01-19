// helpers/cache.js
// DRY cache update logic for page and pool stores

/**
 * Merge incoming items into cache (in-memory array)
 * @param {Array} cache - The cache array to update
 * @param {Array|Object} incoming - New items (array or single object)
 * @param {string} idKey - Key for item id (default 'id')
 */
export function mergeCache(cache, incoming, idKey = 'id') {
    const items = Array.isArray(incoming) ? incoming : [incoming]
    for (const it of items) {
        try { it[idKey] = String(it[idKey]) } catch (e) { }
        const idx = cache.findIndex(p => String(p[idKey]) === String(it[idKey]))
        if (idx >= 0) cache[idx] = it
        else cache.push(it)
    }
}

/**
 * Remove items from cache by id
 * @param {Array} cache - The cache array
 * @param {Array|string} ids - Ids to remove
 * @param {string} idKey - Key for item id (default 'id')
 */
export function removeFromCache(cache, ids, idKey = 'id') {
    const removeIds = Array.isArray(ids) ? ids.map(String) : [String(ids)]
    return cache.filter(p => !removeIds.includes(String(p[idKey])))
}

/**
 * Sync cache to server via POST
 * @param {string} url - API endpoint
 * @param {Object} payload - Data to send
 * @returns {Promise<void>}
 */
export async function syncCacheToServer(url, payload) {
    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        try {
            const text = await resp.text().catch(() => '')
            try {
                const json = text ? JSON.parse(text) : null
            } catch (e) {
                console.warn('[cache] non-JSON response from', url, text)
            }
        } catch (e) {
            console.warn('[cache] error reading response', e)
        }
    } catch (e) {
        console.error('[cache] error posting to', url, e)
    }
}
