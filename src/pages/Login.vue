<script setup lang="ts">
import { ref } from 'vue';
import Page from '../components/Page.vue';
import { InputText, Password, Button, useToast, Checkbox } from 'primevue';
import { useRouter } from 'vue-router';
import FormField from '../components/form/FormField.vue';
import type { IAccess } from '../services/AuthService.ts';
import { $api } from '../services/api';

const toast = useToast();
const router = useRouter();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const loading = ref(false);

const handleLogin = (event: Event) => {
    event.preventDefault();
    loading.value = true;
    
    const login = {
        username: username.value,
        password: password.value,
        rememberMe: rememberMe.value
    }

    $api.authService.login(login)
        .then((access: IAccess) => {
            $api.authService.saveAccessInfo(access);
            router.push('/dashboard');
            setTimeout(() => toast.add({ severity: 'success', summary: 'Ok', detail: 'Login successfully!' }), 1000)
        }).catch((error: Error) => {
            console.log(error)
            toast.add({ severity: 'error', summary: 'Error', detail: error.message, life: 3000 })
        }).finally(() => {
            loading.value = false;
        });
}
</script>

<template>
    <Page>
        <div class="flex flex-col items-center justify-center min-h-screen">
            <form @submit="handleLogin" class="p-8 rounded shadow-md w-full max-w-md flex flex-col gap-4 border border-emerald-500">
            <h2 class="text-2xl font-bold mb-4 text-center">Iniciar sesión</h2>
            <FormField label="Usuario" label-for="username">
                <InputText class="w-full" id="username" v-model="username" autocomplete="username" />
            </FormField>
            <FormField label="Contraseña" label-for="password">
                <Password id="password" class="w-full" v-model="password" fluid />
            </FormField>
            <FormField label="Recordarme">
                <Checkbox v-model="rememberMe" />
            </FormField>

            <Button label="Ingresar" icon="pi pi-sign-in" type="submit" :loading="loading" class="w-full" />
            </form>
        </div>
    </Page>
</template>
