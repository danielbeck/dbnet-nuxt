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
import { resolveIdTag as sharedResolveIdTag } from '@/helpers/resolveRoute.js'
import { useHead } from '#imports'

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

// Return the full item object (pool item or page) for head tags
const resolved = computed(() => {
    // Try to resolve pool item by slug
    let slug = slugArr.value.length ? slugArr.value[slugArr.value.length - 1] : ''
    if (slug.endsWith('.html')) slug = slug.slice(0, -5)
    // Find pool item
    const poolItem = pool.find(p => p.slug === slug)
    if (poolItem) return poolItem
    // Fallback: use resolveIdTag for id/tag
    const idTag = sharedResolveIdTag(slugArr.value, routes, pool)
    // Try to find page by id
    if (idTag.id) {
        const pageItem = pool.find(p => p.id === idTag.id)
        if (pageItem) return pageItem
        return { id: idTag.id, tag: idTag.tag, title: undefined }
    }
    return { id: undefined, tag: undefined, title: undefined }
})


// Always use /archive/[slug].html for canonical
const canonicalUrl = computed(() => {
    let slug = slugArr.value.length ? slugArr.value[slugArr.value.length - 1] : ''
    if (slug.endsWith('.html')) slug = slug.slice(0, -5)
    return `https://danielbeck.net/archive/${slug}.html`
})

useHead({
    title: computed(() => resolved.value?.title || 'Untitled'),
    link: [
        { rel: 'canonical', href: canonicalUrl }
    ]
})
</script>