<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Page from '../../components/Page.vue';
import { DataTable, Column, Button, useToast } from 'primevue';
import { useConfirm } from "primevue/useconfirm";
import { $api } from '../../services/api';
import { useRouter } from 'vue-router';
import type { ProcessDefinition } from '../../services/ProcessesService';

const $router = useRouter();
const confirm = useConfirm();
const items = ref<ProcessDefinition[]>();
const selectedItem = ref<ProcessDefinition | null>(null);
const loading = ref(false);
const toast = useToast();

const fetchData = async () => {
    loading.value = true;
    try {
        const data = await $api.processes.getAllProcessDefinitions();
        items.value = data;
    } catch (error) {
        console.log(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar los procesos', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const deployProcess = async (item: ProcessDefinition) => {
    try {
        await $api.processes.deployProcess(item._id as string);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Proceso desplegado exitosamente!', life: 3000 });
        fetchData();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al desplegar el proceso', life: 3000 });
    }
};

onMounted(async () => {
    fetchData();
});
</script>

<template>
    <Page title="Procesos">
        <template v-slot:actions>
            <Button variant="text" size="" rounded icon="pi pi-refresh" @click="fetchData" />
            <Button severity="secondary" label="Add" icon="pi pi-plus" @click="$router.push({ name: 'ProcessNew' })" />
            <Button
                severity="secondary"
                :disabled="!selectedItem"
                label="Edit"
                icon="pi pi-file-edit"
                @click="$router.push({ name: 'ProcessEdit', params: { id: selectedItem?.id } })"
            />
            <Button
                :disabled="!selectedItem"
                label="Start" 
                icon="pi pi-play" 
                @click="$router.push({ name: 'ProcessStart', params: { id: selectedItem?.id }})" 
            />
            <Button
                severity="info"
                :disabled="!selectedItem"
                label="Deploy"
                icon="pi pi-upload"
                @click="deployProcess(selectedItem as ProcessDefinition)"
            />
        </template>

        <DataTable
            v-model:selection="selectedItem"
            :value="items"
            :loading="loading"
            selectionMode="single"
            dataKey="_id"
            class="rounded-2xl!"
        >
            <Column field="id" header="Process ID"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="description" header="Description"></Column>
            <Column field="version" header="Version"></Column>
            <Column field="createdAt" header="Created At">
                <template #body="{ data }">
                    {{ new Date(data.createdAt).toLocaleString() }}
                </template>
            </Column>
        </DataTable>

        <router-view />
    </Page>
</template>