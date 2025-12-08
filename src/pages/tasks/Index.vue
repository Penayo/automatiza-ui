<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Page from '../../components/Page.vue';
import { DataTable, Column, Button, useToast } from 'primevue';
import { useConfirm } from "primevue/useconfirm";
import { $api } from '../../services/api';
import { useRouter } from 'vue-router';
import type { Task } from '../../services/TasksService';

const $router = useRouter();
const confirm = useConfirm();
const items = ref<Task[]>();
const selectedItem = ref<Task | null>(null);
const loading = ref(false);
const toast = useToast();

const fetchData = async () => {
    loading.value = true;
    try {
        const data = await $api.tasks.getAllTasks();
        items.value = data;
    } catch (error) {
        console.log(error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al cargar las tareas', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const claimTask = async (task: Task) => {
    try {
        await $api.tasks.claimTask(task.id);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Tarea reclamada exitosamente!', life: 3000 });
        fetchData();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al reclamar la tarea', life: 3000 });
    }
};

const unclaimTask = async (task: Task) => {
    try {
        await $api.tasks.unclaimTask(task.id);
        toast.add({ severity: 'success', summary: 'Success', detail: 'Tarea liberada exitosamente!', life: 3000 });
        fetchData();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error al liberar la tarea', life: 3000 });
    }
};

onMounted(async () => {
    fetchData();
});
</script>

<template>
    <Page title="Tareas">
        <template v-slot:actions>
        <Button variant="text" size="" rounded icon="pi pi-refresh" @click="fetchData" />
        <Button 
            severity="secondary" 
            :disabled="!selectedItem" 
            label="Complete" 
            icon="pi pi-check" 
            @click="$router.push({ name: 'TaskComplete', params: { id: selectedItem?.id } })" 
        />
        <Button
            v-if="!selectedItem?.claimedBy"
            severity="info"
            :disabled="!selectedItem"
            label="Claim"
            icon="pi pi-user"
            @click="claimTask(selectedItem as Task)"
        />
        <Button
            v-else
            severity="warning"
            :disabled="!selectedItem"
            label="Unclaim"
            icon="pi pi-user-minus"
            @click="unclaimTask(selectedItem as Task)"
        />
        </template>

        <DataTable
            scrollable
            scrollHeight="400px"
            tableStyle="min-width: 50rem"
            v-model:selection="selectedItem"
            :value="items"
            :loading="loading"
            selectionMode="single"
            dataKey="id"
            class="rounded-2xl!"
        >
            <Column field="name" header="Name"></Column>
            <Column field="processName" header="Process"></Column>
            <Column field="type" header="Type"></Column>
            <Column field="status" header="Status"></Column>
            <Column field="priority" header="Priority"></Column>
            <Column field="assignee" header="Assignee"></Column>
            <Column field="createdAt" header="Created At">
                <template #body="{ data }">
                {{ new Date(data.createdAt).toLocaleString() }}
                </template>
            </Column>
            <Column field="dueDate" header="Due Date">
                <template #body="{ data }">
                {{ data.dueDate ? new Date(data.dueDate).toLocaleString() : '-' }}
                </template>
            </Column>
        </DataTable>

        <router-view />
    </Page>
</template>