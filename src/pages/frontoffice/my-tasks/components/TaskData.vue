<script setup lang="ts">
import { Tag, Button, useToast } from 'primevue';
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

function getShareLink(task: Task | null): string | null {
    if (!task?.shareLink?.token || task.shareLink?.usedAt) return null;
    return `${window.location.origin}/task-form/${task.shareLink.token}`;
}

async function copyShareLink() {
    const link = getShareLink(props.task);
    if (!link) return;
    try {
        await navigator.clipboard.writeText(link);
        toast.add({ severity: 'success', summary: 'Copied', detail: 'Share link copied to clipboard.', life: 3000 });
    } catch {
        toast.add({ severity: 'info', summary: 'Share link', detail: link, life: 8000 });
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
            <span>{{ props.task?.assignment?.claimedBy ?? '—' }}</span>
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
            :value="props.task?.assignment?.dueDate"
            @date-set="d => updateTask('dueDate', d?.toISOString())"
            :enabled="props.task?.status !== 'COMPLETED'" />

        <TaskSchedule
            label="Follow-up date"
            :value="props.task?.assignment?.followUpDate"
            @date-set="d => updateTask('followUpDate', d?.toISOString())"
            :enabled="props.task?.status !== 'COMPLETED'" />

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Candidate groups</span>
            <span>{{ props.task?.assignment?.candidateGroups?.join(', ') || '—' }}</span>
        </div>

        <div class="flex items-start gap-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">Candidate users</span>
            <span>{{ props.task?.assignment?.candidateUsers?.join(', ') || '—' }}</span>
        </div>

        <div v-if="props.task?.documentation">
            <p class="font-semibold text-zinc-600 dark:text-zinc-400 mb-1">Documentation</p>
            <p class="text-zinc-700 dark:text-zinc-300">{{ props.task.documentation }}</p>
        </div>

        <!-- ── External share link ─────────────────────────────────────── -->
        <div v-if="props.task?.shareLink?.token" class="flex items-start gap-2 pt-1 border-t border-surface-100 dark:border-zinc-800 mt-2">
            <span class="font-semibold text-zinc-600 dark:text-zinc-400 w-36 shrink-0">External link</span>
            <div class="flex items-center gap-2 min-w-0">
                <!-- Not yet used -->
                <template v-if="!props.task.shareLink.usedAt">
                    <span class="truncate text-xs font-mono text-zinc-500 dark:text-zinc-400 max-w-xs">
                        {{ getShareLink(props.task) }}
                    </span>
                    <Button
                        size="small"
                        text
                        icon="pi pi-copy"
                        v-tooltip.top="'Copy link'"
                        class="shrink-0"
                        @click="copyShareLink"
                    />
                </template>
                <!-- Already submitted -->
                <span
                    v-else
                    class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                >
                    <i class="pi pi-check text-[10px]" /> Submitted
                </span>
            </div>
        </div>
    </div>
</template>
