<template>
    <div v-if="currentUser">
        <template v-if="isPoolItem">
            <EditPool :id="pageId" />
        </template>
        <template v-else>
            <EditPage :id="pageId" />
            <EditPool v-if="tag" :tag="tag" />
        </template>
    </div>
</template>

<script setup>
import EditPage from '@/components/EditPage.vue'
import EditPool from '@/components/EditPool.vue'
const props = defineProps({
    isPoolItem: { type: Boolean, default: false },
    pageId: { type: [String, Number], default: '' },
    tag: { type: String, default: '' },
    currentUser: { type: [Boolean, Object], default: false }
})
</script>
