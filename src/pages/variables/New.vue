<script setup lang="ts">
import { ref } from 'vue';
import { Dialog } from 'primevue';
import { $api } from '../../services/api';
import Form from './components/Form.vue';
import type { IVariable } from '../../services/api';

const $emit = defineEmits(['created'])
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
	<Dialog
		v-model:visible="visible"
		maximizable
		modal
		header="Adding a new variable"
		:style="{ width: '50rem' }" :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
		@after-hide="$router.go(-1)"
	>
		<div class="m-0">
			<Form @submit="handleFormSubmit" />
		</div>
	</Dialog>
</template>
