<script setup lang="ts">
import { onMounted, ref, watch } from 'vue' ;
import Page from '../../components/Page.vue' ;
import { DataTable, Column, Button, useToast } from 'primevue' ;
import { useConfirm } from "primevue/useconfirm";
import { $api, type IVariable } from '../../services/api' ;
import { onDelete } from '../../utils/common';

const confirm = useConfirm();
const toast = useToast();
const items = ref<IVariable[]>();
const selectedItem = ref<IVariable | null>(null);
const loading = ref(false);

const fetchData = async () => {
	loading.value = true;
	const data = await $api.variables.fetch();

	loading.value = false;
	items.value = data;
}

const onCreated = (variable: unknown) => {
	console.log({ variable })
	toast.add({ severity: 'success', summary: 'Success', detail: 'Variable Agregada!', life: 3000 });
	fetchData();
}

const deleteItem = async (item: IVariable) => {
	try {
		await $api.variables.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Item eliminado correctamente', life: 3000 });
		setTimeout(() => { fetchData() }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al eliminar el item', life: 3000 });
		// Error is already registered in session storage
	}
}

watch(selectedItem, () => {
	console.log('ITEM CHANGED', selectedItem.value)
})

onMounted(async () => {
	fetchData()
})
</script>

<template>
	<Page title="Variables Page">

		<template v-slot:actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" />
			<Button label="Add" icon="pi pi-plus" @click="$router.push({ name: 'VariablesNew' })" />
			<Button severity="secondary" :disabled="!selectedItem" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'VariablesEdit', params: { id: selectedItem?._id }})" />
			<Button
				severity="danger"
				:disabled="!selectedItem"
				rounded
				icon="pi pi-trash"
				@click="onDelete(confirm, selectedItem, deleteItem)"
			/>
		</template>

		<DataTable
			v-model:selection="selectedItem"
			:value="items"
			selectionMode="single"
			dataKey="_id"
			class="rounded-2xl!"
			:loading="loading"
		>
			<Column field="name" header="Name"></Column>
			<Column field="value" header="Value"></Column>
			<Column field="type" header="Type"></Column>
		</DataTable>

		<router-view @created="onCreated" />

	</Page>
</template>

<style scoped>
/* No additional styles needed, Tailwind handles responsiveness */
</style>
