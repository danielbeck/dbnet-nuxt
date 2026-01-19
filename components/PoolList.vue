<template>
    <div>
        <Loading v-if="poolList.length === 0" />
        <div v-else>
            <PoolListGrid v-if="type === 'image'" :list="poolList" />
            <div v-if="!type || type === 'list'">
                <div v-for="p in poolList" :key="p.id" class="flex">
                        <div class="label">
                            <span v-if="p.hasNewDate">{{ formatDate(p.date, 'mmmm d, yyyy') }}: </span>
                        </div>
                        <div class="content">
                            <NuxtLink v-if="isClient" :to="p.path"><span v-html="p.title"></span></NuxtLink>
                            <a v-else :href="p.path"><span v-html="p.title"></span></a>
                        </div>
                    </div>
            </div>
            <div v-if="type === 'summary'">
                <div v-for="p in poolList" :key="p.id" class="flex">
                    <div class="label">{{ formatDate(p.date, 'mmmm d, yyyy') }}: </div>
                    <div class="content">
                        <NuxtLink v-if="isClient" :to="p.path"><span v-html="p.title"></span></NuxtLink>
                        <a v-else :href="p.path"><span v-html="p.title"></span></a>
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

const isClient = typeof window !== 'undefined'

const sameDay = (d1, d2) => {
    return formatDate(d1, 'yymmdd') === formatDate(d2, 'yymmdd')
}

const poolList = computed(() => {
    let ret = []
    const ourTags = props.tag ? props.tag.trim().split(',') : []
    const hasTagsInCommon = (arr1, arr2) => {
        if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false
        return arr1.some(arrElement => arr2.includes(arrElement))
    }
    for (let k in pool.value) {
        if (ourTags.length === 0 || hasTagsInCommon(pool.value[k].tags, ourTags)) {
            let clone = { ...pool.value[k] }
            clone.path = props.path ? props.path + clone.slug + '.html' : clone.slug + '.html'
            ret.push(clone)
        }
    }
    ret = ret.sort((a, b) => {
        if (props.sort === 'asc') {
            return a.date - b.date
        } else {
            return b.date - a.date
        }
    })
    for (let i = 0, len = ret.length; i < len; i++) {
        if (i === 0 || !sameDay(ret[i].date, ret[i - 1].date)) {
            ret[i].hasNewDate = true
        }
    }
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
