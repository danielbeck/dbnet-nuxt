<template>
    <div>
        <h1>404</h1>
        Route not found
        {{ $route.path }}
    </div>
</template>
<script setup>
import { onMounted, nextTick } from 'vue'

onMounted(() => {
    nextTick(() => {
        document.dispatchEvent(new Event('prerender-trigger'))
    })
})
</script>
