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

const resolved = computed(() => {
    return sharedResolveIdTag(slugArr.value, routes, pool)
})
</script>