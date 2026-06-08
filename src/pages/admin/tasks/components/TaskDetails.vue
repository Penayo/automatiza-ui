<script setup lang="ts">
import { Tabs, Tab, TabList, TabPanels, TabPanel, Button, useToast, useConfirm } from 'primevue';
import TaskData from '@pages/frontoffice/my-tasks/components/TaskData.vue';
import TaskForm from '@pages/frontoffice/my-tasks/components/TaskForm.vue';
import type { Task } from "@services/TasksService"
import { $api } from '@services/api';
import { onApprove } from '@/utils/common';
import TaskSchedule from './TaskSchedule.vue';
import DocumentsTab from '@components/data/DocumentsTab.vue';

function getShareLink(task: Task): string | null {
    if (!task.shareLink?.token || task.shareLink?.usedAt) return null;
    return `${window.location.origin}/task-form/${task.shareLink.token}`;
}

async function copyShareLink(task: Task) {
    const link = getShareLink(task);
    if (!link) return;
    try {
        await navigator.clipboard.writeText(link);
        toast.add({ severity: 'success', summary: 'Link copied', detail: 'Share link copied to clipboard.', life: 3000 });
    } catch {
        toast.add({ severity: 'info', summary: 'Share link', detail: link, life: 8000 });
    }
}

const toast   = useToast();
const confirm = useConfirm();

const props = defineProps<{ currentTask: Task | null }>();
const emit  = defineEmits(['refresh']);

async function claimTask() {
    onApprove(confirm, 'Are you sure you want to claim this task?', async () => {
        try {
            await $api.tasks.assignTask(props.currentTask?.id as string);
            emit('refresh');
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not claim the task.', life: 3000 });
        }
    });
}

async function unclaimTask() {
    onApprove(confirm, 'Are you sure you want to release this task?', async () => {
        try {
            await $api.tasks.unassignTask(props.currentTask?.id as string);
            emit('refresh');
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not release the task.', life: 3000 });
        }
    });
}

async function updateTask(key: string, value: string) {
    try {
        await $api.tasks.put(props.currentTask?.id as string, { [key]: value });
        toast.add({ severity: 'success', summary: 'Task updated', detail: `${key} updated successfully.`, life: 3000 });
        emit('refresh');
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: `Could not update ${key}.`, life: 3000 });
    }
}
</script>

<template>
    <!-- Empty state -->
    <div class="flex flex-col items-center justify-center p-4 m-4 h-full" v-if="!props.currentTask">
        <i class="pi pi-inbox text-zinc-300 dark:text-zinc-600" style="font-size: 3rem" />
        <h3 class="text-2xl text-zinc-400 dark:text-zinc-500 font-light mt-3">Select a task</h3>
        <p class="text-sm text-zinc-400 mt-1">Choose a task from the list to view its details.</p>
    </div>

    <!-- Task detail -->
    <div class="w-full" v-else>
        <div class="px-5 pt-4">
            <h3 class="text-(--layout-accent-color) text-2xl font-semibold">{{ props.currentTask?.name }}</h3>

            <div
                v-if="props.currentTask?.processInfo?.correlationKey"
                class="font-light text-(--layout-accent-color) pt-1"
            >
                {{ props.currentTask?.processInfo.correlationLabel }}:
                {{ props.currentTask?.variables?.find(v => v.key === props.currentTask?.processInfo.correlationKey)?.value }}
            </div>

            <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                {{ props.currentTask.processInfo?.name }}
            </p>

            <div class="flex flex-row justify-between items-start mt-3">
                <div class="flex flex-row gap-6 flex-wrap">
                    <TaskSchedule
                        label="Due date"
                        :value="props.currentTask?.dueDate"
                        @date-set="(d: Date) => updateTask('dueDate', d?.toISOString())"
                        :enabled="props.currentTask?.status !== 'COMPLETED'" />

                    <TaskSchedule
                        label="Follow-up"
                        :value="props.currentTask?.followUpDate"
                        @date-set="(d: Date) => updateTask('followUpDate', d?.toISOString())"
                        :enabled="props.currentTask?.status !== 'COMPLETED'" />
                </div>

                <div class="shrink-0 flex items-center gap-2">
                    <!-- Share link: shown when task has no candidates and token is not yet used -->
                    <Button
                        v-if="getShareLink(props.currentTask)"
                        v-tooltip.left="'Copy external form link'"
                        size="small"
                        severity="secondary"
                        icon="pi pi-share-alt"
                        @click="copyShareLink(props.currentTask)"
                    />
                    <!-- Token used badge -->
                    <span
                        v-else-if="props.currentTask?.shareLink?.token && props.currentTask?.shareLink?.usedAt"
                        class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                    >
                        <i class="pi pi-check text-[10px]" /> Submitted
                    </span>

                    <Button v-if="!props.currentTask?.assignee" size="small" @click="claimTask">Claim</Button>
                    <Button v-else size="small" severity="secondary" @click="unclaimTask">Release</Button>
                </div>
            </div>
        </div>

        <Tabs value="0" class="mt-2">
            <TabList>
                <Tab value="0">Form</Tab>
                <Tab value="1">Task details</Tab>
                <Tab value="2">History</Tab>
                <Tab value="3">Documents</Tab>
            </TabList>
            <TabPanels>
                <TabPanel value="0">
                    <TaskForm :task="props.currentTask" @refresh="emit('refresh')" />
                </TabPanel>
                <TabPanel value="1">
                    <TaskData :task="props.currentTask" @refresh="emit('refresh')" />
                </TabPanel>
                <TabPanel value="2">
                    <div class="flex flex-col items-center justify-center py-12 text-zinc-400">
                        <i class="pi pi-history text-3xl mb-2" />
                        <p class="text-sm">Change history coming soon.</p>
                    </div>
                </TabPanel>
                <TabPanel value="3">
                    <DocumentsTab :variables="props.currentTask?.variables" />
                </TabPanel>
            </TabPanels>
        </Tabs>
    </div>
</template>
