<script setup lang="ts">
import { onMounted, ref, watch } from 'vue' ;
import Page from '../../components/Page.vue' ;
import { DataTable, Column, Button, useToast } from 'primevue' ;
import { useConfirm } from "primevue/useconfirm";
import { $api, type IPermission, type PageResponse } from '../../services/api' ;
import { onDelete, onApprove } from '../../utils/common';
import { useRouter } from 'vue-router';
import router from '../../router';
import type { PermissionQuery } from '../../services/PermissionService';

const $router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const pageRef = ref<InstanceType<typeof Page>>();
const items = ref<PageResponse<IPermission>>();
const selectedItem = ref<IPermission | null>(null);
const loading = ref(false);
const search = ref('');
const rowsPerPage = ref(15);
const params = ref({ page: 1, rowsPerPage: rowsPerPage.value });

const fetchData = async () => {
	loading.value = true;
	const pageRequest: PermissionQuery = { ...params.value };
	pageRequest.search = search.value;

	try {
		const data = await $api.permissions.fetchPermissions(pageRequest);
		items.value = data as PageResponse<IPermission>;
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error fetching permissions', life: 3000 });
	} finally {
		loading.value = false;
	}
}

const onCreated = (permission: unknown) => {
	console.log({ permission })
	toast.add({ severity: 'success', summary: 'Success', detail: 'Permission Created!', life: 3000 });
	fetchData();
}

const onDeleteConfirm = async (item: IPermission) => {
	try {
		await $api.permissions.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Permission deleted successfully', life: 3000 });
		setTimeout(() => { fetchData() }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting permission', life: 3000 });
		// Error is already registered in session storage
	}
}

const createPermissionsFromRoutes = async () => {
	try {
		const routes = router.getRoutes();
		const permissionsToCreate: IPermission[] = [];

		for (const route of routes) {
			if (route.name && typeof route.name === 'string') {
				// Skip login route and routes without components (like children)
				if (route.name === 'Login' || !route.components?.default) continue;

				const permission: IPermission = {
					type: 'view',
					name: route.name,
					description: `Access to ${route.name} view`
				};
				permissionsToCreate.push(permission);
			}
		}

		// Create permissions in batch
		for (const permission of permissionsToCreate) {
			try {
				await $api.permissions.createPermission(permission);
			} catch (error) {
				console.log(`Failed to create permission for ${permission.name}:`, error);
			}
		}

		toast.add({ severity: 'success', summary: 'Success', detail: 'Permissions created from routes!', life: 3000 });
		fetchData();
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to create permissions from routes', life: 3000 });
		console.log(error);
	}
}

const onCreatePermissionsFromRoutes = () => {
	onApprove(
		confirm,
		'This will create permissions for all application routes. Continue?',
		createPermissionsFromRoutes,
		{ acceptPropsLabel: 'Create Permissions', acceptPropsSeverity: 'success' }
	);
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
	console.log('Page size', pageRef.value?.$el.clientHeight)
})
</script>

<template>
	<Page title="Permissions Page" ref="pageRef">

		<template v-slot:actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" />
			<Button label="Create from Routes" icon="pi pi-plus-circle" severity="info" @click="onCreatePermissionsFromRoutes" />
			<Button label="Add" icon="pi pi-plus" @click="$router.push({ name: 'PermissionsNew' })" />
			<Button severity="secondary" :disabled="!selectedItem" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'PermissionsEdit', params: { id: selectedItem?._id }})" />
			<Button severity="secondary" :disabled="!selectedItem" label="Show" icon="pi pi-eye" @click="$router.push({ name: 'PermissionsShow', params: { id: selectedItem?._id }})" />
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
			<Column field="type" header="Type"></Column>
			<Column field="name" header="Name"></Column>
			<Column field="description" header="Description"></Column>
		</DataTable>

		<router-view @created="onCreated" />
	</Page>
</template>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>