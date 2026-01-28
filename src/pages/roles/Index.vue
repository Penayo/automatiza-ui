<script setup lang="ts">
import { onMounted, ref, watch } from 'vue' ;
import Page from '../../components/Page.vue' ;
import { DataTable, Column, Button, useToast } from 'primevue' ;
import { useConfirm } from "primevue/useconfirm";
import { $api, type IRole, type PageResponse } from '../../services/api' ;
import { onDelete } from '../../utils/common';
import { useRouter } from 'vue-router';
import type { RoleRequestQuery } from '../../services/RoleService';

const $router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const pageRef = ref<InstanceType<typeof Page>>();
const items = ref<PageResponse<IRole>>();
const selectedItem = ref<IRole | null>(null);
const loading = ref(false);
const search = ref('');
const rowsPerPage = ref(15);
const params = ref({ page: 1, rowsPerPage: rowsPerPage.value });

const fetchData = async () => {
	loading.value = true;
	const pageRequest: RoleRequestQuery = { ...params.value };
	pageRequest.search = search.value;

	try {
		const data = await $api.roles.fetchRoles(pageRequest);
		items.value = data as PageResponse<IRole>;
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error fetching roles', life: 3000 });
	} finally {
		loading.value = false;
	}
}

const onCreated = (role: unknown) => {
	console.log({ role })
	toast.add({ severity: 'success', summary: 'Success', detail: 'Role Created!', life: 3000 });
	fetchData();
}

const onDeleteConfirm = async (item: IRole) => {
	try {
		await $api.roles.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Role deleted successfully', life: 3000 });
		setTimeout(() => { fetchData() }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting role', life: 3000 });
		// Error is already registered in session storage
	}
}

const onPageChange = ({ page, rows }: { page: number, rows: number }) => {
	rowsPerPage.value = rows
	params.value = { page: page + 1, rowsPerPage: rows }
	fetchData();
};

watch(selectedItem, () => {
	console.log('ITEM CHANGED', selectedItem.value)
})

onMounted(async () => {
	fetchData()
})
</script>

<template>
	<Page title="Roles Page" ref="pageRef">

		<template v-slot:actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" />
			<Button label="Add" icon="pi pi-plus" @click="$router.push({ name: 'RolesNew' })" />
			<Button severity="secondary" :disabled="!selectedItem" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'RolesEdit', params: { id: selectedItem?._id }})" />
			<Button severity="secondary" :disabled="!selectedItem" label="Show" icon="pi pi-eye" @click="$router.push({ name: 'RolesShow', params: { id: selectedItem?._id }})" />
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
			dataKey="_id"
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
		</DataTable>

		<router-view @created="onCreated" />
	</Page>
</template>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>