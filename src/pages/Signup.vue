<script setup lang="ts">
import { ref } from 'vue';
import Page from '@components/Page.vue';
import { InputText, Password, Button, useToast } from 'primevue';
import { useRouter } from 'vue-router';
import FormField from '@components/form/FormField.vue';
import type { IAccess } from '@services/AuthService.ts';
import { $api } from '@services/api';

const toast   = useToast();
const router  = useRouter();
const loading = ref(false);

const inviteToken = ref('');
const tenantSlug  = ref('');
const tenantName  = ref('');
const username    = ref('');
const email       = ref('');
const password    = ref('');

const handleSignup = (event: Event) => {
    event.preventDefault();
    loading.value = true;

    $api.authService.signup({
        inviteToken: inviteToken.value,
        tenantSlug:  tenantSlug.value,
        tenantName:  tenantName.value,
        username:    username.value,
        email:       email.value,
        password:    password.value,
    })
        .then((access: IAccess) => {
            $api.authService.saveAccessInfo(access);
            router.push('/admin/dashboard');
            setTimeout(() => toast.add({ severity: 'success', summary: 'Welcome!', detail: 'Your organization has been created.' }), 500);
        })
        .catch((error: any) => {
            const message = error?.response?.data?.message ?? error?.message ?? 'Signup failed';
            toast.add({ severity: 'error', summary: 'Error', detail: message, life: 5000 });
        })
        .finally(() => { loading.value = false; });
};
</script>

<template>
    <Page>
        <div class="flex flex-col items-center justify-center min-h-screen">
            <form @submit="handleSignup" class="p-8 rounded shadow-md w-full max-w-md flex flex-col gap-4 border border-emerald-500">
                <h2 class="text-2xl font-bold mb-2 text-center">Create your organization</h2>
                <p class="text-sm text-center text-gray-400 mb-2">You'll need an invite token to get started.</p>

                <FormField label="Invite token" label-for="inviteToken">
                    <InputText
                        class="w-full"
                        id="inviteToken"
                        v-model="inviteToken"
                        placeholder="Provided by your administrator"
                        autocomplete="off"
                        type="password"
                    />
                </FormField>

                <FormField label="Organization name" label-for="tenantName">
                    <InputText
                        class="w-full"
                        id="tenantName"
                        v-model="tenantName"
                        placeholder="Acme Corporation"
                        autocomplete="organization"
                    />
                </FormField>

                <FormField label="Organization slug" label-for="tenantSlug">
                    <InputText
                        class="w-full"
                        id="tenantSlug"
                        v-model="tenantSlug"
                        placeholder="acme-corp"
                        autocomplete="off"
                    />
                </FormField>

                <FormField label="Admin username" label-for="username">
                    <InputText class="w-full" id="username" v-model="username" autocomplete="username" />
                </FormField>

                <FormField label="Email" label-for="email">
                    <InputText class="w-full" id="email" v-model="email" type="email" autocomplete="email" />
                </FormField>

                <FormField label="Password" label-for="password">
                    <Password id="password" class="w-full" v-model="password" fluid />
                </FormField>

                <Button label="Create organization" icon="pi pi-building" type="submit" :loading="loading" class="w-full" />

                <p class="text-sm text-center mt-2">
                    Already have an account?
                    <router-link to="/login" class="text-emerald-400 hover:underline">Sign in</router-link>
                </p>
            </form>
        </div>
    </Page>
</template>
