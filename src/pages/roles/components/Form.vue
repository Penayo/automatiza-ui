<script setup lang="ts">
	import { onMounted, ref, watch } from 'vue';
	import { InputText, Panel } from 'primevue';
	import z from 'zod';
	import { parseZodError, type FormErrorMap } from '../../../utils/error';
	import FormField from '../../../components/form/FormField.vue';
	import type { IRole } from '../../../services/api';

	const props = defineProps(['defaultValues'])
	const $emit = defineEmits(['submit'])

	const formSchema = z.object({
		key: z.string()
			.min(1, 'Key is required'),
		description: z.string()
			.min(1, 'Description is required'),
	})

	const validationError = ref<FormErrorMap | null>(null);

	const role = ref<IRole>({
		key: '',
		description: '',
		permissions: [],
	})

	async function handleFormSubmit () {
		console.log('handling submit')

		try {
			formSchema.parse(role.value);
			$emit('submit', role.value);
		} catch(error: unknown) {
			validationError.value = parseZodError(error as z.ZodError);
			console.log(validationError.value);
		}
	}

	defineExpose({
		save: handleFormSubmit
	})

	const assignDefaultValues = () => {
		if (props.defaultValues) {
			role.value = props.defaultValues;
		}
	}

	watch(() => props.defaultValues, assignDefaultValues)

	onMounted(assignDefaultValues)
</script>

<template>
	<form class="flex flex-col gap-3">
        <Panel header="Role Information" class="mt-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<FormField label="Key" label-for="key" :error="validationError?.key">
						<InputText id="key" v-model="role.key" aria-describedby="key-help" />
					</FormField>
				</div>
				<div>
					<FormField label="Description" label-for="description" :error="validationError?.description">
						<InputText id="description" v-model="role.description" aria-describedby="description-help" />
					</FormField>
				</div>
			</div>
		</Panel>
	</form>
</template>