<template>
    <div>
        <template v-if="loading">
            <ClientOnly>
                <Loading />
            </ClientOnly>
        </template>
        <div v-else>
            <PageShell :title="pageOrBlank.title" :image="pageOrBlank.img" :imageAlt="'Photo of ' + pageOrBlank.title">
                <template #admin>
                    <AdminControls :currentUser="currentUser" :isPoolItem="false" :pageId="pageOrBlank.id" />
                </template>
                <template #content>
                    <CompiledContent :input="pageOrBlank.body" />
                </template>
            </PageShell>
        </div>
    </div>
</template>

<script setup>
import { computed, watch, onBeforeMount, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'
import { usePageStore } from '@/stores/page'
import { usePoolStore } from '@/stores/pool'
import { useUserStore } from '@/stores/user'
let pagesCache = []
if (import.meta.env.SSR) {
    try {
        const fs = await import('fs')
        const path = await import('path')
        const raw = fs.readFileSync(path.resolve('.cache/pages.json'), 'utf8')
        pagesCache = JSON.parse(raw)
    } catch (e) {
        pagesCache = []
    }
} else {
    pagesCache = []
}
import CompiledContent from '@/components/CompiledContent.vue'
// EditPage/EditPool are provided via AdminControls
import Loading from '@/components/Loading.vue'
import PageShell from '@/components/PageShell.vue'
import AdminControls from '@/components/AdminControls.vue'

const pageStore = usePageStore()
const poolStore = usePoolStore()
const userStore = useUserStore()
const route = useRoute()

const pages = computed(() => pageStore.page)
const currentUser = computed(() => userStore.currentUser)

// Start `loading` as false on SSR but true on client so initial client-side
// navigations show the loading UI instead of flashing "Not Found".
const loading = ref(import.meta.env.SSR ? false : true)

// Home page id is 'Home' per routes
const getPageItem = (id) => pagesCache.find(p => String(p.id) === String(id)) || null
const page = computed(() => {
    // Prefer runtime store when present. If the runtime page body still contains
    // <pool-list> placeholders (not yet expanded), prefer the on-disk static
    // cache so client initial render matches SSR and we don't replace expanded
    // HTML with placeholder-only markup.
    const staticItem = getPageItem('Home')
    if (pages.value && pages.value['Home']) {
        const runtimePage = pages.value['Home']
        try {
            if (runtimePage && typeof runtimePage.body === 'string' && /<(?:pool-list|PoolList)\b/i.test(runtimePage.body)) {
                if (staticItem && typeof staticItem === 'object') return staticItem
            }
        } catch (e) { }
        return runtimePage
    }
    if (staticItem && typeof staticItem === 'object') return staticItem
    return { id: 'Home', title: '', body: '', tag: '' }
})
const pageOrBlank = computed(() => page.value && typeof page.value === 'object' ? page.value : { id: 'Home', title: '', body: '', tag: '' })

const isSSR = import.meta.env.SSR

watch(page, (p) => {
    if (p && p.title) {
        if (typeof document !== 'undefined') document.title = p.title
    }
}, { immediate: true })

const init = () => {
    loading.value = true
    const promises = []
    promises.push(pageStore.get('Home'))
    // Ensure homepage pool data is requested on client so interactive fragments can hydrate
    if (route.path === '/') {
        promises.push(poolStore.getHomepage())
    }
    Promise.all(promises).then(() => {
        loading.value = false
        nextTick(() => {
            if (typeof document !== 'undefined') document.dispatchEvent(new Event('prerender-trigger'))
        })
    }).catch(() => {
        loading.value = false
    })
}

onBeforeMount(() => {
    init()
})

// Re-run init on client-side navigations to the home route
watch(() => route.fullPath, (n, o) => {
    try { init() } catch (e) { }
})
</script>
