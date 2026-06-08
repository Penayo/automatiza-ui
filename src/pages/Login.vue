<script setup lang="ts">
import { ref } from 'vue';
import Page from '@components/Page.vue';
import { InputText, Password, Button, useToast, Checkbox } from 'primevue';
import { useRouter } from 'vue-router';
import FormField from '@components/form/FormField.vue';
import type { IAccess } from '@services/AuthService.ts';
import { $api } from '@services/api';

const toast = useToast();
const router = useRouter();
const tenantSlug = ref('');
const username   = ref('');
const password   = ref('');
const rememberMe = ref(false);
const loading    = ref(false);

const handleLogin = (event: Event) => {
    event.preventDefault();
    loading.value = true;

    $api.authService.login({
        tenantSlug: tenantSlug.value,
        username:   username.value,
        password:   password.value,
        rememberMe: rememberMe.value,
    })
        .then((access: IAccess) => {
            $api.authService.saveAccessInfo(access);
            router.push('/dashboard');
            setTimeout(() => toast.add({ severity: 'success', summary: 'Ok', detail: 'Login successfully!' }), 1000);
        })
        .catch((error: any) => {
            const message = error?.response?.data?.message ?? error?.message ?? 'Login failed';
            toast.add({ severity: 'error', summary: 'Error', detail: message, life: 4000 });
        })
        .finally(() => { loading.value = false; });
};
</script>

<template>
    <Page>
        <div class="flex flex-col items-center justify-center min-h-screen">
            <form @submit="handleLogin" class="p-8 rounded shadow-md w-full max-w-md flex flex-col gap-4 border border-emerald-500">
                <h2 class="text-2xl font-bold mb-4 text-center">Sign in</h2>

                <FormField label="Organization" label-for="tenantSlug">
                    <InputText
                        class="w-full"
                        id="tenantSlug"
                        v-model="tenantSlug"
                        placeholder="your-organization"
                        autocomplete="organization"
                    />
                </FormField>

                <FormField label="Username" label-for="username">
                    <InputText class="w-full" id="username" v-model="username" autocomplete="username" />
                </FormField>

                <FormField label="Password" label-for="password">
                    <Password id="password" class="w-full" v-model="password" fluid />
                </FormField>

                <FormField label="Remember me">
                    <Checkbox v-model="rememberMe" />
                </FormField>

                <Button label="Sign in" icon="pi pi-sign-in" type="submit" :loading="loading" class="w-full" />

                <p class="text-sm text-center mt-2">
                    Don't have an account?
                    <router-link to="/signup" class="text-emerald-400 hover:underline">Create one</router-link>
                </p>
            </form>
        </div>
    </Page>
</template>
