<script setup lang="ts">
import { ref } from 'vue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import Page from '../../components/Page.vue';
import { Button, useToast, Message } from 'primevue';
import { useRouter } from 'vue-router';

const router = useRouter();
const toast = useToast();

const formRef = ref<InstanceType<typeof Form>>();
const createdKey = ref<string | null>(null);
const copied = ref(false);

async function handleFormSubmit(formValues: {
    name: string;
    roles?: string[];
    expiresAt?: string | null;
}) {
    try {
        const { key, apiKey } = await $api.apiKeys.createApiKey(formValues);
        createdKey.value = key;
        toast.add({ severity: 'success', summary: 'API Key Created', detail: `"${apiKey.name}" was created successfully`, life: 4000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create API key', life: 3000 });
    }
}

async function copyKey() {
    if (!createdKey.value) return;
    await navigator.clipboard.writeText(createdKey.value);
    copied.value = true;
    toast.add({ severity: 'success', summary: 'Copied!', detail: 'Key copied to clipboard', life: 2000 });
    setTimeout(() => (copied.value = false), 3000);
}
</script>

<template>
    <Page title="New API Key">
        <template #header>
            <h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    API Keys
                </a>/
                New API Key
            </h2>
        </template>

        <template #actions>
            <Button severity="secondary" label="Cancel" icon="pi pi-arrow-left" @click="$router.go(-1)" />
            <Button
                v-if="!createdKey"
                severity="success"
                label="Save"
                icon="pi pi-check"
                @click="formRef?.save()"
            />
            <Button
                v-else
                label="Go to API Keys"
                icon="pi pi-list"
                @click="router.push({ name: 'ApiKeysIndex' })"
            />
        </template>

        <!-- Key reveal panel — shown once after creation -->
        <div v-if="createdKey" class="mt-4">
            <Message severity="warn" class="mb-4">
                Store this key securely. It will <strong>not</strong> be shown again.
            </Message>

            <div class="bg-surface-0 dark:bg-zinc-800 border border-emerald-300 rounded-xl p-6 flex flex-col gap-4">
                <h3 class="text-lg font-semibold text-emerald-600">Your new API key</h3>

                <div class="flex items-center gap-3 bg-gray-100 dark:bg-zinc-700 rounded-lg px-4 py-3">
                    <code class="flex-1 text-sm break-all select-all font-mono text-gray-800 dark:text-gray-100">
                        {{ createdKey }}
                    </code>
                    <Button
                        :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
                        :severity="copied ? 'success' : 'secondary'"
                        rounded
                        text
                        @click="copyKey"
                        v-tooltip="'Copy to clipboard'"
                    />
                </div>

                <p class="text-sm text-gray-500">
                    Use the <code class="bg-gray-100 dark:bg-zinc-700 px-1 rounded">X-API-Key</code> header
                    to authenticate requests with this key.
                </p>
            </div>
        </div>

        <!-- Form — hidden after creation -->
        <div v-else class="m-0">
            <Form @submit="handleFormSubmit" ref="formRef" mode="create" />
        </div>
    </Page>
</template>
