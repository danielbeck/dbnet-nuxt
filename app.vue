<template>
    <div id="app">
        <SignIn />
        <MainMenu />
        <article id="body" role="main">
            <NuxtPage />
        </article>
        <Footer />
    </div>
</template>
<script setup>
import MainMenu from "~/components/MainMenu.vue"
import Footer from "~/components/Footer.vue"
import SignIn from "~/components/SignIn.vue"
</script>

<style src="~/helpers/global.scss" lang="scss"></style>

<style lang="scss">
article {
    position: relative;
    margin: 0 1em 0 5em;
    max-width: 40em;
    font-family: 'Alegreya Sans', sans-serif;
    font-size: 21px;
    line-height: 1.4em;
}

article xmp {
    font-size: 14px;
    line-height: 1.2em;
}

@media screen and (max-width: 600px) {
    article {
        margin-left: 1em;
    }
}

article a {
    text-decoration: none;
    border-bottom: 1px solid #DDD;
    color: #00F
}

article a:hover {
    border-bottom: 2px solid #00F;
}

.label {
    font-family: 'Asap';
    font-style: italic;
    font-size: 0.7em;
    vertical-align: bottom;
    opacity: 0.7;
}

h1,
h2,
h3,
h4 {
    font-style: italic;
    font-family: "Asap", sans-serif;
}

h1 {
    font-size: 1.5em;
    line-height: 1.17em;
}

h2 {
    font-size: 1.17em;
    line-height: 1.12em;
}

h3 {
    font-size: 1.12em;
    line-height: 1em;
}

h4 {
    font-size: .83em;
    line-height: 1em;
}

.modal {
    border: 1px solid;
    position: fixed;
    box-shadow: 0 0 500px #000;
    background-color: #FFF;
    padding: 1em;
    top: 2%;
    left: 2%;
    right: 2%;
    max-height: 90vh;
    overflow: scroll;
    z-index: 2
}

.modal.small {
    top: 20%;
    left: 20%;
    right: 20%;
}
</style>
