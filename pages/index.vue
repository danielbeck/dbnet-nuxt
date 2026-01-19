<template>
    <div>
        <template v-if="!isSSR && page === false && !currentUser">
            <ClientOnly>
                <Loading />
            </ClientOnly>
        </template>
        <div v-else>
            <EditPage v-if="currentUser" :id="pageOrBlank.id" />
            <EditPool v-if="currentUser" />
            <h1 v-html="pageOrBlank.title"></h1>
            <!-- Render raw HTML during SSR so static output contains the page text for indexing -->
            <div v-if="isSSR" v-html="pageOrBlank.body"></div>
            <!-- On client, mount interactive components via CompiledContent -->
            <ClientOnly v-else>
                <CompiledContent :input="pageOrBlank.body" />
            </ClientOnly>
        </div>
    </div>
</template>

<script setup>
import { computed, watch, onBeforeMount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { usePageStore } from '@/stores/page'
import { usePoolStore } from '@/stores/pool'
import { useUserStore } from '@/stores/user'
import pagesCache from '../.cache/pages.json'
import CompiledContent from '@/components/CompiledContent.vue'
import EditPage from '@/components/EditPage.vue'
import EditPool from '@/components/EditPool.vue'
import Loading from '@/components/Loading.vue'

const pageStore = usePageStore()
const poolStore = usePoolStore()
const userStore = useUserStore()
const route = useRoute()

const pages = computed(() => pageStore.page)
const currentUser = computed(() => userStore.currentUser)

// Home page id is 'Home' per routes
const getPageItem = (id) => pagesCache.find(p => String(p.id) === String(id)) || null
const page = computed(() => {
    // During SSR, prefer the on-disk static cache so prerender output contains the page text
    if (import.meta.env.SSR) {
        const staticItem = getPageItem('Home')
        if (staticItem && typeof staticItem === 'object') return staticItem
        // prefer runtime store if present, otherwise return a blank object (never `false`)
        return pages.value['Home'] || { id: 'Home', title: '', body: '', tag: '' }
    }
    return pages.value['Home'] || { id: 'Home', title: '', body: '', tag: '' }
})
const pageOrBlank = computed(() => page.value && typeof page.value === 'object' ? page.value : { id: 'Home', title: '', body: '', tag: '' })

const isSSR = import.meta.env.SSR

watch(page, (p) => {
    if (p && p.title) {
        if (typeof document !== 'undefined') document.title = p.title
    }
}, { immediate: true })

const init = () => {
    const promises = []
    promises.push(pageStore.get('Home'))
    // Ensure homepage pool data is requested on client so interactive fragments can hydrate
    if (route.path === '/') {
        poolStore.getHomepage()
    }
    Promise.all(promises).then(() => {
        nextTick(() => {
            if (typeof document !== 'undefined') document.dispatchEvent(new Event('prerender-trigger'))
        })
    })
}

onBeforeMount(() => {
    init()
})
</script>
