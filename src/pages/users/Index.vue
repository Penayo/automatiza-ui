<script setup lang="ts">
import { onMounted, ref, watch } from 'vue' ;
import Page from '../../components/Page.vue' ;
import { DataTable, Column, Button, useToast } from 'primevue' ;
import { useConfirm } from "primevue/useconfirm";
import { $api, type IUser, type PageResponse } from '../../services/api' ;
import { onDelete } from '../../utils/common';
import { useRouter } from 'vue-router';
import type { UsersRequestQuery } from '../../services/UserService';

const $router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const pageRef = ref<InstanceType<typeof Page>>();
const items = ref<PageResponse<IUser>>();
const selectedItem = ref<IUser | null>(null);
const loading = ref(false);
const search = ref('');
const rowsPerPage = ref(15);
const params = ref({ page: 1, rowsPerPage: rowsPerPage.value });

const fetchData = async () => {
	loading.value = true;
	const pageRequest: UsersRequestQuery = { ...params.value };
	pageRequest.search = search.value;

	try {
		const data = await $api.users.fetchUsers(pageRequest);
		items.value = data as PageResponse<IUser>;
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error fetching users', life: 3000 });
	} finally {
		loading.value = false;
	}
}

const onCreated = (user: unknown) => {
	console.log({ user })
	toast.add({ severity: 'success', summary: 'Success', detail: 'User Created!', life: 3000 });
	fetchData();
}

const onDeleteConfirm = async (item: IUser) => {
	try {
		await $api.users.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'User deleted successfully', life: 3000 });
		setTimeout(() => { fetchData() }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting user', life: 3000 });
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
	<Page title="Users Page" ref="pageRef">

		<template v-slot:actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" />
			<Button label="Add" icon="pi pi-plus" @click="$router.push({ name: 'UsersNew' })" />
			<Button severity="secondary" :disabled="!selectedItem" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'UsersEdit', params: { id: selectedItem?._id }})" />
			<Button severity="secondary" :disabled="!selectedItem" label="Show" icon="pi pi-eye" @click="$router.push({ name: 'UsersShow', params: { id: selectedItem?._id }})" />
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
			<Column field="person" header="Owner">
				<template #body="slotProps">
					{{ slotProps.data.person.firstName }} {{ slotProps.data.person.lastName }}
				</template>
			</Column>
			<Column field="username" header="Username"></Column>
			<Column field="email" header="Email"></Column>
			<Column field="status" header="Status"></Column>
			<Column field="roles" header="Roles"></Column>
		</DataTable>

		<router-view @created="onCreated" />
	</Page>
</template>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>