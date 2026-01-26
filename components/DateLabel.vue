<template>
    <div v-if="text" class="label">{{ text }}</div>
</template>

<script setup>
import { computed } from 'vue'
import { formatDate } from '@/helpers'
const props = defineProps({ date: [Number, String, Date], fmt: { type: String, default: 'human' } })
const text = computed(() => {
    if (!props.date) return ''
    try { return formatDate(props.date, props.fmt) } catch (e) { return '' }
})
</script>

<style scoped>
.label {
    font-family: 'Asap';
    font-style: italic;
    font-size: 0.7em;
    vertical-align: bottom;
    opacity: 0.7;
}
</style>
