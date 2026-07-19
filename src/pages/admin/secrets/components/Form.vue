<script setup lang="ts">
	import { onMounted, ref, watch, type PropType } from 'vue';
	import { InputText, Panel, Password, Textarea } from 'primevue';
	import z from 'zod';
	import { parseZodError, type FormErrorMap } from '@/utils/error';
	import FormField from '@components/form/FormField.vue';

	type Secret = {
		key: string;
		value: string;
		description: string;
	}

	// keyEditable=false locks the key field: a secret's key is its immutable
	// identifier (backend update ignores key changes), so Edit mode disables it.
	const props = defineProps({
		defaultValues: { type: Object as PropType<Secret>, default: null },
		keyEditable:   { type: Boolean, default: true },
	})
	const $emit = defineEmits(['submit'])

	const formSchema = z.object({
		key: z.string()
			.min(1, 'Key is required'),
		value: z.string()
			.min(1, 'Value is required'),
		description: z.string()
			.optional(),
	})

	const validationError = ref<FormErrorMap | null>(null);

	const secret = ref<Secret>({
		key: '',
		value: '',
		description: '',
	})

	async function handleFormSubmit () {
		console.log('handling submit')

		try {
			formSchema.parse(secret.value);
			$emit('submit', secret.value);
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
			secret.value = props.defaultValues;
		}
	}

	watch(() => props.defaultValues, assignDefaultValues)

	onMounted(() => {
		assignDefaultValues();
	})
</script>

<template>
	<form class="flex flex-col gap-3">
        <Panel header="Secret Information" class="mt-4">
			<div class="grid grid-cols-3 gap-4">
				<div>
					<FormField label="Key" label-for="key" :error="validationError?.key">
						<InputText id="key" v-model="secret.key" aria-describedby="key-help" :disabled="!keyEditable" fluid />
						<small v-if="!keyEditable" class="text-gray-400">The key is a permanent identifier and can't be changed.</small>
					</FormField>
				</div>
				<div class="col-span-2">
					<FormField label="Value" label-for="value" :error="validationError?.value">
						<Password fluid id="value" v-model="secret.value" aria-describedby="value-help" :feedback="false" toggleMask />
					</FormField>
				</div>
			</div>
			<div class="mt-3">
				<FormField label="Description" label-for="description" :error="validationError?.description">
					<Textarea rows="2" id="description" v-model="secret.description" aria-describedby="description-help" />
				</FormField>
			</div>
		</Panel>
	</form>
</template>