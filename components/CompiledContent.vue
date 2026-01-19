<template>
    <div ref="root" class="compiled-content-root">
        <template v-for="(part, idx) in parts" :key="idx">
            <div v-if="part.type === 'html'" v-html="part.html"></div>
            <component v-else-if="part.type === 'component'" :is="componentMap[part.name]" v-bind="part.props" />
        </template>
    </div>
</template>

<script setup>
import { computed, defineComponent, h, ref, onMounted, onBeforeUnmount, createApp } from 'vue'
import { useRouter } from 'vue-router'
import Footnote from '~/components/Footnote.vue'
import PoolList from '~/components/PoolList.vue'
import { preprocessFootnotes } from '~/helpers/footnote.js'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import php from 'highlight.js/lib/languages/php'
import perl from 'highlight.js/lib/languages/perl'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('json', json)
hljs.registerLanguage('php', php)
hljs.registerLanguage('perl', perl)

const Highlight = defineComponent({
    name: 'Highlight',
    props: { language: { type: String, default: 'javascript' }, encoded: String, code: String },
    setup(props, { slots }) {
        const getCode = () => {
            let raw = ''
            if (props.encoded) {
                try {
                    if (typeof atob !== 'undefined') {
                        raw = decodeURIComponent(escape(atob(props.encoded)))
                    } else if (typeof Buffer !== 'undefined') {
                        raw = Buffer.from(props.encoded, 'base64').toString('utf8')
                    } else {
                        raw = props.encoded
                    }
                } catch {
                    raw = props.encoded
                }
            } else if (props.code) {
                raw = props.code
            } else if (slots.default) {
                const nodes = slots.default()
                raw = nodes.map(n => (typeof n.children === 'string' ? n.children : '')).join('')
            }
            // sanitize HTML entities
            if (typeof document !== 'undefined') {
                const ta = document.createElement('textarea')
                ta.innerHTML = raw
                raw = ta.value
            }
            return raw
        }

        return () => {
            const code = getCode().trim()
            let highlighted = ''
            try {
                highlighted = hljs.highlight(code, { language: props.language }).value
            } catch {
                try { highlighted = hljs.highlightAuto(code).value } catch { highlighted = '' }
            }
            return h('pre', { style: 'white-space: pre-wrap; overflow-x: auto;' }, [
                h('code', { class: 'hljs', style: 'white-space: pre-wrap;', innerHTML: highlighted })
            ])
        }
    }
})

const props = defineProps({ input: String })
const root = ref(null)
const mountedApps = []
const attachedListeners = []

function decodeBase64(s) {
    try {
        if (typeof atob !== 'undefined') return decodeURIComponent(escape(atob(s)))
        if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8')
    } catch { }
    return s
}

onMounted(() => {
    if (!root.value) return
    const placeholders = root.value.querySelectorAll('.footnote-placeholder')
    placeholders.forEach((el) => {
        const num = parseInt(el.getAttribute('data-number') || '0', 10)
        const encoded = el.getAttribute('data-content') || ''
        const content = decodeBase64(encoded)
        const app = createApp(Footnote, { number: num, content })
        app.mount(el)
        mountedApps.push(app)
    })

    // Attach SPA click handlers if a router is available (call useRouter() in setup)
    try {
        const router = (() => { try { return useRouter() } catch { return null } })()
        if (router) {
            const linkPlaceholders = root.value.querySelectorAll('a.nuxtlink-ssr')
            linkPlaceholders.forEach((el) => {
                const encoded = el.getAttribute('data-nuxt-link-to') || ''
                const to = decodeBase64(encoded)
                const onClick = (ev) => {
                    if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return
                    ev.preventDefault()
                    try { router.push(to) } catch { window.location.href = el.getAttribute('href') || to }
                }
                el.addEventListener('click', onClick)
                attachedListeners.push({ el, onClick })
            })
        }
    } catch (e) {
        // router may be unavailable; fall back to normal anchors
    }
})

onBeforeUnmount(() => {
    mountedApps.forEach(a => a.unmount())
    mountedApps.length = 0
    // remove any attached SPA click listeners
    attachedListeners.forEach(({ el, onClick }) => {
        try { el.removeEventListener('click', onClick) } catch (e) { }
    })
    attachedListeners.length = 0
})

function encodeBase64(str) {
    try {
        if (typeof btoa !== 'undefined') return btoa(unescape(encodeURIComponent(str)))
        if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64')
    } catch { }
    return str
}

function parseParts(input) {
    const parts = []
    if (!input) return parts
    // preprocess footnotes first (converts to <Footnote :number="N">content</Footnote>)
    let processed = preprocessFootnotes(input)
    // Replace <router-link> and <nuxt-link> with plain anchors for SSR output
    processed = processed.replace(/<(?:router-link|nuxt-link)\b([^>]*)>([\s\S]*?)<\/(?:router-link|nuxt-link)>/gi, (m, attrs, inner) => {
        const tm = attrs.match(/:?to\s*=\s*(["']?)([^"'\s>]+)\1/i)
        const to = tm ? tm[2] : ''
        // keep href for static behavior, but add metadata/class for client SPA handling
        return `<a class="nuxtlink-ssr" data-nuxt-link-to="${encodeBase64(to)}" href="${to}">${inner}</a>`
    })
    // Replace Footnote components with inline placeholders so they remain inside paragraphs
    processed = processed.replace(/<Footnote\b([^>]*)>([\s\S]*?)<\/Footnote>/gi, (m, attrs, inner) => {
        let num = 0
        if (attrs) {
            const nm = attrs.match(/:number\s*=\s*"?(\d+)"?/) || attrs.match(/number\s*=\s*"?(\d+)"?/)
            if (nm) num = Number(nm[1])
        }
        return `<span class="footnote-placeholder" data-number="${num}" data-content="${encodeBase64(inner)}"></span>`
    })

    const re = /(<Footnote\b[\s\S]*?<\/Footnote>)|(<highlightjs[\s\S]*?<\/highlightjs>)|(<(?:pool-list|PoolList)\b[\s\S]*?<\/(?:pool-list|PoolList)>|<(?:pool-list|PoolList)\b[^>]*\/>)/gi
    let lastIndex = 0
    let m
    while ((m = re.exec(processed))) {
        const idx = m.index
        if (idx > lastIndex) {
            parts.push({ type: 'html', html: processed.slice(lastIndex, idx) })
        }
        const match = m[0]
        if (/^<Footnote/i.test(match)) {
            const open = match.match(/^<Footnote\b([^>]*)>/i)
            const inner = match.replace(/^<Footnote\b[^>]*>/i, '').replace(/<\/Footnote>$/i, '')
            let num = 0
            if (open && open[1]) {
                const nm = open[1].match(/:number\s*=\s*"?(\d+)"?/) || open[1].match(/number\s*=\s*"?(\d+)"?/)
                if (nm) num = Number(nm[1])
            }
            parts.push({ type: 'component', name: 'Footnote', props: { number: num, content: inner } })
        } else if (/^<(?:pool-list|PoolList)/i.test(match)) {
            const open = match.match(/^<(?:pool-list|PoolList)\b([^>]*)>/i)
            let attrs = open && open[1] ? open[1] : ''
            // parse common attrs like tag
            const props = {}
            const tagm = attrs.match(/:?tag\s*=\s*"?([^"\s>]+)"?/i)
            if (tagm) props.tag = tagm[1]
            // also accept data attributes or other simple string attrs if needed
            parts.push({ type: 'component', name: 'PoolList', props })
        } else {
            // highlightjs
            const open = match.match(/^<highlightjs(\b[^>]*)>/i)
            const inner = match.replace(/^<highlightjs\b[^>]*>/i, '').replace(/<\/highlightjs>$/i, '')
            let lang = 'javascript'
            if (open && open[1]) {
                const lm = open[1].match(/language\s*=\s*"?([^"\s>]+)"?/i)
                if (lm) lang = lm[1]
            }
            parts.push({ type: 'component', name: 'Highlight', props: { language: lang, encoded: encodeBase64(inner) } })
        }
        lastIndex = re.lastIndex
    }
    if (lastIndex < processed.length) parts.push({ type: 'html', html: processed.slice(lastIndex) })
    return parts
}

const parts = computed(() => parseParts(props.input || ''))

const componentMap = { Footnote, Highlight, PoolList }
</script>
