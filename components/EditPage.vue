<template>
    <div>
        <button v-if="currentUser" @click="edit = !edit">Edit Page</button>
        <div v-if="edit" class="modal">
            <label><span class="label">ID:</span> <input disabled type="text" v-model="editpage.id"></label>
            <label><span class="label">Title:</span> <input type="text" v-model="editpage.title"></label>
            <label><span class="label">Format:</span>
                <select v-model="editpage.format">
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                </select>
            </label>
            <label>
                <span class="label">
                    Body:<br>
                    <button v-if="editpage.format === 'html'" @click="fixHtml">Fix HTML</button>
                </span>
                <textarea v-model="editpage.body"></textarea></label>

            <label><span class="label">Tag:</span> <input type="text" v-model="editpage.tag"></label>

            <button @click="save">Save</button>
            <button @click="cancel">Cancel</button>
        </div>
    </div>


</template>

<script setup>
import { ref, computed, watch, onBeforeMount } from 'vue'
import { usePageStore } from '@/stores/page'
import { useUserStore } from '@/stores/user'
import { markdownToHtml, detectContentFormat, smartquotes, fixHtmlString } from '@/helpers/index.js'

const props = defineProps(['id'])

const pageStore = usePageStore()
const userStore = useUserStore()

const edit = ref(false)
const editpage = ref({
    id: '',
    title: '',
    body: '',
    tag: '',
    format: 'markdown',
})

const pages = computed(() => pageStore.page)
const currentUser = computed(() => userStore.currentUser)
const page = computed(() => pages.value[props.id] || null)

// If the page does not exist, allow editing/creating it
function resetEditPage() {
    if (page.value) {
        // Use helper to detect format
        const detectedFormat = page.value.format || detectContentFormat(page.value.body);
        editpage.value = {
            id: props.id,
            title: page.value.title || '',
            body: page.value.body || '',
            tag: page.value.tag || '',
            format: detectedFormat,
        };
    } else {
        // New page: empty fields
        editpage.value = {
            id: props.id,
            title: '',
            body: '',
            tag: '',
            format: 'markdown',
        };
    }
}

// Always allow editing, even if page does not exist
watch(page, resetEditPage, { immediate: true })

function save() {
    const dataToSave = { ...editpage.value };
    // Apply smartquotes to title and body
    dataToSave.title = smartquotes(dataToSave.title);
    dataToSave.body = smartquotes(dataToSave.body);
    if (dataToSave.format === 'markdown') {
        dataToSave.body = markdownToHtml(dataToSave.body);
    }
    pageStore.edit(dataToSave);
    edit.value = false;
}

function cancel() {
    resetEditPage();
    edit.value = false;
}

function fixHtml() {
    if (editpage.value.format !== 'html') return;
    try {
        editpage.value.body = fixHtmlString(editpage.value.body);
    } catch (e) {
        alert(e.message);
    }
}

onBeforeMount(() => {
    pageStore.get(props.id);
})
</script>

<style></style>
