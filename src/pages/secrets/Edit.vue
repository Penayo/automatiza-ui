<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import Page from '../../components/Page.vue';
import { Button, useToast } from 'primevue';
import { useRoute } from 'vue-router';

const $route = useRoute();
const toast = useToast();
const $emit = defineEmits(['updated'])
const formRef = ref<typeof Form>();
const visible = ref(true);
const secret = ref();

const key = $route.params.key as string;

async function handleFormSubmit (formValues: { value: string; description?: string }) {
	try {
		const result = await $api.secrets.updateSecret(key, formValues);
		$emit('updated', result);
		toast.add({ severity: 'success', summary: 'Success', detail: 'Secret Updated!', life: 3000 });
		setTimeout(() => visible.value = false, 500)
	} catch(error) {
		console.log(error) // we should handle api error globally
	}
}

onMounted(async () => {
	try {
		secret.value = await $api.secrets.findByKey(key);
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error fetching secret', life: 3000 });
	}
});
</script>

<template>
	<Page title="Edit Secret">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Secrets
                </a>/
				Edit Secret
            </h2>
		</template>

        <template #actions>
			<Button severity="secondary" label="Cancelar" icon="pi pi-pen-to-square" @click="$router.go(-1)" />
			<Button severity="success" label="Save" icon="pi pi-pen-to-square" @click="formRef?.save()" 	/>
        </template>

		<div class="m-0">
			<Form @submit="handleFormSubmit" :defaultValues="secret" ref="formRef" />
		</div>
	</Page>
</template>