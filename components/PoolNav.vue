<template>
    <nav class="npnav">
        <div class="nav">
            <template v-if="prevLink">
                <router-link class="npbtn" :to="prevLink" :aria-label="ariaPrev">‹</router-link>
            </template>
            <template v-else>
                <a class="npbtn disabled" aria-hidden="true">‹</a>
            </template>
        </div>
        <div class="nav">
            <template v-if="nextLink">
                <router-link class="npbtn" :to="nextLink" :aria-label="ariaNext">›</router-link>
            </template>
            <template v-else>
                <a class="npbtn disabled" aria-hidden="true">›</a>
            </template>
        </div>
    </nav>
</template>

<script setup>
const props = defineProps({ prevLink: { type: [String, Boolean], default: false }, nextLink: { type: [String, Boolean], default: false }, currentTag: { type: String, default: '' } })
const ariaPrev = props.currentTag ? 'Previous page in ' + props.currentTag : 'Previous page'
const ariaNext = props.currentTag ? 'Next page in ' + props.currentTag : 'Next page'
</script>

<style scoped>
.npnav {
    margin-left: -4em;
    width: 4em;
    float: left;
}

.npnav .nav {
    transition: all 1s;
}

.npnav a {
    background-color: #CCC;
    border: none;
    border-radius: 50%;
    color: #FFF;
    display: inline-block;
    font-family: monospace;
    font-weight: 700;
    height: 1.5em;
    line-height: 1.5em;
    margin: 0 .25em .25em;
    text-align: center;
    width: 1.5em;
}

.npnav a:hover {
    background-color: #333;
    border: none;
}

.npnav .npbtn {
    font-size: 1.2em
}

.npnav .npbtn.disabled {
    opacity: 0.28;
    pointer-events: none;
    background-color: #ddd;
    color: #999;
}
</style>
