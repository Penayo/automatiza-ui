<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Dialog } from 'primevue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import type { IVariable } from '../../services/api';
import { useRoute } from 'vue-router';

const $emit = defineEmits(['created'])
const $route = useRoute();

const visible = ref(true);
const variableId = ref<string>('');
const variable = ref<IVariable | null>(null);

async function handleFormSubmit (formValues: IVariable) {
	try {
		const result = await $api.variables.put(variableId.value, formValues);
		$emit('created', result);
		setTimeout(() => visible.value = false, 500)
	} catch(error) {
		console.log(error) // we should handle api error globally
	}
}

async function findItem() {
	const { id } = $route.params
	variableId.value = id as string;
	variable.value = await $api.variables.get(variableId.value);
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Dialog
		v-model:visible="visible"
		maximizable
		modal
		header="Updating a variable"
		:style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
		@after-hide="$router.go(-1)"
	>
		<div class="m-0">
			<Form @submit="handleFormSubmit" :default-values="variable" />
		</div>
	</Dialog>
</template>
