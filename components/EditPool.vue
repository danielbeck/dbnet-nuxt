<template>
    <div>
        <button v-if="currentUser" @click="toggleEdit()">
            <template v-if="id">Edit pool item</template>
            <template v-if="!id">Add pool item</template>
        </button>

        <div v-if="edit" class="modal">
            <div v-if="errorMessage" class="error" style="color: red; margin-bottom: 1em;">{{ errorMessage }}</div>
            <label v-if="id"><span>ID:</span> <input type="text" disabled :value="id"></label>
            <label><span>Title:</span> <input type="text" v-model="editable.title"></label>
            <label><span>Slug:</span> <input type="text" v-model="editable.slug" @input="onSlugInput"></label>
            <label><span>Date:</span> <input type="datetime-local" v-model="editable.date"></label>
            <!-- Format selector -->
            <label><span>Format:</span>
                <select v-model="editable.format">
                    <option value="markdown">Markdown</option>
                    <option value="html">HTML</option>
                </select>
            </label>
            <label>
                <span>Body:<br>
                    <button v-if="editable.format === 'html'" @click="fixHtml">
                        Fix HTML
                    </button>
                </span>
                <textarea v-model="editable.body"></textarea>
            </label>

            <label v-for="(tag, i) in editable.tags" :key="i" style="display: flex; align-items: center; gap: 0.5em;">
                <span>{{ i === 0 ? 'Tags:' : '' }}</span>
                <input v-model="editable.tags[i]">
                <button type="button" @click="removeTag(i)" v-if="editable.tags.length > 1"
                    style="margin-left: 0.5em;">&times;</button>
            </label>
            <label><span></span><button @click="addTag">Add tag</button></label>
            <label>
                <span>Image:</span>
                <input type="file" accept="image/*" @change="onImageSelected">
            </label>
            <label><span>Image previews:</span>
                <div v-if="imagePreview" style="margin-top:0.5em;">
                    <img :src="imagePreview" alt="Preview" style="max-width:200px;max-height:200px;display:block;">
                </div>
                <div v-if="thumbnailPreview" style="margin-top:0.5em;">
                    <img :src="thumbnailPreview" alt="Thumbnail" style="width:150px;height:150px;object-fit:cover;">
                </div>

            </label>
            <!--
            <label><span>f:</span> <input type="text" v-model="editable.f"></label>
            <label><span>mm:</span> <input type="text" v-model="editable.mm"></label>
            <label><span>iso:</span> <input type="text" v-model="editable.iso"></label>
            <label><span>shutter:</span> <input type="text" v-model="editable.shutter"></label>
            -->
            <button @click="save">Save</button>
            <button v-if="id" @click="erase">Delete</button>
            <button @click="cancel">Cancel</button>
        </div>

    </div>


</template>

<script setup>
function removeTag(idx) {
    if (Array.isArray(editable.value.tags) && editable.value.tags.length > 1) {
        editable.value.tags.splice(idx, 1);
    }
}
import { ref, computed, watch, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePoolStore } from '@/stores/pool'
import { useUserStore } from '@/stores/user'
import { marked } from 'marked'
import { datetimeLocal, detectContentFormat, smartquotes, fixHtmlString } from '@/helpers/index.js'
import * as parse5 from 'parse5'

const props = defineProps({
    id: String,
    tag: String
})

const poolStore = usePoolStore()
const userStore = useUserStore()
const route = useRoute()
const router = useRouter()

const edit = ref(false)
const editable = ref({})
const errorMessage = ref('')
const slugManuallyEdited = ref(false)
const lastAutoSlug = ref('')

const pool = computed(() => poolStore.pool)
const currentUser = computed(() => userStore.currentUser)

const item = computed(() => {
    if (props.id) {
        // try direct lookup with prop as-is, then string form, then search by id value
        const byKey = pool.value[props.id] || pool.value[String(props.id)];
        if (byKey) return byKey;
        // fallback: search values for matching id
        const found = Object.values(pool.value).find(p => p && String(p.id) === String(props.id));
        return found || {};
    } else {
        // new item - build tags from current route and parent routes
        return {
            tags: getHierarchicalTags(),
            date: new Date(),
            format: 'markdown',
        }
    }
})

watch(() => editable.value.title, (newTitle) => {
    if (!edit.value) return;
    const autoSlug = generateSlug(newTitle);
    // Only auto-update if user hasn't manually edited the slug
    if (!slugManuallyEdited.value || editable.value.slug === lastAutoSlug.value) {
        editable.value.slug = autoSlug;
        lastAutoSlug.value = autoSlug;
        slugManuallyEdited.value = false;
    }
})

function getHierarchicalTags() {
    const currentPath = route.path;
    const routes = router.options.routes;
    const tags = [];

    // Find all routes that are ancestors of (or equal to) the current path
    // and collect their tags, starting with the current route's tag
    if (route.meta.tag) {
        tags.push(route.meta.tag);
    }

    // Look for parent routes by checking if current path starts with their path
    for (const r of routes) {
        if (r.meta && r.meta.tag &&
            r.path !== currentPath &&
            currentPath.startsWith(r.path) &&
            !tags.includes(r.meta.tag)) {
            tags.push(r.meta.tag);
        }
    }

    // Return at least one empty tag if none found
    return tags.length > 0 ? tags : [""];
}

function init() {
    poolStore.get(props.id)
}

async function toggleEdit() {
    edit.value = !edit.value;
    if (edit.value) {
        // If editing an existing item but it isn't loaded yet, wait for it to load
        if (props.id && (!item.value || !item.value.title)) {
            try {
                await poolStore.get(props.id)
            } catch (e) {
                // ignore
            }
        }
        const existingSlug = item.value && item.value.slug ? item.value.slug : '';
        // Use helper to detect format
        let detectedFormat = (item.value && item.value.format) ? item.value.format : detectContentFormat(item.value && item.value.body);
        // For a new item (no id), prefer the passed-in prop tag over route-derived tags
        const initialTags = props.id ? (Array.isArray(item.value && item.value.tags) ? [...item.value.tags] : [""]) : (props.tag ? [props.tag] : (Array.isArray(item.value && item.value.tags) ? [...item.value.tags] : [""]))
        editable.value = {
            id: props.id,
            title: item.value && item.value.title,
            slug: existingSlug,
            date: datetimeLocal(item.value && item.value.date),
            body: item.value && item.value.body,
            tags: initialTags,
            img: item.value && item.value.img,
            f: item.value && item.value.f,
            mm: item.value && item.value.mm,
            iso: item.value && item.value.iso,
            shutter: item.value && item.value.shutter,
            format: detectedFormat
        }
        // Show existing image in preview if present
        if (editable.value.img) {
            imagePreview.value = editable.value.img;
            // Optionally set thumbnailPreview too
            thumbnailPreview.value = editable.value.img.replace('_image', '_thumbnail');
        } else {
            imagePreview.value = '';
            thumbnailPreview.value = '';
        }
        // Track whether slug was already set (existing item) or should auto-generate (new item)
        slugManuallyEdited.value = !!existingSlug;
        lastAutoSlug.value = existingSlug;
    }
}

function generateSlug(title) {
    if (!title) return '';
    let baseSlug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')  // Remove punctuation
        .replace(/\s+/g, '-')       // Convert spaces to hyphens
        .replace(/-+/g, '-')        // Collapse multiple hyphens
        .replace(/^-|-$/g, '');     // Trim leading/trailing hyphens

    return makeSlugUnique(baseSlug);
}

function makeSlugUnique(baseSlug) {
    if (!baseSlug) return '';

    // Get all existing slugs from loaded pool items (excluding current item being edited)
    const existingSlugs = Object.values(pool.value)
        .filter(poolItem => String(poolItem.id) !== String(props.id))
        .map(poolItem => poolItem.slug)
        .filter(Boolean);

    // If no conflict, return as-is
    if (!existingSlugs.includes(baseSlug)) {
        return baseSlug;
    }

    // Find a unique suffix
    let counter = 2;
    while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
        counter++;
    }
    return `${baseSlug}-${counter}`;
}

function onSlugInput() {
    slugManuallyEdited.value = true;
}

function addTag() {
    if (editable.value.tags) {
        editable.value.tags.push("")
    } else {
        editable.value.tags = [""];
    }
}

function fixHtml() {
    if (editable.value.format !== 'html') return;
    try {
        editable.value.body = fixHtmlString(editable.value.body);
    } catch (e) {
        alert(e.message);
    }
}

const imagePreview = ref('');
const thumbnailPreview = ref('');
let selectedImageFile = null;

function onImageSelected(e) {
    const file = e.target.files[0];
    if (!file) return;
    selectedImageFile = file;
    const reader = new FileReader();
    reader.onload = function (ev) {
        imagePreview.value = ev.target.result;
        // Optionally, trigger cropping UI here
        // For now, just set thumbnail to same image
        thumbnailPreview.value = ev.target.result;
    };
    reader.readAsDataURL(file);
}

async function uploadImage(poolId) {
    if (!selectedImageFile) return null;
    const formData = new FormData();
    formData.append('image', selectedImageFile);
    formData.append('pool_id', poolId);
    // Optionally add crop data here
    const response = await fetch('/api/pool-upload', {
        method: 'POST',
        body: formData
    });
    const result = await response.json();
    if (result.success && result.imgUrl) {
        editable.value.img = result.imgUrl;
        if (result.thumbnailUrl) {
            thumbnailPreview.value = result.thumbnailUrl;
        }
    }
    return result;
}

async function save() {
    errorMessage.value = '';
    // Validation: slug and all tags must be non-empty
    if (!editable.value.slug || editable.value.slug.trim() === '') {
        errorMessage.value = 'Slug cannot be empty.';
        return;
    }
    if (!editable.value.tags || editable.value.tags.some(tag => !tag || tag.trim() === '')) {
        errorMessage.value = 'All tag fields must be filled.';
        return;
    }
    // Step 1: Save pool item first to get its ID
    const dataToSave = { ...editable.value };
    // Apply smartquotes to title and body
    dataToSave.title = smartquotes(dataToSave.title);
    dataToSave.body = smartquotes(dataToSave.body);
    if (dataToSave.format === 'markdown') {
        // Convert markdown to HTML before saving
        dataToSave.body = marked.parse(dataToSave.body || '');
    }
    const result = await poolStore.edit(dataToSave);
    if (result && !result.success && result.error === 'duplicate-slug') {
        errorMessage.value = 'A pool item with this slug already exists.';
        return;
    }
    // Step 2: Upload image if selected, using the new ID
    let poolId = dataToSave.id;
    // Try to get the new ID from the pool store if not present
    if (!poolId && result && result.success) {
        // Find the item by slug in the pool store
        const savedItem = Object.values(poolStore.pool).find(p => p.slug === dataToSave.slug);
        if (savedItem) poolId = savedItem.id;
    }
    if (selectedImageFile && poolId) {
        const uploadResult = await uploadImage(poolId);
        if (uploadResult && uploadResult.success && uploadResult.imgUrl) {
            // Step 3: Update pool item with image URL
            const updateData = { ...dataToSave, id: poolId, img: uploadResult.imgUrl };
            // Ensure date is a string from the form, not a JS Date object
            updateData.date = editable.value.date;
            await poolStore.edit(updateData);
        }
    }
    edit.value = false;
}

function erase() {
    if (props.id) {
        poolStore.erase(props.id);
        // Navigate to parent page (remove the last path segment)
        const currentPath = route.path;
        const parentPath = currentPath.replace(/[^/]+\.html$/, '').replace(/\/$/, '') + '/';
        router.push(parentPath || '/');
    }
    edit.value = false;
}

function cancel() {
    edit.value = false;
}

onBeforeMount(() => {
    init();
})
</script>

<style></style>
