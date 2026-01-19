<template>
    <xmp id="RSS" ref="rss">
        <!-- 
      this is the most ass-backwards way to generate an RSS feed you've ever heard of, I promise.
      Vue templates aren't designed to output anything other than HTML, so all the rss tags want to be components;
      instead of messing with that I just generate it as a string and force it into the dom.
      also this will all wind up inside the router view. See vue.config.js prerender's postprocess, which will remove that.
      This should have been built as a completely separate script outside of vue.
    -->
    </xmp>
</template>

<script setup>
import { computed, onBeforeMount, getCurrentInstance } from 'vue'
import { useRoute } from 'vue-router'
import { usePoolStore } from '@/stores/pool'
import { formatDate } from '@/helpers'

const poolStore = usePoolStore()
const route = useRoute()
const instance = getCurrentInstance()

const pool = computed(() => poolStore.pool)

const filterFeed = (id) => {
    const tags = pool.value[id]?.tags
    if (!tags) return false
    if (route.meta.filter) {
        return tags.includes(route.meta.filter)
    } else {
        return tags.includes("blog") || tags.includes("geek") || tags.includes("photos")
    }
}

const renderReady = () => {
    let ret = `<rss version="2.0"><channel><title>Danielbeck.net</title><link>//danielbeck.net</link><description>Your source for all things Daniel and Beck</description>`
    let feedkeys = Object.keys(pool.value)
        .filter(filterFeed)
        .sort((a, b) => {
            return pool.value[b].date - pool.value[a].date
        })
        .slice(0, 25)
    for (let k of feedkeys) {
        let p = pool.value[k]
        if (!p || !p.tags) continue
        ret += '<item>'
        ret += '<pubDate>' + formatDate(p.date, 'ddd, dd mmm yyyy HH:MM:ss o') + '</pubDate>'
        ret += '<title>' + p.title + '</title>'
        let url = ""
        if (p.tags.includes("blog")) {
            url = '//danielbeck.net/blog/' + k + '.html'
        }
        if (p.tags.includes("geek")) {
            url = '//danielbeck.net/geek/' + k + '.html'
        }
        if (p.tags.includes("photos")) {
            url = '//danielbeck.net/photos/archive/' + k + '.html'
        }
        ret += '<link>' + url + '</link><guid isPermaLink="true">' + url + '</guid>'
        ret += '<source url="//danielbeck.net">Syndicated from danielbeck.net</source>'
        let bodytext = p.body || ''
        if (p.img) {
            bodytext += '<img src="//danielbeck.net' + p.img + '">'
        }
        ret += '<description><![CDATA[' + bodytext + ']]></description></item>'
    }
    ret += '</channel></rss>'
    instance.proxy.$el.innerText = ret
    document.dispatchEvent(new Event('prerender-trigger'))
}

const init = () => {
    poolStore.getAll()
    document.addEventListener('pool-getAll', renderReady, { once: true })
}

onBeforeMount(() => {
    init()
})
</script>
