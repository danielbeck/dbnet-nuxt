<template>
    <div class="loading">
        <div class="spinner"></div>
        (Loading)
    </div>
</template>
<script setup>
// Simple loading spinner component
</script>
<style scoped>
.loading {
    width: 100%;
    margin: 3em 0;
    text-align: center;
    font-size: 0.6em;
    animation: delayFadein 2.0s ease-in;
}

.spinner {
    width: 4em;
    height: 4em;
    margin: 1em auto;
    background-color: #333;
    border-radius: 100%;
    animation: spinner 1.0s infinite ease-in-out;
}

@keyframes delayFadein {
    0% {
        opacity: 0;
    }

    50% {
        opacity: 0;
    }

    100% {
        opacity: 1;
    }
}

@keyframes spinner {
    0% {
        -webkit-transform: scale(0);
        transform: scale(0);
    }

    100% {
        -webkit-transform: scale(1.0);
        transform: scale(1.0);
        opacity: 0;
    }
}
</style>
