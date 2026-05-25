<script setup lang="ts">
import { DataTable, Column, Button, InputText, Tag } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { $api } from '@services/api';
import type { Task } from '@services/TasksService';
import { onMounted, ref, watch } from 'vue';

const emit = defineEmits(['select']);

const tasks = ref<Task[]>([]);
const selectedTask = ref<Task | null>(null);
const search = ref('');
const loading = ref(false);

// ── Urgency helpers ─────────────────────────────────────────────────────────

type Urgency = 'overdue' | 'today' | 'soon' | null;

function urgency(task: Task): Urgency {
    if (!task.dueDate) return null;
    const due  = dayjs(task.dueDate).startOf('day');
    const today = dayjs().startOf('day');
    const diff  = due.diff(today, 'day');
    if (diff < 0)  return 'overdue';
    if (diff === 0) return 'today';
    if (diff <= 3)  return 'soon';
    return null;
}

const urgencyLabel: Record<NonNullable<Urgency>, string>     = { overdue: 'Overdue', today: 'Due today', soon: 'Due soon' };
const urgencySeverity: Record<NonNullable<Urgency>, string>  = { overdue: 'danger',  today: 'warn',      soon: 'secondary' };

// ── Data fetching ────────────────────────────────────────────────────────────

const searchTask = async () => {
    loading.value = true;
    tasks.value = await $api.tasks.getAvailableTasks(search.value);
    loading.value = false;
};

const getTasks = async () => {
    const selectedCopy = selectedTask.value;

    loading.value = true;
    tasks.value = await $api.tasks.getAvailableTasks();
    loading.value = false;

    if (selectedCopy) {
        setTimeout(() => {
            selectedTask.value = tasks.value.find(task => task.id === selectedCopy?.id) as Task;
        }, 700);
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
        emptyMessage="No tasks found."
        scrollHeight="calc(100vh - 152px)"
        selectionMode="single"
        v-model:selection="selectedTask"
        size="small"
        :paginator="tasks.length > 15"
        :rows="15"
        :rowsPerPageOptions="[15, 25, 50]"
    >
        <template #header>
            <div class="flex flex-row justify-between gap-2">
                <InputText
                    v-model="search"
                    placeholder="Search tasks…"
                    class="flex-1"
                    @keydown.enter="searchTask"
                />
                <Button icon="pi pi-refresh" text rounded title="Refresh" @click="getTasks" />
            </div>
        </template>

        <Column field="name" header="Task">
            <template #body="slotProps">
                <div class="flex flex-col py-1">
                    <!-- Task name + urgency badge -->
                    <div class="flex items-center gap-2">
                        <span class="text-(--layout-accent-color) font-medium">{{ slotProps.data.name }}</span>
                        <Tag
                            v-if="urgency(slotProps.data)"
                            :value="urgencyLabel[urgency(slotProps.data)!]"
                            :severity="urgencySeverity[urgency(slotProps.data)!]"
                            class="text-xs py-0"
                        />
                    </div>

                    <!-- Correlation key value (if set) -->
                    <div
                        v-if="slotProps.data.processInfo?.correlationKey"
                        class="text-sm font-semibold mt-0.5"
                    >
                        {{ slotProps.data.processInfo.correlationLabel }}:
                        {{ slotProps.data.variables?.find((v: any) => v.key === slotProps.data.processInfo.correlationKey)?.value }}
                    </div>

                    <!-- Process name -->
                    <div class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {{ slotProps.data.processName ?? slotProps.data.processInfo?.name }}
                    </div>

                    <!-- Created ago + due date -->
                    <div class="flex justify-between text-xs font-light italic mt-0.5">
                        <span>Created {{ dayjs(slotProps.data.createdAt).fromNow() }}</span>
                        <span v-if="slotProps.data.dueDate" :class="{
                            'text-red-500 font-semibold not-italic': urgency(slotProps.data) === 'overdue',
                            'text-orange-500 font-semibold not-italic': urgency(slotProps.data) === 'today',
                        }">
                            Due {{ dayjs(slotProps.data.dueDate).fromNow() }}
                        </span>
                    </div>
                </div>
            </template>
        </Column>
    </DataTable>
</template>
