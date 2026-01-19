<template>
    <span class="footnote-indicator" @click.stop="show = !show" ref="indicator">
        <sup>[{{ number }}]</sup>
        <div v-if="show" class="footnote-popup" ref="popup">
            <template v-if="$slots.default">
                <slot />
            </template>
            <template v-else>
                <div v-html="content"></div>
            </template>
        </div>
    </span>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { computePosition, offset, flip, shift, size, autoUpdate } from '@floating-ui/dom'

const props = defineProps({
    number: { type: [Number, String], required: true },
    content: { type: String, default: '' }
})
const show = ref(false)
const indicator = ref(null)
const popup = ref(null)
const cleanupFloating = ref(null)

function handleClickOutside(event) {
    if (
        popup.value &&
        !popup.value.contains(event.target) &&
        indicator.value &&
        !indicator.value.contains(event.target)
    ) {
        show.value = false
    }
}

onMounted(() => {
    if (typeof document !== 'undefined') document.addEventListener('mousedown', handleClickOutside)
})

watch(show, (val) => {
    if (val) {
        setTimeout(() => {
            if (indicator.value && popup.value) {
                cleanupFloating.value = autoUpdate(indicator.value, popup.value, () => {
                    computePosition(indicator.value, popup.value, {
                        placement: 'bottom',
                        middleware: [
                            offset(4),
                            flip(),
                            shift({ padding: 8 }),
                            size({
                                apply({ availableWidth, elements }) {
                                    elements.floating.style.maxWidth = availableWidth + 'px'
                                }
                            })
                        ]
                    }).then(({ x, y }) => {
                        Object.assign(popup.value.style, {
                            left: x + 'px',
                            top: y + 'px',
                        })
                    })
                })
            }
        }, 0)
    } else if (cleanupFloating.value) {
        cleanupFloating.value()
        cleanupFloating.value = null
    }
})

onBeforeUnmount(() => {
    if (typeof document !== 'undefined') document.removeEventListener('mousedown', handleClickOutside)
    if (cleanupFloating.value) cleanupFloating.value()
})
</script>

<style scoped>
.footnote-indicator {
    cursor: pointer;
    position: relative;
    display: inline-block;
}

.footnote-indicator sup {
    vertical-align: text-top;
    font-size: 0.75em;
    line-height: 1;
}

.footnote-popup {
    position: absolute;
    background: #fff;
    border: 1px solid #EEDDCC;
    border-radius: 6px;
    padding: 0.5em 1em;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    font-size: smaller;
    z-index: 2;
    width: max-content;
    min-width: 200px;
    max-width: 90vw;
}
</style>
