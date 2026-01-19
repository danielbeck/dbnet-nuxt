<template>
    <div>
        <Loading v-if="loading && !currentUser" />
        <div v-else-if="pageOrBlank && pageOrBlank.title">
            <!-- Admin controls: for pool items show EditPool; for non-pool pages show both EditPage and (if tag) Add Pool -->
            <template v-if="currentUser">
                <EditPool v-if="isPoolItem" :id="pageOrBlank.id" />
                <template v-else>
                    <EditPage :id="pageOrBlank.id" />
                    <EditPool v-if="tag" :tag="tag" />
                </template>
            </template>
            <h1 v-html="pageOrBlank.title"></h1>

            <nav class="npnav" v-if="isPoolItem">
                <div class="nav">
                    <template v-if="prevItem">
                        <router-link class="npbtn" :to="buildPoolItemUrl(prevItem, currentTag)"
                            :aria-label="currentTag ? 'Previous page in ' + currentTag : 'Previous page'">‹</router-link>
                    </template>
                    <template v-else>
                        <a class="npbtn disabled" aria-hidden="true">‹</a>
                    </template>
                </div>
                <div class="nav">
                    <template v-if="nextItem">
                        <router-link class="npbtn" :to="buildPoolItemUrl(nextItem, currentTag)"
                            :aria-label="currentTag ? 'Next page in ' + currentTag : 'Next page'">›</router-link>
                    </template>
                    <template v-else>
                        <a class="npbtn disabled" aria-hidden="true">›</a>
                    </template>
                </div>
            </nav>

            <div @touchstart="touchStart" @touchend="touchEnd">
                <!-- Render page body via CompiledContent on both server and client.
                     CompiledContent renders raw HTML during SSR and mounts interactive
                     fragments on the client, keeping DOM structure consistent. -->
                <CompiledContent :input="pageOrBlank.body" />

                <div v-if="pageOrBlank.img" class="pageimage">
                    <img :src="pageOrBlank.img" :alt="'Photo of ' + pageOrBlank.title" />
                </div>
            </div>
        </div>
        <div v-else>
            <Loading v-if="loading" />
            <div v-else style="padding:2em;text-align:center;font-size:1.5em;">Not Found</div>
        </div>
    </div>
</template>

<script setup>
import { computed, watch, onMounted, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePageStore } from '@/stores/page'
import { usePoolStore } from '@/stores/pool'
import { useUserStore } from '@/stores/user'
import CompiledContent from '@/components/CompiledContent.vue'
import EditPage from '@/components/EditPage.vue'
import EditPool from '@/components/EditPool.vue'

import Loading from '@/components/Loading.vue'
let pool = []
let pagesCache = []
if (import.meta.env.SSR) {
    try {
        const fs = await import('fs')
        const path = await import('path')
        try {
            const rawPool = fs.readFileSync(path.resolve('.cache/pool.json'), 'utf8')
            pool = JSON.parse(rawPool)
        } catch (e) {
            pool = []
        }
        try {
            const raw = fs.readFileSync(path.resolve('.cache/pages.json'), 'utf8')
            pagesCache = JSON.parse(raw)
        } catch (e) {
            pagesCache = []
        }
    } catch (e) {
        pool = []
        pagesCache = []
    }
} else {
    pagesCache = []
    pool = []
}
import routes from '~/helpers/routes.mjs'


const props = defineProps({
    id: String,
    tag: String
})
const pageStore = usePageStore()
const poolStore = usePoolStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const pages = computed(() => pageStore.page)
const currentUser = computed(() => userStore.currentUser)

// static caches imported above

// Helper to find pool items: prefer runtime store (client) then fall back to static cache
function findPoolItemBySlugAndTag(slug, tag) {
    // normalize
    const s = String(slug || '').replace(/\.html$/, '')
    // check client store first (runtime)
    try {
        const storePool = poolStore && poolStore.pool ? poolStore.pool : {}
        for (const k of Object.keys(storePool)) {
            const p = storePool[k]
            if (p && p.slug === s && Array.isArray(p.tags) && p.tags.includes(tag)) return p
        }
    } catch (e) {
        // ignore
    }
    // fall back to static cache
    return pool.find(p => Array.isArray(p.tags) && p.tags.includes(tag) && p.slug === s)
}

function findPoolItemBySlug(slug) {
    const s = String(slug || '').replace(/\.html$/, '')
    try {
        const storePool = poolStore && poolStore.pool ? poolStore.pool : {}
        for (const k of Object.keys(storePool)) {
            const p = storePool[k]
            if (p && p.slug === s) return p
        }
    } catch (e) { }
    return pool.find(p => p.slug === s)
}

// Helper to resolve id/tag from route if props are missing
function resolveIdTag() {
    // If props are present, use them
    if (props.id) return { id: props.id, tag: props.tag }
    // Otherwise, resolve from route
    let slugArr
    if (route.params && route.params.slug !== undefined) {
        if (Array.isArray(route.params.slug)) {
            slugArr = route.params.slug
        } else if (typeof route.params.slug === 'string') {
            // route.params.slug can be a single string that contains slashes
            // e.g. 'photos/portraits/kimma.html' — split into segments
            slugArr = route.params.slug.split('/').filter(Boolean)
        } else {
            slugArr = []
        }
    } else if (route.path) {
        // Fallback: parse from route.path
        slugArr = route.path.replace(/^\//, '').replace(/\/$/, '').split('/')
    } else {
        slugArr = []
    }
    // Remove empty trailing elements (from trailing slash)
    let arr = [...slugArr]
    if (arr.length > 1 && arr[arr.length - 1] === '') arr.pop()

    const pathSegments = arr.filter(Boolean)

    const normalizeSegments = (p) => {
        return String(p || '').replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean)
    }

    // 1. Top-level exact match (compare segments for robustness)
    for (const r of routes) {
        const rSegs = normalizeSegments(r.path)
        if (rSegs.length === pathSegments.length && rSegs.join('/') === pathSegments.join('/')) {
            return { id: r.id, tag: r.tag || null }
        }
    }

    // 2. Child / nested route matching: prefer route whose path segments are a prefix
    if (pathSegments.length >= 2) {
        const section = pathSegments[0]
        // collect candidates whose first segment matches and which have a tag
        const candidates = routes.map(r => ({ r, segs: normalizeSegments(r.path) }))
            .filter(o => o.segs.length >= 1 && o.segs[0] === section && o.r.tag)

        if (candidates.length) {
            // find the candidate with the longest matching prefix (most specific)
            let best = null
            for (const c of candidates) {
                const segs = c.segs
                // ensure segs is a prefix of pathSegments
                const prefix = pathSegments.slice(0, segs.length).join('/')
                if (prefix === segs.join('/')) {
                    if (!best || segs.length > best.segs.length) best = c
                }
            }

            if (best) {
                const tag = best.r.tag
                const consumed = best.segs.length
                let relativeSlug = pathSegments.slice(consumed).join('/')
                // fallback to the 'slug' computed from everything after the first segment
                if (!relativeSlug) relativeSlug = pathSegments.slice(1).join('/')
                if (relativeSlug.endsWith('.html')) relativeSlug = relativeSlug.slice(0, -5)
                const item = findPoolItemBySlugAndTag(relativeSlug, tag)
                if (item) return { id: item.id, tag }
            }
        }

        // archive fallback: /archive/[slug]
        if (section === 'archive') {
            const slug = pathSegments.slice(1).join('/')
            let clean = slug
            if (clean.endsWith('.html')) clean = clean.slice(0, -5)
            const item = findPoolItemBySlug(clean)
            if (item) return { id: item.id, tag: null }
        }
    }

    return { id: null, tag: null }
}

const resolved = computed(() => resolveIdTag())
const id = computed(() => resolved.value.id)
const tag = computed(() => resolved.value.tag)


import { ref } from 'vue'

// Start `loading` as false on SSR but true on client so initial client-side
// navigations show the loading UI instead of flashing "Not Found".
const loading = ref(import.meta.env.SSR ? false : true)
const isSSR = import.meta.env.SSR
const getPoolItem = (id) => pool.find(p => String(p.id) === String(id)) || null
const getPageItem = (id) => pagesCache.find(p => String(p.id) === String(id)) || null
const page = computed(() => {
    try {
        // Defensive: always return a blank object if id is missing
        if (!id.value) return { id: '', title: '', body: '', tag: '' }
        // On server (SSG), use static cache for both pool and page items
        if (import.meta.env.SSR) {
            const poolItem = getPoolItem(id.value)
            if (poolItem && typeof poolItem === 'object') return poolItem
            const pageItem = getPageItem(id.value)
            if (pageItem && typeof pageItem === 'object') return pageItem
            // Always return a valid blank object if not found
            return { id: id.value, title: '', body: '', tag: tag.value || '' }
        }
        // On client/dev, always use the store for both pool and page items
        const poolState = poolStore.pool || {}
        if (poolState && poolState[id.value]) {
            return poolState[id.value]
        }
        if (pages.value && typeof pages.value === 'object' && pages.value[id.value]) {
            const runtimePage = pages.value[id.value]
            try {
                if (runtimePage && typeof runtimePage.body === 'string' && /<(?:pool-list|PoolList)\b/i.test(runtimePage.body)) {
                    const staticPage = getPageItem(id.value)
                    if (staticPage && typeof staticPage.body === 'string' && staticPage.body.length) return staticPage
                }
            } catch (e) {
                // if any error, fall back to runtimePage
            }
            return runtimePage
        }
        // If stores are not yet populated on client, fall back to static caches
        const poolItemClientFallback = getPoolItem(id.value)
        if (poolItemClientFallback && typeof poolItemClientFallback === 'object') return poolItemClientFallback
        const pageItemClientFallback = getPageItem(id.value)
        if (pageItemClientFallback && typeof pageItemClientFallback === 'object') return pageItemClientFallback
        // Always return a valid blank object if not found
        return { id: id.value, title: '', body: '', tag: tag.value || '' }
    } catch (e) {
        return { id: id.value || '', title: '', body: '', tag: tag.value || '' }
    }
})
const pageOrBlank = computed(() => {
    if (page.value && typeof page.value === 'object' && page.value !== false && page.value !== null) {
        return page.value
    }
    // Defensive: always return a blank object
    return { id: id.value || '', title: '', body: '', tag: tag.value || '' }
})



watch(page, (p) => {
    if (p && typeof p === 'object' && p !== false && p !== null && typeof p.title === 'string') {
        if (typeof document !== 'undefined') document.title = p.title
        loading.value = false
    } else {
        if (typeof document !== 'undefined') document.title = 'Untitled Page'
        loading.value = true
    }
}, { immediate: true })


if (!import.meta.env.SSR) {
    const init = () => {
        loading.value = true
        const promises = []
        // Always fetch both page and pool item for this id
        if (id.value) {
            promises.push(pageStore.get(id.value))
            promises.push(poolStore.get(id.value))
        }
        if (tag.value) {
            promises.push(poolStore.getByTag(tag.value))
        }
        if (route.path === '/') {
            poolStore.getHomepage()
        }
        Promise.all(promises).then(() => {
            loading.value = false
            nextTick(() => {
                document.dispatchEvent(new Event('prerender-trigger'))
            })
        })
    }
    onMounted(() => {
        init()
    })
    // Re-run init on client-side route navigations that reuse this component
    watch(() => route.fullPath, (n, o) => {
        try { init() } catch (e) { }
    })
}

// --- Prev / Next helpers for pool items ---
const isDev = import.meta.env.DEV

function findPoolItemById(id) {
    if (!id) return null
    try {
        const storePool = poolStore && poolStore.pool ? poolStore.pool : {}
        if (storePool && storePool[id]) return storePool[id]
        // numeric keys might be strings; check values
        for (const k of Object.keys(storePool)) {
            const p = storePool[k]
            if (p && String(p.id) === String(id)) return p
        }
    } catch (e) { }
    return pool.find(p => String(p.id) === String(id)) || null
}

const currentPoolItem = computed(() => findPoolItemById(id.value))

const isPoolItem = computed(() => !!currentPoolItem.value)

const currentTag = computed(() => {
    if (tag.value) return tag.value
    if (currentPoolItem.value && Array.isArray(currentPoolItem.value.tags)) return currentPoolItem.value.tags[0]
    return null
})

function getPoolListForTag(t) {
    const storePool = poolStore && poolStore.pool ? poolStore.pool : {}
    const runtimeMap = {}
    for (const k of Object.keys(storePool)) {
        const it = storePool[k]
        if (!it) continue
        runtimeMap[String(it.id)] = it
    }

    if (!t) {
        // archive / untagged: use full static list, but let runtime override and prepend runtime-only items
        const staticList = pool.slice()
        const merged = staticList.map(s => runtimeMap[String(s.id)] ? runtimeMap[String(s.id)] : s)
        const runtimeOnly = Object.values(runtimeMap).filter(r => !merged.find(m => String(m.id) === String(r.id)))
        runtimeOnly.sort((a, b) => (b.date || 0) - (a.date || 0))
        return runtimeOnly.concat(merged)
    }

    // Filter static pool by tag, replace with runtime if available, and prepend runtime-only items
    const staticList = pool.filter(p => Array.isArray(p.tags) && p.tags.includes(t))
    const merged = staticList.map(s => runtimeMap[String(s.id)] ? runtimeMap[String(s.id)] : s)
    const runtimeOnly = Object.values(runtimeMap).filter(r => Array.isArray(r.tags) && r.tags.includes(t) && !merged.find(m => String(m.id) === String(r.id)))
    runtimeOnly.sort((a, b) => (b.date || 0) - (a.date || 0))
    return runtimeOnly.concat(merged)
}

function buildPoolItemUrl(item, tagParam) {
    if (!item) return '#'
    if (!tagParam) {
        return `/archive/${item.slug}.html`
    }
    const routeForTag = routes.find(r => r.tag === tagParam)
    if (routeForTag && routeForTag.path) {
        const p = String(routeForTag.path).replace(/^\//, '').replace(/\/$/, '')
        return `/${p}/${item.slug}/`
    }
    // fallback
    return `/${tagParam}/${item.slug}/`
}

const poolListForCurrent = computed(() => getPoolListForTag(currentTag.value))
const currentIndex = computed(() => {
    if (!currentPoolItem.value) return -1
    return poolListForCurrent.value.findIndex(i => String(i.id) === String(currentPoolItem.value.id))
})
const prevItem = computed(() => (currentIndex.value > 0 ? poolListForCurrent.value[currentIndex.value - 1] : null))
const nextItem = computed(() => ((currentIndex.value >= 0 && currentIndex.value < poolListForCurrent.value.length - 1) ? poolListForCurrent.value[currentIndex.value + 1] : null))

// Touch / keyboard navigation
const touchStartX = ref(0)
function touchStart(e) {
    touchStartX.value = e.touches && e.touches[0] ? e.touches[0].clientX : 0
}
function touchEnd(e) {
    const t = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0
    const diff = t - touchStartX.value
    const threshold = 50
    if (diff > threshold && prevItem.value) {
        router.push(buildPoolItemUrl(prevItem.value, currentTag.value))
    } else if (diff < -threshold && nextItem.value) {
        router.push(buildPoolItemUrl(nextItem.value, currentTag.value))
    }
}

function keyEventWatcher(e) {
    try {
        if (document && document.activeElement && document.activeElement.tagName === 'BODY') {
            if (e.key === 'ArrowLeft' && prevItem.value) router.push(buildPoolItemUrl(prevItem.value, currentTag.value))
            if (e.key === 'ArrowRight' && nextItem.value) router.push(buildPoolItemUrl(nextItem.value, currentTag.value))
        }
    } catch (er) {
        // swallow
    }
}

onMounted(() => {
    if (typeof document !== 'undefined') document.addEventListener('keydown', keyEventWatcher)
})

onBeforeUnmount(() => {
    if (typeof document !== 'undefined') document.removeEventListener('keydown', keyEventWatcher)
})
</script>

<style lang="scss">
.heros {
    a {
        border: none;
    }

    a:hover {
        border: none;
    }

    img {
        width: 100%;
    }
}

.pool-nav {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1em;

    a {
        color: inherit;
        text-decoration: none;
    }
}

.npnav {
    margin-left: -4em;
    width: 4em;
    float: left;
}

.npnav .nav {
    transition: all 1s;
}

.npnav a {
    background-color: #CCC;
    border: none;
    border-radius: 50%;
    color: #FFF;
    display: inline-block;
    font-family: monospace;
    font-weight: 700;
    height: 1.5em;
    line-height: 1.5em;
    margin: 0 .25em .25em;
    text-align: center;
    width: 1.5em;
}

.npnav a:hover {
    background-color: #333;
    border: none;
}

.npnav .npbtn {
    font-size: 1.2em
}

.npnav .npbtn.disabled {
    opacity: 0.28;
    pointer-events: none;
    background-color: #ddd;
    color: #999;
}

.pageimage {
    text-align: center;
    max-height: 100vh;
}

@media screen and (max-width: 600px) {
    .pageimage {
        margin-left: -1em;
        margin-right: -1em;
    }
}

.pageimage img {
    max-height: 100vh;
    max-width: 100%;
    box-shadow: 3px 3px 5px rgba(0, 0, 0, 0.3);
}
</style>
