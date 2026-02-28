<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import Page from '../../components/Page.vue';
import { Button, useToast } from 'primevue';
import { useRoute, useRouter } from 'vue-router';

const $route = useRoute();
const router = useRouter();
const toast = useToast();

const formRef = ref<InstanceType<typeof Form>>();
const apiKey = ref();
const id = $route.params.id as string;

async function handleFormSubmit(formValues: {
    name?: string;
    roles?: string[];
    isActive?: boolean;
    expiresAt?: string | null;
}) {
    try {
        await $api.apiKeys.updateApiKey(id, formValues);
        toast.add({ severity: 'success', summary: 'Success', detail: 'API key updated', life: 3000 });
        setTimeout(() => router.push({ name: 'ApiKeysIndex' }), 800);
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update API key', life: 3000 });
    }
}

onMounted(async () => {
    try {
        apiKey.value = await $api.apiKeys.findOne(id);
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'API key not found', life: 3000 });
        router.push({ name: 'ApiKeysIndex' });
    }
});
</script>

<template>
    <Page title="Edit API Key">
        <template #header>
            <h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    API Keys
                </a>/
                Edit API Key
            </h2>
        </template>

        <template #actions>
            <Button severity="secondary" label="Cancel" icon="pi pi-arrow-left" @click="$router.go(-1)" />
            <Button severity="success" label="Save" icon="pi pi-check" @click="formRef?.save()" />
        </template>

        <div class="m-0">
            <Form @submit="handleFormSubmit" :defaultValues="apiKey" ref="formRef" mode="edit" />
        </div>
    </Page>
</template>
