<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Page from '@components/Page.vue';
import { DataTable, Column, Button, useToast } from 'primevue';
import { useConfirm } from "primevue/useconfirm";
import { $api, type ISecret, type PageResponse } from '@services/api';
import { onDelete } from '@/utils/common';
import { useRouter } from 'vue-router';
import type { SecretRequestQuery } from '@services/SecretsService';

const $router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const pageRef = ref<InstanceType<typeof Page>>();
const items = ref<PageResponse<ISecret>>();
const selectedItem = ref<ISecret | null>(null);
const loading = ref(false);
const search = ref('');
const rowsPerPage = ref(15);
const params = ref<SecretRequestQuery>({ page: 1, rowsPerPage: rowsPerPage.value });

const fetchData = async () => {
	loading.value = true;
	const pageRequest = { ...params.value };
	pageRequest.search = search.value;

	try {
		const data = await $api.secrets.fetchSecrets(pageRequest);
		items.value = data;
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error fetching secrets', life: 3000 });
	} finally {
		loading.value = false;
	}
}

const onCreated = (secret: unknown) => {
	console.log({ secret })
	toast.add({ severity: 'success', summary: 'Success', detail: 'Secret Created!', life: 3000 });
	fetchData();
}

const onDeleteConfirm = async (item: ISecret) => {
	try {
		await $api.secrets.deleteSecret(item.key)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Secret deleted successfully', life: 3000 });
		setTimeout(() => { fetchData() }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting secret', life: 3000 });
		// Error is already registered in session storage
	}
}

const onPageChange = ({ page, rows }: { page: number, rows: number }) => {
	rowsPerPage.value = rows
	params.value = { page: page + 1, rowsPerPage: rows }
	fetchData();
};

onMounted(async () => {
	fetchData()
})
</script>

<template>
	<Page title="Secrets Page" ref="pageRef">

		<template v-slot:actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" />
			<Button label="Add" icon="pi pi-plus" @click="$router.push({ name: 'SecretsNew' })" />
			<Button severity="secondary" :disabled="!selectedItem" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'SecretsEdit', params: { key: selectedItem?.key }})" />
			<Button
				severity="danger"
				:disabled="!selectedItem"
				rounded
				icon="pi pi-trash"
				@click="onDelete(confirm, selectedItem, onDeleteConfirm)"
			/>
		</template>

		<DataTable
			v-model:selection="selectedItem"
			selectionMode="single"
			dataKey="key"
			class="rounded-2xl!"
			:totalRecords="items?.totalRecords"
			:loading="loading"
			:value="items?.rows"
			:paginator="(items?.totalRecords || 0) / rowsPerPage > 1"
			:rows="rowsPerPage"
			:rowsPerPageOptions="[5, 10, 20, 40]"
			@page="onPageChange"
			:lazy="true"
			scrollable
			:scrollHeight="(pageRef?.$el.clientHeight - 143) + 'px'"
		>
			<Column field="key" header="Key"></Column>
			<Column field="description" header="Description"></Column>
			<Column field="createdAt" header="Created At">
				<template #body="slotProps">
					{{ new Date(slotProps.data.createdAt).toLocaleDateString() }}
				</template>
			</Column>
		</DataTable>

		<router-view @created="onCreated" />
	</Page>
</template>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>