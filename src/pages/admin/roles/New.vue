<script setup lang="ts">
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useRouter } from 'vue-router';
import { $api } from '@services/api';
import Form from '@pages/admin/roles/components/Form.vue';
import type { IRole } from '@services/api';
import Page from '@components/Page.vue';
import { Button } from 'primevue';

const router  = useRouter();
const toast   = useToast();
const formRef = ref<typeof Form>();

async function handleFormSubmit (formValues: IRole) {
	try {
		await $api.roles.createRole(formValues);
		toast.add({ severity: 'success', summary: 'Role created', detail: `${formValues.key} was added successfully`, life: 3000 });
		setTimeout(() => router.push('/admin/roles'), 500);
	} catch (error: any) {
		const detail = error?.response?.data?.message ?? 'Could not create role';
		toast.add({ severity: 'error', summary: 'Error', detail, life: 5000 });
	}
}
</script>

<template>
	<Page title="New Role">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Roles
                </a>/
				New Role
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