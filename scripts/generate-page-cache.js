// Run this script to generate .cache/pages.json from your API
// Usage: node scripts/generate-pages-cache.js

import fs from 'fs'
import fetch from 'node-fetch'
import path from 'path'

const API_URL = 'https://danielbeck.net/api/page.php'
const POOL_CACHE = path.resolve('.cache/pool.json')
const OUT_PATH = path.resolve('.cache/pages.json')

// helpers
const parseAttrs = (s) => {
    const attrs = {}
    const re = /([a-zA-Z0-9_-]+)\s*=\s*"([^"]*)"/g
    let m
    while ((m = re.exec(s))) {
        attrs[m[1]] = m[2]
    }
    return attrs
}

const stripHtml = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const truncate = (str, n) => (str.length > n ? str.slice(0, n).trim() + '…' : str)
const fmtDate = (ms) => {
    try {
        const d = new Date(Number(ms))
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch (e) { return '' }
}

const escapeHtml = (str) => {
    if (str === undefined || str === null) return ''
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
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

async function main() {
    const res = await fetch(API_URL)
    if (!res.ok) throw new Error('Failed to fetch page data')
    const pages = await res.json()

    // attempt to read pool cache so we can expand <pool-list> placeholders
    let pool = []
    try {
        const raw = fs.readFileSync(POOL_CACHE, 'utf8')
        pool = JSON.parse(raw)
    } catch (e) {
        console.warn('Warning: .cache/pool.json not found or invalid; pool lists will be left as placeholders')
    }

    const expandPoolList = (attrs) => {
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

        // render different types
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
                    // ensure absolute pool path like /pool/xxx_image.jpg
                    if (!imgSrc.startsWith('/') && !/^https?:\/\//i.test(imgSrc)) imgSrc = '/pool/' + imgSrc
                    // use thumbnail variant when possible
                    imgSrc = imgSrc.replace(/_image(\.|$)/, '_thumbnail$1')
                    return `<div class="grid"><a href="${href}"><img src="${imgSrc}" alt="${escapeHtml(title)}" width="124" height="124"/></a><div class="label"><span>${title}</span></div></div>`
                }
                return `<div class="grid"><a href="${href}">${escapeHtml(title)}</a></div>`
            })
            return `<div class="imagegrid">${nodes.join('')}</div>`
        }

        // default: list
        return items.map(it => {
            const title = escapeHtml(it.title || '')
            const href = pathPrefix ? `${pathPrefix}${it.slug}.html` : `${it.slug}.html`
            const date = fmtDate(it.date)
            return `<div class="flex"><div class="label"><span>${date}: </span></div><div class="content"><a href="${href}">${title}</a></div></div>`
        }).join('\n')
    }

    // replace pool-list occurrences in page bodies
    const re = /<pool-list\b([^>]*)>(?:<\/pool-list>)?/gi
    for (const p of pages) {
        if (!p || typeof p.body !== 'string') continue
        p.body = p.body.replace(re, (m, attrStr) => {
            try {
                const attrs = parseAttrs(attrStr || '')
                // if no pool cache, leave original
                if (!pool || pool.length === 0) return m
                return expandPoolList(attrs)
            } catch (e) {
                return m
            }
        })
    }

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
    fs.writeFileSync(OUT_PATH, JSON.stringify(pages, null, 2))
    console.log(`Wrote ${OUT_PATH} with ${pages.length} pages.`)
}

main().catch(e => { console.error(e); process.exit(1) })
