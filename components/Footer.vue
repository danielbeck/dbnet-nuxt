<template>
    <div class="foot" role="contentinfo">
        <div class="fineprint">
            <p style="text-align:right">
                Now meeting all your syndication needs:<br>
                <a href="/rss.xml"><img src="/assets/rss.gif" alt="RSS Feed" /></a> &nbsp;
                <a href="/rss-photos.xml"><img src="/assets/rss_images.gif" alt="RSS Feed - images only" /></a> &nbsp;
                <a href="/rss-blog.xml"><img src="/assets/rss_blog.gif" alt="RSS Feed - blog " /></a> &nbsp;
                <a href="/rss-geek.xml"><img src="/assets/rss_geek.gif" alt="RSS Feed - geek stuff" /></a>
            </p>
            <hr size="1" style="color:rgba(0,0,0,0.25); width: 45%" />
            <p>
                Text and photos containing people © {{ currentYear }} Daniel Beck. Other photos CC BY-NC-SA 4.0 <br />
                This website does not use cookies. Not even little ones. It does keep track of
                <a :aria-expanded="details + ''" aria-controls="privacydetails" @click="details = !details">page
                    views</a>,
                though, just so I can get that little ego boost whenever someone visits the site.
            </p>
            <div v-if="details" id="privacydetails">
                <p>Here's what's collected:</p>
                <ul>
                    <li>An anonymized user ID. (I can't tell who visited, or anything personally identifiable about
                        them, but I can tell if the same user visits more than once.)</li>
                    <li>Which page is being viewed</li>
                    <li>Which page linked to it</li>
                    <li>The date and time</li>
                </ul>
                <p>This information is stored in the same database that runs the rest of the site, and will only be used
                    to keep track of which pages on the site are popular and which ones kinda suck; I will never give or
                    sell this data to any third party. Individual records will periodically be consolidated and cleared
                    from the database. If you don't consent to this site gathering that information, you'll have to go
                    read somebody else's blog instead of this one, sorry.</p>
            </div>
        </div>
        <div style="text-align:right">
            <img id="logo" src="/assets/db.svg" alt="DB logo" />
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const details = ref(false)
const currentYear = computed(() => new Date().getFullYear())
</script>
<style lang="scss">
.foot {
    margin-top: 6em;
    padding: 1em;
    background-image: linear-gradient(18deg, #F3EEE5 8%, #E4D8C8 89%);

    .fineprint {
        font-family: "Asap";
        font-style: italic;
        line-height: 1.3em;
        font-size: 0.8em;
    }

    #logo {
        margin: 60vh 1em 10vh 0;
        opacity: 0.2;
    }

    a {
        cursor: pointer;
        cursor: hand;
        text-decoration: underline;
    }

    img {
        border: 0;
    }
}
</style>
