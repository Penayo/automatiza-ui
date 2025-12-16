<script setup lang="ts">
	import { onMounted, ref, watch } from 'vue';
	import { InputText, Panel, Dropdown, Textarea } from 'primevue';
	import z from 'zod';
	import { parseZodError, type FormErrorMap } from '../../../utils/error';
	import FormField from '../../../components/form/FormField.vue';
	import type { IPermission } from '../../../services/api';

	const props = defineProps(['defaultValues'])
	const $emit = defineEmits(['submit'])

	const formSchema = z.object({
		type: z.enum(['view', 'api'], { message: 'Type is required' }),
		name: z.string()
			.min(1, 'Name is required'),
		description: z.string()
			.min(1, 'Description is required'),
	})

	const validationError = ref<FormErrorMap | null>(null);

	const permission = ref<IPermission>({
		type: 'view',
		name: '',
		description: '',
	})

	async function handleFormSubmit () {
		console.log('handling submit')

		try {
			formSchema.parse(permission.value);
			$emit('submit', permission.value);
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
			permission.value = props.defaultValues;
		}
	}

	watch(() => props.defaultValues, assignDefaultValues)

	onMounted(assignDefaultValues)
</script>

<template>
	<form class="flex flex-col gap-3">
	    <Panel header="Permission Information" class="mt-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<FormField label="Type" label-for="type" :error="validationError?.type">
						<Dropdown id="type" v-model="permission.type" :options="[{ label: 'View', value: 'view' }, { label: 'API', value: 'api' }]" option-label="label" option-value="value" placeholder="Select type" />
					</FormField>
				</div>
				<div>
					<FormField label="Name" label-for="name" :error="validationError?.name">
						<InputText id="name" v-model="permission.name" aria-describedby="name-help" />
					</FormField>
				</div>
				<div class="col-span-2">
					<FormField label="Description" label-for="description" :error="validationError?.description">
						<Textarea rows="2" id="description" v-model="permission.description" aria-describedby="description-help" />
					</FormField>
				</div>
			</div>
		</Panel>
	</form>
</template>