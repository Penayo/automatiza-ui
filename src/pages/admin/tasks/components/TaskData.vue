<script setup lang="ts">
import { Tag, useToast } from 'primevue';
import TaskSchedule from '@pages/frontoffice/my-tasks/components/TaskSchedule.vue';
import type { Task } from "@services/TasksService"
import { $api } from '@services/api';

const props = defineProps<{
    task: Task | null,
}>();
const emit = defineEmits(['refresh']);

const toast = useToast();

async function updateTask(key: string, value: string) {
    // Implement API call to update task
    try {
        await $api.tasks.put(props.task?.id as string, {
            [key]: value
        });
        toast.add({ severity: 'success', summary: 'Task updated', detail: `${key} ha sido actualizada correctamente.`, life: 3000 });
        emit('refresh');
    } catch (error) {
        console.error('Error updating task:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: `Could not update ${key}.`, life: 3000 });
    }
}
</script>

<template>
    <div class="p-4">
        <div class="font-bold m-0 mb-3">Status: <Tag :severity="props.task?.status === 'COMPLETED' ? 'success' : 'warning'">{{ props.task?.status }}</Tag></div>
        <div class="font-bold m-0 mb-3">{{ props.task?.status === 'COMPLETED' ? 'Completed by:' : 'Assigned to:' }} <div class="text-normal">{{ props.task?.assignment?.assignee ?? 'Unassigned' }}</div></div>
        <div class="font-bold m-0 mb-3">Created: <div class="text-normal">{{ props.task?.createdAt }}</div></div>
        <div class="font-bold m-0 mb-3">Completed: <div class="text-normal">{{ props.task?.completedAt }}</div></div>
        <TaskSchedule label="Due date" :value="props.task?.assignment?.dueDate" @date-set="d => updateTask('dueDate', d?.toISOString())" :enabled="props.task?.status !== 'COMPLETED'" />
        <TaskSchedule label="Follow-up date" :value="props.task?.assignment?.followUpDate" @date-set="d => updateTask('followUpDate', d?.toISOString())" :enabled="props.task?.status !== 'COMPLETED'" />
        <div class="font-bold m-0 mb-3">Candidate groups: <div class="text-normal">{{ props.task?.assignment?.candidateGroups }}</div></div>
        <div class="font-bold m-0 mb-3">Candidate users: <div class="text-normal">{{ props.task?.assignment?.candidateUsers }}</div></div>
        <h3 class="font-bold m-0 mb-3">Documentation</h3>
        <div>{{ props.task?.documentation }}</div>
    </div>
</template>
