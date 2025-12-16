<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import type { IPermission } from '../../services/api';
import { useRoute } from 'vue-router';
import Page from '../../components/Page.vue';
import { Button } from 'primevue';

const $emit = defineEmits(['created'])
const $route = useRoute();

const permissionId = ref<string>('');
const permission = ref<IPermission | null>(null);
const formRef = ref<typeof Form>();

async function handleFormSubmit (formValues: IPermission) {
	try {
		const result = await $api.permissions.update(permissionId.value, formValues);
		$emit('created', result);
	} catch(error) {
		console.log(error) // we should handle api error globally
	}
}

async function findItem() {
	const { id } = $route.params
	permissionId.value = id as string;
	permission.value = await $api.permissions.findById(permissionId.value);
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Page :title="permission?.name">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Permissions
                </a>/
                {{ permission?.name }}
            </h2>
		</template>

        <template #actions>
			<Button severity="secondary" :disabled="!permission" label="Cancelar" icon="pi pi-pen-to-square" @click="$router.go(-1)" />
			<Button severity="success" :disabled="!permission" label="Save" icon="pi pi-pen-to-square" @click="formRef?.save()" 	/>
        </template>

		<div class="m-0">
			<Form ref="formRef" @submit="handleFormSubmit" :default-values="permission" />
		</div>
	</Page>
</template>