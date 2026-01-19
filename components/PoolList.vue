<template>
    <div>
        <Loading v-if="!isSSR && poolList.length === 0" />
        <div v-else>
            <PoolListGrid v-if="type === 'image'" :list="poolList" />
            <div v-if="!type || type === 'list'">
                <div v-for="p in poolList" :key="p.id" class="flex">
                    <div class="label">
                        <span v-if="p.hasNewDate">{{ formatDate(p.date, 'mmmm d, yyyy') }}: </span>
                    </div>
                    <div class="content">
                        <NuxtLink :to="p.path"><span v-html="p.title"></span></NuxtLink>
                    </div>
                </div>
            </div>
            <div v-if="type === 'summary'">
                <div v-for="p in poolList" :key="p.id" class="flex">
                    <div class="label">{{ formatDate(p.date, 'mmmm d, yyyy') }}: </div>
                    <div class="content">
                        <NuxtLink :to="p.path"><span v-html="p.title"></span></NuxtLink>
                        <div>{{ truncate(stripFootnotes(p.body), 150) }}</div>
                    </div>
                </div>
                <hr />
            </div>
        </div>
    </div>
</template>


<script setup>
import { onMounted, computed } from 'vue'
import { usePoolStore } from '@/stores/pool'
import PoolListGrid from '@/components/PoolListGrid.vue'
import Loading from '@/components/Loading.vue'
import { formatDate, truncate } from '@/helpers'
import { stripFootnotes } from '@/helpers/stripFootnotes.js'


const props = defineProps({
    tag: String,      // tag to be listed
    type: String,     // image, summary, or list (default)
    limit: String,    // if number, show that many items. if array of 2 numbers, start/end. use * for "all"
    sort: String,     // desc (default), asc
    path: String      // prepend this path onto the router link
})

const poolStore = usePoolStore()
onMounted(() => {
    if (props.tag && props.tag.trim() !== '') {
        poolStore.getByTag(props.tag.trim())
    } else {
        poolStore.getAll()
    }
})
const pool = computed(() => poolStore.pool)

const sameDay = (d1, d2) => {
    return formatDate(d1, 'yymmdd') === formatDate(d2, 'yymmdd')
}

import staticPool from '../.cache/pool.json'

const isSSR = import.meta.env.SSR

const poolList = computed(() => {
    // Build source items from either runtime store or static cache.
    // On SSR we prefer the static cache so generated HTML contains content.
    const ourTags = props.tag ? props.tag.trim().split(',') : []
    const hasTagsInCommon = (arr1, arr2) => {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false
        return arr1.some(arrElement => arr2.includes(arrElement))
    }

    let sourceItems = []
    try {
        const runtimeMap = pool.value || {}
        const runtimeKeys = Object.keys(runtimeMap)
        if (isSSR || runtimeKeys.length === 0) {
            sourceItems = Array.isArray(staticPool) ? staticPool.slice() : Object.values(staticPool)
        } else {
            // Merge runtime (client) overrides into static list, and prepend runtime-only items
            const staticArr = Array.isArray(staticPool) ? staticPool : Object.values(staticPool)
            const runtimeById = {}
            for (const k of runtimeKeys) {
                const it = runtimeMap[k]
                if (it) runtimeById[String(it.id)] = it
            }
            const merged = staticArr.map(s => runtimeById[String(s.id)] ? runtimeById[String(s.id)] : s)
            const runtimeOnly = Object.values(runtimeById).filter(r => !merged.find(m => String(m.id) === String(r.id)))
            runtimeOnly.sort((a, b) => (b.date || 0) - (a.date || 0))
            sourceItems = runtimeOnly.concat(merged)
        }
    } catch (e) {
        sourceItems = Array.isArray(staticPool) ? staticPool.slice() : []
    }

    // Filter by tag and map to clone objects with computed path
    let ret = []
    for (const item of sourceItems) {
        if (!item) continue
        if (ourTags.length === 0 || hasTagsInCommon(item.tags, ourTags)) {
            const clone = { ...item }
            clone.path = props.path ? props.path + clone.slug + '.html' : clone.slug + '.html'
            ret.push(clone)
        }
    }

    // Sort
    ret = ret.sort((a, b) => {
        if (props.sort === 'asc') return a.date - b.date
        return b.date - a.date
    })

    // Mark hasNewDate
    for (let i = 0; i < ret.length; i++) {
        if (i === 0 || !sameDay(ret[i].date, ret[i - 1].date)) ret[i].hasNewDate = true
    }

    // Apply limit parsing
    const parseLimit = (limit) => {
        if (!limit) return null
        if (limit === '*') return Infinity
        const cleaned = limit.replace(/[\[\]]/g, '')
        if (cleaned.includes(',')) {
            const parts = cleaned.split(',')
            const start = parseInt(parts[0], 10)
            const end = parts[1] === '*' ? Infinity : parseInt(parts[1], 10)
            return [start, end]
        }
        return parseInt(cleaned, 10)
    }
    const parsedlimit = parseLimit(props.limit)
    if (Array.isArray(parsedlimit)) {
        const endIndex = parsedlimit[1] === Infinity ? undefined : parsedlimit[1]
        ret = ret.slice(parsedlimit[0] - 1, endIndex)
    } else if (typeof parsedlimit === 'number' && isFinite(parsedlimit)) {
        ret = ret.slice(0, parsedlimit)
    }
    return ret
})
</script>

<style scoped lang="scss">
.flex {
    display: flex;
}

.flex .label {
    min-width: 140px;
    text-align: right;
    padding-right: 0.5em;
}
</style>
