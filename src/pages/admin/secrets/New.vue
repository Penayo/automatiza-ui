<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { $api } from '@services/api';
import Form from '@pages/admin/secrets/components/Form.vue';
import Page from '@components/Page.vue';
import { Button, useToast } from 'primevue';

const router = useRouter();
const toast = useToast();
const formRef = ref<typeof Form>();

async function handleFormSubmit (formValues: { key: string; value: string; description?: string }) {
	try {
		await $api.secrets.createSecret(formValues);
		toast.add({ severity: 'success', summary: 'Success', detail: 'Secret created!', life: 3000 });
		router.push({ name: 'SecretsIndex' });
	} catch (error: any) {
		const detail = error?.response?.data?.message ?? 'Failed to create secret';
		toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 });
	}
}
</script>

<template>
	<Page title="New Secret">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Secrets
                </a>/
				New Secret
            </h2>
		</template>

        <template #actions>
			<Button severity="secondary" label="Cancelar" icon="pi pi-pen-to-square" @click="$router.go(-1)" />
			<Button severity="success" label="Save" icon="pi pi-pen-to-square" @click="formRef?.save()" 	/>
        </template>

		<div class="m-0">
			<Form @submit="handleFormSubmit" ref="formRef" />
		</div>
	</Page>
</template>