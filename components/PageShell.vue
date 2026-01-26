<template>
    <div>
        <slot name="admin"></slot>
        <h1 v-if="title" v-html="title"></h1>
        <div v-if="$slots.date">
            <slot name="date" />
        </div>

        <div v-if="$slots.nav">
            <slot name="nav" />
        </div>

        <div v-bind="$attrs">
            <slot name="content" />

            <div v-if="image" class="pageimage">
                <img :src="image" :alt="imageAlt || ''" />
            </div>
        </div>
    </div>
</template>

<script setup>
const props = defineProps({
    title: String,
    image: String,
    imageAlt: String
})
</script>

<style scoped>
.pageimage {
    text-align: center;
    max-height: 100vh;
}

.pageimage img {
    max-height: 100vh;
    max-width: 100%;
    box-shadow: 3px 3px 5px rgba(0, 0, 0, 0.3);
}
</style>
