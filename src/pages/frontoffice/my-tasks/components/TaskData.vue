<script setup lang="ts">
import { Tag, useToast } from 'primevue';
import TaskSchedule from '@pages/frontoffice/my-tasks/components/TaskSchedule.vue';
import type { Task } from "@services/TasksService"
import { $api } from '@services/api';

const props = defineProps<{ task: Task | null }>();
const emit  = defineEmits(['refresh']);
const toast = useToast();

async function updateTask(key: string, value: string) {
    try {
        await $api.tasks.put(props.task?.id as string, { [key]: value });
        toast.add({ severity: 'success', summary: 'Task updated', detail: `${key} updated successfully.`, life: 3000 });
        emit('refresh');
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: `Could not update ${key}.`, life: 3000 });
    }
}
</script>

<template>
    <div class="p-4 space-y-3 text-sm">
        <div class="flex items-center gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Status</span>
            <Tag :severity="props.task?.status === 'COMPLETED' ? 'success' : 'warning'">{{ props.task?.status }}</Tag>
        </div>

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">
                {{ props.task?.status === 'COMPLETED' ? 'Completed by' : 'Claimed by' }}
            </span>
            <span>{{ props.task?.claimedBy ?? '—' }}</span>
        </div>

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Created</span>
            <span>{{ props.task?.createdAt ? new Date(props.task.createdAt).toLocaleString() : '—' }}</span>
        </div>

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Completed at</span>
            <span>{{ props.task?.completedAt ? new Date(props.task.completedAt).toLocaleString() : '—' }}</span>
        </div>

        <TaskSchedule
            label="Due date"
            :value="props.task?.dueDate"
            @date-set="d => updateTask('dueDate', d?.toISOString())"
            :enabled="props.task?.status !== 'COMPLETED'" />

        <TaskSchedule
            label="Follow-up date"
            :value="props.task?.followUpDate"
            @date-set="d => updateTask('followUpDate', d?.toISOString())"
            :enabled="props.task?.status !== 'COMPLETED'" />

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Candidate groups</span>
            <span>{{ props.task?.candidateGroups?.join(', ') || '—' }}</span>
        </div>

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Candidate users</span>
            <span>{{ props.task?.candidateUsers?.join(', ') || '—' }}</span>
        </div>

        <div v-if="props.task?.documentation">
            <p class="font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Documentation</p>
            <p class="text-zinc-700 dark:text-zinc-300">{{ props.task.documentation }}</p>
        </div>
    </div>
</template>
