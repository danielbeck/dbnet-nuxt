<template>
    <div>
        <EditPool v-if="currentUser" :id="item.id" />
        <nav class="npnav">
            <div class="nav">
                <NuxtLink v-if="prevLink" :to="prevLink"
                    :aria-label="$route.meta.tag ? 'Previous page in ' + $route.meta.tag : 'Previous page'">&lt;
                </NuxtLink>
            </div>
            <div class="nav">
                <NuxtLink v-if="nextLink" :to="nextLink"
                    :aria-label="$route.meta.tag ? 'Next page in ' + $route.meta.tag : 'Next page'">&gt;</NuxtLink>
            </div>
        </nav>
        <div @touchstart="touchStart" @touchend="touchEnd">
            <h1 v-html="item.title"></h1>
            <div class="label">{{ formatDate(item.date, 'date') }}</div>
            <CompiledContent :input="item.body" />
            <div v-if="item.img" class="pageimage">
                <img :src="item.img" :alt="'Photo of ' + item.title" />
            </div>
        </div>
    </div>
</template>

<script setup>
import { useHead } from '#imports'
import { onMounted, watch as vueWatch } from 'vue'
import { ref, computed, watch, onBeforeMount, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePoolStore } from '@/stores/pool'
import { useUserStore } from '@/stores/user'
import EditPool from '@/components/EditPool.vue'
import CompiledContent from '@/components/CompiledContent.vue'
import { formatDate } from '@/helpers'

const props = defineProps({
    id: String,
    slug: String
})

const poolStore = usePoolStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const nextLink = ref(false)
const prevLink = ref(false)
const touchStartX = ref(0)

const pool = computed(() => poolStore.pool)
const currentUser = computed(() => userStore.currentUser)

const item = computed(() => {
    let itemId = props.id || Object.keys(pool.value).find(k => pool.value[k].slug === props.slug)
    return pool.value[itemId] || { title: '' }
})

useHead(() => {
    const slug = item.value && item.value.slug
    return {
        link: [
            {
                rel: 'canonical',
                href: slug
                    ? 'https://danielbeck.net/archive/' + slug + '.html'
                    : 'https://danielbeck.net/archive/'
            }
        ]
    }
})


watch(item, (p) => {
    if (p.title) {
        document.title = p.title
    }
    nextTick(() => {
        document.dispatchEvent(new Event('prerender-trigger'))
    })
}, { immediate: true })

const setNextPrev = () => {
    let sorted = Object.keys(pool.value)
    if (route.meta.tag) {
        sorted = sorted.filter((k) => pool.value[k].tags && pool.value[k].tags.includes(route.meta.tag))
    }
    sorted = sorted.sort((a, b) => pool.value[a].date - pool.value[b].date)
    let curIndex = sorted.indexOf(item.value.id)
    if (curIndex > -1) {
        if (curIndex < sorted.length - 1) {
            let nextId = sorted[curIndex + 1]
            if (pool.value[nextId]) {
                nextLink.value = pool.value[nextId].slug + '.html#body'
            }
        }
        if (curIndex > 0) {
            let prevId = sorted[curIndex - 1]
            if (pool.value[prevId]) {
                prevLink.value = pool.value[prevId].slug + '.html#body'
            }
        }
    }
}

const keyEventWatcher = (e) => {
    if (document.activeElement.tagName !== 'BODY') return
    if (prevLink.value && e.key === "ArrowLeft") {
        router.push(prevLink.value)
    }
    if (nextLink.value && e.key === "ArrowRight") {
        router.push(nextLink.value)
    }
}

const touchStart = (e) => {
    touchStartX.value = e.touches[0].clientX
}

const touchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchEndX - touchStartX.value
    const threshold = 50
    if (diff > threshold && prevLink.value) {
        router.push(prevLink.value)
    } else if (diff < -threshold && nextLink.value) {
        router.push(nextLink.value)
    }
}

watch(pool, () => {
    setNextPrev()
})

onBeforeMount(() => {
    if (props.id || props.slug) {
        poolStore.get(props.id || props.slug)
    }
    setNextPrev()
    if (route.meta.tag) {
        poolStore.getByTag(route.meta.tag)
    }
    document.addEventListener("keydown", keyEventWatcher)
})

onBeforeUnmount(() => {
    document.removeEventListener("keydown", keyEventWatcher)
})
</script>

<style>
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

.npnav {
    margin-left: -3em;
    width: 4em;
    position: absolute;
}

.npnav .nav {
    transition: all 1s;
}

.npnav a {
    font-family: monospace;
    width: 1.5em;
    height: 1.5em;
    line-height: 1.5em;
    border-radius: 50%;
    margin: 0 0.25em 0.25em;
    display: inline-block;
    text-align: center;
    background-color: #CCC;
    border: none;
    color: #FFF;
    font-weight: bold;
}

.npnav a:hover {
    border: none;
    background-color: #333;
}
</style>
