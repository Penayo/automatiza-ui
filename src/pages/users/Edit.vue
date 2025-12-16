<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import type { IUser } from '../../services/api';
import { useRoute } from 'vue-router';
import Page from '../../components/Page.vue';
import { Button } from 'primevue';

const $emit = defineEmits(['created'])
const $route = useRoute();

const userId = ref<string>('');
const user = ref<IUser | null>(null);
const formRef = ref<typeof Form>();

async function handleFormSubmit (formValues: IUser) {
	try {
		const result = await $api.users.update(userId.value, formValues);
		$emit('created', result);
	} catch(error) {
		console.log(error) // we should handle api error globally
	}
}

async function findItem() {
	const { id } = $route.params
	userId.value = id as string;
	user.value = await $api.users.findById(userId.value);
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Page :title="user?.username">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Users
                </a>/
                {{ user?.username }}
            </h2>
		</template>

        <template #actions>
			<Button severity="secondary" :disabled="!user" label="Cancelar" icon="pi pi-pen-to-square" @click="$router.go(-1)" />          
			<Button severity="success" :disabled="!user" label="Save" icon="pi pi-pen-to-square" @click="formRef?.save()" 	/>          
        </template>

		<div class="m-0">
			<Form ref="formRef" @submit="handleFormSubmit" :default-values="user" />
		</div>
	</Page>
</template>