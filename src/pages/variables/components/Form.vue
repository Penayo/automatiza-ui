<script setup lang="ts">
	import { onMounted, ref, watch } from 'vue';
	import { InputText, Select, Button } from 'primevue';
	import z from 'zod';
	import { parseZodError, type FormErrorMap } from '../../../utils/error';
	import FormField from '../../../components/form/FormField.vue';
	import type { IVariable } from '../../../services/api';

	const props = defineProps(['defaultValues'])

	const $emit = defineEmits(['submit'])

	const formSchema = z.object({
		name: z.string()
			.min(5, 'El nombre de la variable debe tener al menos 5 letras')
			.max(50, 'El nombre no puede tener mas de 50 caracteres'),
		value: z.string().min(1, 'El valor es requerido'),
		type: z.string().min(1, 'El tipo es requerido')
	})

	const variableTypes = ref([
		{ label: 'String', value: 'string' },
		{ label: 'Number', value: 'number' },
		{ label: 'Boolean', value: 'boolean' }
	]);

	const validationError = ref<FormErrorMap | null>(null);

	const variable = ref<IVariable>({
		name: '',
		value: '',
		type: ''
	})

	async function handleFormSubmit (event: Event) {
		event.preventDefault()
		try {
			formSchema.parse(variable.value);
			$emit('submit', variable.value);
		} catch(error) {
			if(error instanceof z.ZodError) {
				validationError.value = parseZodError(error);
			}
		}
	}

	watch(() => props.defaultValues, () => {
		variable.value = props.defaultValues
	})

	onMounted(() => {
		if (props.defaultValues) {
			variable.value = props.defaultValues.value;
		}
	})
</script>

<template>
	<form @submit="handleFormSubmit" class="flex flex-col gap-3">
		<FormField label="Variable Name" label-for="name" :error="validationError?.name">
			<InputText id="name" v-model="variable.name" aria-describedby="username-help" />
		</FormField>

		<FormField label="Variable Value" label-for="value" :error="validationError?.value">
			<InputText id="value" v-model="variable.value" aria-describedby="username-help" />
		</FormField>

		<FormField label="Variable Type" label-for="type" :error="validationError?.type">
			<Select name="type" v-model="variable.type" :options="variableTypes" optionLabel="label" optionValue="value" placeholder="Select a Type" class="w-full" />
		</FormField>

		<div class="text-end py-4">
			<Button :label="variable._id ? 'Modificar' : 'Crear'" icon="pi pi-save" type="submit" />
		</div>
	</form>
</template>