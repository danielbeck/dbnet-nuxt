<template>
    <div>
        <page :id="resolved.id" :tag="resolved.tag" />
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import routes from '~/helpers/routes.mjs'
import pool from '../.cache/pool.json'
import page from './page.vue'

const route = useRoute()
const slugArr = computed(() => {
    // Build a normalized array of path segments from params or route.path
    if (route.params && route.params.slug !== undefined) {
        if (Array.isArray(route.params.slug)) return route.params.slug.filter(Boolean)
        if (typeof route.params.slug === 'string') return route.params.slug.split('/').filter(Boolean)
        return []
    }
    if (route.path) return route.path.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean)
    return []
})

const normalizeSegments = (p) => String(p || '').replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean)

const resolved = computed(() => {
    const pathSegments = slugArr.value.filter(Boolean)
    // debug logging removed

    // 1. Top-level exact match by segments
    for (const r of routes) {
        const rSegs = normalizeSegments(r.path)
        if (rSegs.length === pathSegments.length && rSegs.join('/') === pathSegments.join('/')) {
            return { id: r.id, tag: r.tag || null }
        }
    }

    // 2. Child / nested route matching: prefer most-specific route whose path is a prefix
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
                const item = pool.find(p => Array.isArray(p.tags) && p.tags.includes(tag) && p.slug === relativeSlug)
                if (item) return { id: item.id, tag }
            }
        }

        if (section === 'archive') {
            let slug = pathSegments.slice(1).join('/')
            if (slug.endsWith('.html')) slug = slug.slice(0, -5)
            const item = pool.find(p => p.slug === slug)
            if (item) return { id: item.id, tag: null }
        }
    }

    return { id: null, tag: null }
})
</script>