<template>
    <nav id="mainmenu">
        <a id="skipnav" href="#body">Skip navigation</a>
        <ul class="home">
            <li class="active">
                <NuxtLink to="/">Home</NuxtLink>
            </li>
        </ul>
        <ul v-if="nav[1]">
            <li v-for="item in nav[1]" :key="item.path" :class="item.classes">
                <NuxtLink :to="item.path">{{ item.name }}</NuxtLink>
            </li>
        </ul>
        <ul v-if="nav[2] && nav[1] && nav[1].some(i => i.classes.active)">
            <li v-for="item in nav[2]" :key="item.path" :class="item.classes">
                <NuxtLink :to="item.path">{{ item.name }}</NuxtLink>
            </li>
        </ul>
        <ul v-if="nav[3] && nav[2] && nav[2].some(i => i.classes.active)">
            <li v-for="item in nav[3]" :key="item.path" :class="item.classes">
                <NuxtLink :to="item.path">{{ item.name }}</NuxtLink>
            </li>
        </ul>
    </nav>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import siteRoutes from '~/helpers/routes.mjs'

const route = useRoute()

const nav = computed(() => {
    let navArr = [[], [], []];
    let currentPath = route.path;
    let activePaths = [null, null, null];

    for (let r of siteRoutes) {
        if (r.meta && r.meta.noNav) continue;
        let parts = r.path.split('/').filter(Boolean);
        let link = {
            path: r.path,
            name: r.name,
            classes: {}
        };
        let depth = parts.length;
        let normalizedRoutePath = r.path.replace(/\/$/, '');
        let normalizedCurrentPath = currentPath.replace(/\/$/, '');
        if (
            normalizedRoutePath === '' ? normalizedCurrentPath === '' :
                normalizedCurrentPath === normalizedRoutePath || normalizedCurrentPath.startsWith(normalizedRoutePath + '/')
        ) {
            link.classes = { active: true };
            activePaths[depth] = normalizedRoutePath;
        }
        navArr[depth] = navArr[depth] || [];
        navArr[depth].push(link);
    }
    // Filter nav[2] to only show if its parent (nav[1]) is active and is a prefix of the nav[2] path
    if (navArr[2] && activePaths[1]) {
        navArr[2] = navArr[2].filter(item => item.path.startsWith(activePaths[1] + '/'));
    } else if (navArr[2]) {
        navArr[2] = [];
    }
    // Filter nav[3] to only show if its parent (nav[2]) is active and is a prefix of the nav[3] path
    if (navArr[3] && activePaths[2]) {
        navArr[3] = navArr[3].filter(item => item.path.startsWith(activePaths[2] + '/'));
    } else if (navArr[3]) {
        navArr[3] = [];
    }
    return navArr;
});
</script>

<style lang="scss">
#mainmenu {
    font-family: "Asap";
    line-height: 1.3em;
    margin: 0;
    padding-top: 0.5em;

    #skipnav {
        position: absolute;
        left: -10000px;
    }

    #skipnav:focus {
        position: static;
        margin-left: 1.5em;
    }

    a {
        text-decoration: none;
        text-transform: uppercase;
        font-size: 0.9em;
        color: #000;
    }

    .active a {
        font-weight: bold;
    }

    ul.home .active a {
        font-weight: normal;
    }

    ul {
        list-style: none;
        margin: 0.5em 0 0 0;
        padding: 0 1em;
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        border-bottom: 1px solid rgba(0, 0, 0, 0.04);
    }

    li {
        display: inline-block;
        padding: 0 15px;
    }

    li.active {
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid transparent;
        border-radius: 0.3em 0.3em 0 0;
        border-bottom: 1px solid #FFF;
        margin-bottom: -1px;
    }

    ul.home li.active {
        border: none;
    }
}

@media screen and (max-width: 750px) {
    #mainmenu {
        li {
            padding: 0 7px
        }

        li.active {
            border: none;
        }
    }
}

@media screen and (max-width: 450px) {
    #mainmenu {
        li {
            display: none
        }

        li.active,
        ul:last-child li {
            display: inline-block;
        }
    }
}
</style>
