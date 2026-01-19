// helpers/resolveRoute.js
// DRY route resolution logic for pages and pool

/**
 * Normalizes a path string into an array of segments
 */
function normalizeSegments(p) {
    return String(p || '').replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean)
}

/**
 * Resolves {id, tag} for a given slugArr, routes, and pool
 * @param {string[]} slugArr - Array of path segments
 * @param {Array} routes - Route definitions
 * @param {Array} pool - Pool items
 * @param {Function} findPoolItemBySlugAndTag - Optional custom finder
 * @param {Function} findPoolItemBySlug - Optional custom finder
 * @returns {{id: string|null, tag: string|null}}
 */
export function resolveIdTag(slugArr, routes, pool, findPoolItemBySlugAndTag, findPoolItemBySlug) {
    let arr = [...slugArr]
    if (arr.length > 1 && arr[arr.length - 1] === '') arr.pop()
    const pathSegments = arr.filter(Boolean)

    // 1. Top-level exact match
    for (const r of routes) {
        const rSegs = normalizeSegments(r.path)
        if (rSegs.length === pathSegments.length && rSegs.join('/') === pathSegments.join('/')) {
            return { id: r.id, tag: r.tag || null }
        }
    }

    // 2. Child/nested route matching: prefer route whose path segments are a prefix
    if (pathSegments.length >= 2) {
        const section = pathSegments[0]
        const candidates = routes.map(r => ({ r, segs: normalizeSegments(r.path) }))
            .filter(o => o.segs.length >= 1 && o.segs[0] === section && o.r.tag)
        if (candidates.length) {
            let best = null
            for (const c of candidates) {
                const segs = c.segs
                const prefix = pathSegments.slice(0, segs.length).join('/')
                if (prefix === segs.join('/')) {
                    if (!best || segs.length > best.segs.length) best = c
                }
            }
            if (best) {
                const tag = best.r.tag
                const consumed = best.segs.length
                let relativeSlug = pathSegments.slice(consumed).join('/')
                if (!relativeSlug) relativeSlug = pathSegments.slice(1).join('/')
                if (relativeSlug.endsWith('.html')) relativeSlug = relativeSlug.slice(0, -5)
                let item = null
                if (findPoolItemBySlugAndTag) {
                    item = findPoolItemBySlugAndTag(relativeSlug, tag)
                } else {
                    item = pool.find(p => Array.isArray(p.tags) && p.tags.includes(tag) && p.slug === relativeSlug)
                }
                if (item) return { id: item.id, tag }
            }
        }
        // archive fallback: /archive/[slug]
        if (section === 'archive') {
            const slug = pathSegments.slice(1).join('/')
            let clean = slug
            if (clean.endsWith('.html')) clean = clean.slice(0, -5)
            let item = null
            if (findPoolItemBySlug) {
                item = findPoolItemBySlug(clean)
            } else {
                item = pool.find(p => p.slug === clean)
            }
            if (item) return { id: item.id, tag: null }
        }
    }
    return { id: null, tag: null }
}
