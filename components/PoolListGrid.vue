<template>
    <div class="imagegrid">
        <div v-for="p in list" :key="p.id" class="grid" @mouseenter="hover($event)" @mouseleave="unhover($event)">
            <NuxtLink :to="p.path">
                <img :src="p.thumbnail" :alt="p.title" width="124" height="124" />
            </NuxtLink>
            <div class="label"><span v-html="p.title"></span></div>
        </div>
    </div>
</template>


<script setup>
import { ref, getCurrentInstance } from 'vue'

// Register NuxtLink globally for SSG/prerender context

const props = defineProps({
    list: Array
})

const curHover = ref(null)

const hover = (e) => {
    window.clearTimeout(e.target.timeout)
    if (curHover.value && e.target.offsetTop !== curHover.value.offsetTop) {
        curHover.value.classList.remove('hover')
    }
    e.target.classList.add('hover')
    curHover.value = e.target
}

const unhover = (e) => {
    e.target.timeout = window.setTimeout(() => {
        e.target.classList.remove('hover')
        delete e.target.timeout
    }, 500)
}
</script>

<style scoped lang="scss">
.imagegrid {
    width: calc(100vw - 5em);

    .grid {
        display: inline-block;
        padding: 0.5em 1em 0.5em 0;
        transition: all 0.5s;

        a {
            border: none;
        }

        img {
            box-shadow: 1px 1px 0.3em rgba(0, 0, 0, 0.3);
            transition: all 0.3s;
        }

        .label {
            position: absolute;
            opacity: 0;
            left: 0;
            transition: opacity 0.6s;
        }
    }

    .grid:hover {
        img {
            box-shadow: 3px 3px 0.5em rgba(0, 0, 0, 0.6);
        }

        .label {
            opacity: 1;
        }
    }

    .hover {
        margin-bottom: 1em;
    }
}

@media screen and (max-width: 600px) {
    .imagegrid {
        width: calc(100vw - 1em);
    }
}
</style>
