<script setup lang="ts">
import { ref } from 'vue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import type { IVariable } from '../../services/api';
import Page from '../../components/Page.vue';

const $emit = defineEmits(['created'])
const formRef = ref<typeof Form>();
const visible = ref(true);

async function handleFormSubmit (formValues: IVariable) {
	try {
		const result = await $api.variables.post(formValues);
		$emit('created', result);
		setTimeout(() => visible.value = false, 500)
	} catch(error) {
		console.log(error) // we should handle api error globally
	}
}
</script>

<template>
	<Page title="New User">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Users
                </a>/
				New User
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
