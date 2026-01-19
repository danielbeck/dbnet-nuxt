// Helper to expand <pool-list> placeholders into static HTML using a pool cache

export function escapeHtml(str) {
    if (str === undefined || str === null) return ''
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
}

const parseLimit = (limit) => {
    if (!limit) return null
    if (limit === '*') return Infinity
    const cleaned = String(limit).replace(/[\[\]]/g, '')
    if (cleaned.includes(',')) {
        const parts = cleaned.split(',')
        const start = parseInt(parts[0], 10)
        const end = parts[1] === '*' ? Infinity : parseInt(parts[1], 10)
        return [start, end]
    }
    return parseInt(cleaned, 10)
}

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const truncate = (str, n) => (str.length > n ? str.slice(0, n).trim() + '…' : str)

function fmtDate(ms) {
    try {
        const d = new Date(Number(ms))
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch (e) {
        return ''
    }
}

export function expandPoolPlaceholders(html, pool = []) {
    if (!html || typeof html !== 'string') return html
    if (!Array.isArray(pool)) pool = []

    // parse <pool-list ...> occurrences
    const re = /<pool-list\b([^>]*)>(?:<\/pool-list>)?/gi
    return html.replace(re, (m, attrStr) => {
        try {
            const attrs = {}
            const attrRe = /([a-zA-Z0-9_-]+)\s*=\s*"([^\"]*)"/g
            let am
            while ((am = attrRe.exec(attrStr))) {
                attrs[am[1]] = am[2]
            }

            const tagAttr = attrs.tag || ''
            const types = (attrs.type || 'list').trim()
            const sort = attrs.sort || 'desc'
            const pathPrefix = attrs.path || ''
            const limitRaw = attrs.limit || null

            const tags = tagAttr ? tagAttr.split(',').map(s => s.trim()).filter(Boolean) : []

            let items = Array.isArray(pool) ? pool.slice() : []
            if (tags.length) {
                items = items.filter(it => Array.isArray(it.tags) && it.tags.some(t => tags.includes(t)))
            }

            items.sort((a, b) => {
                const ad = Number(a.date || 0)
                const bd = Number(b.date || 0)
                return sort === 'asc' ? ad - bd : bd - ad
            })

            const parsedlimit = parseLimit(limitRaw)
            if (Array.isArray(parsedlimit)) {
                const endIndex = parsedlimit[1] === Infinity ? undefined : parsedlimit[1]
                items = items.slice(parsedlimit[0] - 1, endIndex)
            } else if (typeof parsedlimit === 'number' && isFinite(parsedlimit)) {
                items = items.slice(0, parsedlimit)
            }

            if (types === 'summary') {
                const nodes = items.map(it => {
                    const title = escapeHtml(it.title || '')
                    const href = pathPrefix ? `${pathPrefix}${it.slug}.html` : `${it.slug}.html`
                    const date = fmtDate(it.date)
                    const excerpt = escapeHtml(truncate(stripHtml(it.body || ''), 150))
                    return `<div class="flex"><div class="label">${date}: </div><div class="content"><a href="${href}">${title}</a><div>${excerpt}</div></div></div>`
                })
                if (nodes.length) nodes.push('<hr />')
                return nodes.join('\n')
            }

            if (types === 'image') {
                const nodes = items.map(it => {
                    const title = it.title || ''
                    const href = pathPrefix ? `${pathPrefix}${it.slug}.html` : `${it.slug}.html`
                    let imgSrc = ''
                    if (it.img) {
                        imgSrc = it.img
                        if (!imgSrc.startsWith('/') && !/^https?:\/\//i.test(imgSrc)) imgSrc = '/pool/' + imgSrc
                        imgSrc = imgSrc.replace(/_image(\.|$)/, '_thumbnail$1')
                        return `<div class="grid"><a href="${href}"><img src="${imgSrc}" alt="${escapeHtml(title)}" width="124" height="124"/></a><div class="label"><span>${escapeHtml(title)}</span></div></div>`
                    }
                    return `<div class="grid"><a href="${href}">${escapeHtml(title)}</a></div>`
                })
                return `<div class="imagegrid">${nodes.join('')}</div>`
            }

            // default list
            return items.map(it => {
                const title = escapeHtml(it.title || '')
                const href = pathPrefix ? `${pathPrefix}${it.slug}.html` : `${it.slug}.html`
                const date = fmtDate(it.date)
                return `<div class="flex"><div class="label"><span>${date}: </span></div><div class="content"><a href="${href}">${title}</a></div></div>`
            }).join('\n')
        } catch (e) {
            return m
        }
    })
}
