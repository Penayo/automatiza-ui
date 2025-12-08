<script setup lang="ts">
import { DataTable, Column, Button, InputText } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { $api } from '../../../services/api';
import type { Task } from '../../../services/TasksService';
import { onMounted, ref, watch } from 'vue';

const emit = defineEmits(['select']);

const tasks = ref<Task[]>([]);
const selectedTask = ref<Task | null>(null);
const search = ref('');
const loading = ref(false);

const searchTask = async () => {
    loading.value = true;
    tasks.value = await $api.tasks.getAvailableTasks(search.value);
    loading.value = false;
};

const getTasks = async () => {
    const selectedCopy = selectedTask.value
    // selected.value = null;

    loading.value = true;
    tasks.value = await $api.tasks.getAvailableTasks();
    loading.value = false;
    
    if (selectedCopy) {
        setTimeout(() => {
            selectedTask.value = tasks.value.find(task => task.id == selectedCopy?.id) as Task;
        }, 700)
    }
};

watch(selectedTask, (newVal) => {
    emit('select', newVal);
});

onMounted(getTasks);
defineExpose({ getTasks });
</script>

<template>
    <DataTable
        class="w-full"
        :value="tasks"
        dataKey="id"
        :loading="loading"
        emptyMessage="No Tasks found!."
        scrollHeight="calc(100vh - 152px)"
        selectionMode="single"
        v-model:selection="selectedTask"
        size="small"
        :paginator="tasks.length > 15"
        :rows="15"
        :rowsPerPageOptions="[15, 25, 50]"
    >
        <template #header>
            <div class="flex flex-row justify-between">
                <div class="col-10">
                    <InputText
                        v-model="search"
                        placeholder="Search"
                        class="w-full"
                        @keydown.enter="searchTask"
                    />
                </div>
                <div class="col-2">
                    <div class="flex flex-wrap justify-content-end gap-2">
                        <Button icon="pi pi-refresh" text rounded title="Refresh List" @click="getTasks" />
                    </div>
                </div>
            </div>
        </template>
    
        <Column field="name" header="Task Name">
            <template #body="slotProps">
                <div class="flex flex-col py-1 justify-start">
                    <div class="col-12 pl-2 pb-0 text-lg list-title text-emerald-500">{{ slotProps.data.name }}</div>
                    <div
                        v-if="slotProps.data.processInfo?.correlationKey"
                        class="col-12 pl-2 font-thin text-sm text-emerald-500"
                    >
                        <span>{{ slotProps.data.processInfo.correlationLabel }}:</span>
                        {{ slotProps.data.variables?.[slotProps.data.processInfo.correlationKey] }}
                    </div>
                    <div class="col-12 pl-2 text-xs font-bold">{{ slotProps.data.processName ?? slotProps.data.processInfo.name }}</div>
                    <div class="col-12 pl-2 text-xs font-light italic">Created {{ dayjs(slotProps.data.createdAt).fromNow() }}</div>
                </div>
            </template>
        </Column>
    </DataTable>
</template>