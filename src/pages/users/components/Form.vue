<script setup lang="ts">
	import { onMounted, ref, watch } from 'vue';
	import { InputText, Password, Panel } from 'primevue';
	import z from 'zod';
	import { parseZodError, type FormErrorMap } from '../../../utils/error';
	import FormField from '../../../components/form/FormField.vue';
	import type { IUser, IPerson } from '../../../services/api';

	const props = defineProps(['defaultValues'])
	const $emit = defineEmits(['submit'])

	const formSchema = z.object({
		username: z.string()
			.min(3, 'El nombre de usuario debe tener al menos 3 letras')
			.max(50, 'El nombre de usuario no puede tener mas de 50 caracteres'),
		email: z.email('El email debe ser válido'),
		password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
		person: z.object({
			firstName: z.string().min(1, 'El nombre es requerido'),
			lastName: z.string().min(1, 'El apellido es requerido'),
			documentId: z.string().min(1, 'El documento de identidad es requerido')
		})
	})

	const validationError = ref<FormErrorMap | null>(null);

	const user = ref<IUser>({
		username: '',
		email: '',
		password: '',
		person: {
			type: 'NaturalPerson',
			firstName: '',
			lastName: '',
			documentId: '',
		},
		roles: [],
		groups: [],
		tenantId: ''
	})

	async function handleFormSubmit () {
		console.log('handling submit')

		try {
			formSchema.parse(user.value);
			$emit('submit', user.value);
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
			user.value = props.defaultValues;

			if (!user.value.person)
				user.value.person = {
					type: 'NaturalPerson',
					firstName: '',
					lastName: '',
					documentId: '',
				}
		}
	}

	watch(() => props.defaultValues, assignDefaultValues)

	onMounted(assignDefaultValues)
</script>

<template>
	<form class="flex flex-col gap-3">
        <Panel header="Personal Data" class="mt-4">
            <div class="grid grid-cols-2 gap-4">
				<div>
					<FormField label="Document ID" label-for="documentId" :error="(validationError?.person as FormErrorMap)?.documentId">
						<InputText id="documentId" v-model="user.person.documentId" aria-describedby="documentId-help" />
					</FormField>
				</div>
				<div>
				</div>

				<div>
					<FormField label="First Name" label-for="firstName" :error="(validationError?.person as FormErrorMap)?.firstName">
						<InputText id="firstName" v-model="user.person.firstName" aria-describedby="firstName-help" />
					</FormField>
				</div>
				<div>
					<FormField label="Last Name" label-for="lastName" :error="(validationError?.person as FormErrorMap)?.lastName">
						<InputText id="lastName" v-model="user.person.lastName" aria-describedby="lastName-help" />
					</FormField>
				</div>
			</div>
		</Panel>

		<Panel header="User Information" class="mt-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<FormField label="Username" label-for="username" :error="validationError?.username">
						<InputText id="username" v-model="user.username" aria-describedby="username-help" />
					</FormField>
				</div>
				<div>
					<FormField label="Email" label-for="email" :error="validationError?.email">
						<InputText id="email" v-model="user.email" aria-describedby="email-help" />
					</FormField>
				</div>
				<div>
					<FormField label="Password" label-for="password" :error="validationError?.password">
						<Password id="password" v-model="user.password" aria-describedby="password-help" />
					</FormField>
				</div>
			</div>
		</Panel>
	</form>
</template>