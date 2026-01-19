<template lang="html">
    <div id="signin">
        <template v-if="inDevMode">
            <div class="login">
                <button v-if="currentUser" @click="logout">Log out</button>
                <button v-if="!currentUser && !edit" @click="start">Admin</button>
            </div>
            <div v-if="edit" class="modal small">
                <label><span class="label">User:</span> <input ref="userfield" v-model="user"></label>
                <label><span class="label">Pwd:</span> <input v-model="pwd"></label>
                <!-- <label><span class="label">nonce:</span> <input v-model="nonce"></label> -->
                <!-- <label><span class="label">New pwd:</span> <input v-model="newpwd"></label> -->
                <button @click="login">Sign in</button>
            </div>
        </template>
    </div>
</template>
<script setup>
import { ref, computed, nextTick } from 'vue'
import { useUserStore } from '@/stores/user'
import { API_BASE } from '@/helpers/api'

const userStore = useUserStore()

const user = ref('')
const pwd = ref('')
const nonce = ref('')
const newpwd = ref('')
const edit = ref(false)
const userfield = ref(null)
const inDevMode = process.env.NODE_ENV === 'development'

const currentUser = computed(() => userStore.currentUser)

function start() {
    edit.value = true;
    nextTick(() => {
        userfield.value?.focus()
    })
}

async function login() {
    edit.value = false;

    const response = await fetch(`${API_BASE}/user.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            u: user.value,
            p: pwd.value,
            new: newpwd.value,
            n: nonce.value
        })
    })
    const nonceResult = await response.text()
    newpwd.value = '';
    nonce.value = nonceResult;
    pwd.value = '';
    userStore.setCurrentUser({
        user: user.value,
        nonce: nonce.value
    });
    window.scrollTo(0, 0);
}

function logout() {
    userStore.logout();
    user.value = '';
    pwd.value = '';
    nonce.value = '';
    newpwd.value = '';
    edit.value = false;
}
</script>
<style>
#signin .login {
    position: absolute;
    top: 0.5em;
    right: 1em;
}
</style>
