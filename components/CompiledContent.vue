<template>
    <div ref="root" class="compiled-content-root">
        <template v-for="(part, idx) in parts" :key="idx">
            <div v-html="part.html"></div>
        </template>
    </div>
</template>

<script setup>
import { computed, defineComponent, h, ref, onMounted, onBeforeUnmount, createVNode, render, getCurrentInstance } from 'vue'
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
import applescript from 'highlight.js/lib/languages/applescript'
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
hljs.registerLanguage('applescript', applescript)

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
const mountedPlaceholders = []
const attachedListeners = []
const staticHoverListeners = []

function decodeBase64(s) {
    try {
        if (typeof atob !== 'undefined') return decodeURIComponent(escape(atob(s)))
        if (typeof Buffer !== 'undefined') return Buffer.from(s, 'base64').toString('utf8')
    } catch { }
    return s
}

onMounted(() => {
    if (!root.value) return
    const instance = getCurrentInstance()

    // mount footnote placeholders using parent app context so they resolve plugins
    const placeholders = root.value.querySelectorAll('.footnote-placeholder')
    placeholders.forEach((el) => {
        const num = parseInt(el.getAttribute('data-number') || '0', 10)
        const encoded = el.getAttribute('data-content') || ''
        const content = decodeBase64(encoded)
        const vnode = createVNode(Footnote, { number: num, content })
        if (instance && instance.appContext) vnode.appContext = instance.appContext
        render(vnode, el)
        mountedPlaceholders.push({ el })
    })

    // mount compiled component placeholders (Highlight, PoolList, etc.) with parent app context
    const compiledPlaceholders = Array.from(root.value.querySelectorAll('[data-component]'))
    console.log('[CompiledContent] found placeholders:', compiledPlaceholders.length)
    compiledPlaceholders.forEach((el, i) => {
        try {
            const name = el.getAttribute('data-component')
            const propsEncoded = el.getAttribute('data-props') || ''
            const propsStr = decodeBase64(propsEncoded) || '{}'
            const props = JSON.parse(propsStr)
            let comp = null
            if (name === 'Highlight') comp = Highlight
            else if (name === 'PoolList') comp = PoolList
            else if (name === 'Footnote') comp = Footnote
            console.log('[CompiledContent] mounting placeholder', i, name, props)
            if (comp) {
                const vnode = createVNode(comp, props)
                if (instance && instance.appContext) vnode.appContext = instance.appContext
                render(vnode, el)
                try { el.setAttribute('data-mounted', '1') } catch (e) { }
                mountedPlaceholders.push({ el })
            }
        } catch (e) {
            console.warn('[CompiledContent] failed to mount placeholder', i, e && e.message ? e.message : e, el)
        }
    })

    // Attach SPA click handlers if a router is available
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

    // Progressive enhancement for pre-rendered image grids: attach hover handlers
    try {
        const grids = root.value.querySelectorAll('.imagegrid .grid')
        grids.forEach((el) => {
            const hover = (e) => {
                try {
                    window.clearTimeout(el.timeout)
                    const cur = document.__db_curHover
                    if (cur && el.offsetTop !== cur.offsetTop) {
                        cur.classList.remove('hover')
                    }
                    el.classList.add('hover')
                    document.__db_curHover = el
                } catch (er) { }
            }
            const unhover = (e) => {
                el.timeout = window.setTimeout(() => {
                    try { el.classList.remove('hover') } catch (er) { }
                    delete el.timeout
                }, 500)
            }
            el.addEventListener('mouseenter', hover)
            el.addEventListener('mouseleave', unhover)
            staticHoverListeners.push({ el, hover, unhover })
        })
    } catch (e) {
        // ignore
    }
})

onBeforeUnmount(() => {
    mountedPlaceholders.forEach(({ el }) => { try { render(null, el) } catch (e) { } })
    mountedPlaceholders.length = 0
    // remove any attached SPA click listeners
    attachedListeners.forEach(({ el, onClick }) => {
        try { el.removeEventListener('click', onClick) } catch (e) { }
    })
    attachedListeners.length = 0
    // remove hover listeners attached to pre-rendered image grids
    staticHoverListeners.forEach(({ el, hover, unhover }) => {
        try { el.removeEventListener('mouseenter', hover) } catch (e) { }
        try { el.removeEventListener('mouseleave', unhover) } catch (e) { }
    })
    staticHoverListeners.length = 0
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

    // If the processed HTML already contains expanded markup (no <pool-list> or <highlightjs> tags),
    // return it as a single HTML part so SSR output remains unchanged and hydration matches.
    if (!/<(?:pool-list|PoolList)\b/i.test(processed) && !/<highlightjs\b/i.test(processed)) {
        return [{ type: 'html', html: processed }]
    }

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
            // parse attributes robustly (supports quoted and unquoted values and :/@ prefixes)
            const props = {}
            if (open && open[1]) {
                const attrRe = /([:@]?[a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^"'\s>]+))/g
                let am
                while ((am = attrRe.exec(open[1]))) {
                    const name = am[1].replace(/^[:@]/, '')
                    const val = am[2] || am[3] || am[4] || ''
                    props[name] = val
                }
            }
            const num = props.number ? Number(props.number) : 0
            parts.push({ type: 'html', html: `<span class="footnote-placeholder" data-number="${num}" data-content="${encodeBase64(inner)}"></span>` })
        } else if (/^<(?:pool-list|PoolList)/i.test(match)) {
            const open = match.match(/^<(?:pool-list|PoolList)\b([^>]*)>/i)
            let attrs = open && open[1] ? open[1] : ''
            // parse attributes into props (supports quoted and unquoted values)
            const props = {}
            const attrRe = /([:@]?[a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^"'\s>]+))/g
            let am
            while ((am = attrRe.exec(attrs))) {
                const name = am[1]
                const val = am[2] || am[3] || am[4] || ''
                const cleanName = name.replace(/^[:@]/, '')
                props[cleanName] = val
            }
            parts.push({ type: 'html', html: `<div class="compiled-placeholder" data-component="PoolList" data-props="${encodeBase64(JSON.stringify(props))}"></div>` })
        } else {
            // highlightjs
            const open = match.match(/^<highlightjs\b([^>]*)>/i)
            const inner = match.replace(/^<highlightjs\b[^>]*>/i, '').replace(/<\/highlightjs>$/i, '')
            const props = {}
            if (open && open[1]) {
                const attrRe = /([:@]?[a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^"'\s>]+))/g
                let am
                while ((am = attrRe.exec(open[1]))) {
                    const name = am[1].replace(/^[:@]/, '')
                    const val = am[2] || am[3] || am[4] || ''
                    props[name] = val
                }
            }
            if (!props.language) props.language = 'javascript'
            if (!props.encoded && inner) props.encoded = encodeBase64(inner)
            parts.push({ type: 'html', html: `<div class="compiled-placeholder" data-component="Highlight" data-props="${encodeBase64(JSON.stringify(props))}"></div>` })
        }
        lastIndex = re.lastIndex
    }
    if (lastIndex < processed.length) parts.push({ type: 'html', html: processed.slice(lastIndex) })
    return parts
}

const parts = computed(() => parseParts(props.input || ''))
</script>
