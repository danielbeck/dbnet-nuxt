<template>
    <div>
        <Loading v-if="page === false && !currentUser" />
        <div v-else>
            <EditPage v-if="currentUser" :id="pageOrBlank.id" />
            <EditPool v-if="currentUser" />
            <h1 v-html="pageOrBlank.title"></h1>
            <CompiledContent :input="pageOrBlank.body" />
        </div>
    </div>
</template>

<script setup>
import { computed, watch, onBeforeMount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { usePageStore } from '@/stores/page'
import { usePoolStore } from '@/stores/pool'
import { useUserStore } from '@/stores/user'
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
const page = computed(() => pages.value['Home'] || false)
const pageOrBlank = computed(() => page.value !== false ? page.value : { id: 'Home', title: '', body: '', tag: '' })

watch(page, (p) => {
    if (p && p.title) {
        document.title = p.title
    }
}, { immediate: true })

const init = () => {
    const promises = []
    promises.push(pageStore.get('Home'))
    Promise.all(promises).then(() => {
        nextTick(() => {
            document.dispatchEvent(new Event('prerender-trigger'))
        })
    })
}

onBeforeMount(() => {
    init()
})
</script>
