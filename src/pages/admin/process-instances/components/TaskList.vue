<script setup lang="ts">
import { Accordion, AccordionContent, AccordionHeader, AccordionPanel, Badge, Button, useToast, useConfirm } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);
import { $api } from '@services/api';
import type { Task } from '@services/TasksService';
import JsonEditor from 'vue3-ts-jsoneditor';
import { ref, watch } from 'vue';
import EditVariablesDialog from '@pages/admin/tasks/components/EditVariablesDialog.vue';
import EditServiceConfigDialog from '@pages/admin/tasks/components/EditServiceConfigDialog.vue';
import ReplayFromTaskDialog from '@pages/admin/tasks/components/ReplayFromTaskDialog.vue';

const props = defineProps<{ processInstanceId?: string }>();

const toast   = useToast();
const confirm = useConfirm();
const tasks      = ref<Task[]>([]);
const loading    = ref(false);
const retryingId = ref<string | null>(null);

// ── Retry (quick, no variable changes) ────────────────────────────────────────

async function retryTask(task: Task, event: MouseEvent) {
    event.stopPropagation();
    retryingId.value = task.id;
    try {
        await $api.tasks.retryTask(task.id);
        toast.add({ severity: 'success', summary: 'Retry triggered', detail: `"${task.name}" is being re-executed.`, life: 4000 });
        setTimeout(loadTasks, 1500);
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Retry failed', detail: err?.response?.data?.message ?? 'Could not retry task.', life: 4000 });
    } finally {
        retryingId.value = null;
    }
}

// ── Replay dialog ─────────────────────────────────────────────────────────────

const replayDialogVisible = ref(false);
const replayTask          = ref<Task | null>(null);
const replayMode          = ref<'retry' | 'replay'>('replay');

function openReplayDialog(task: Task, mode: 'retry' | 'replay', event: MouseEvent) {
    event.stopPropagation();
    replayTask.value          = task;
    replayMode.value          = mode;
    replayDialogVisible.value = true;
}

// ── Edit Variables ────────────────────────────────────────────────────────────

const variablesDialogVisible = ref(false);
const variablesTask          = ref<Task | null>(null);

function openVariables(task: Task, event: MouseEvent) {
    event.stopPropagation();
    variablesTask.value          = task;
    variablesDialogVisible.value = true;
}

// ── Edit Service Config ───────────────────────────────────────────────────────

const serviceConfigDialogVisible = ref(false);
const serviceConfigTask          = ref<Task | null>(null);

function openServiceConfig(task: Task, event: MouseEvent) {
    event.stopPropagation();
    serviceConfigTask.value          = task;
    serviceConfigDialogVisible.value = true;
}

// ── Delete ────────────────────────────────────────────────────────────────────

function confirmDelete(task: Task, event: MouseEvent) {
    event.stopPropagation();
    confirm.require({
        message: `Delete task "${task.name}"? This cannot be undone and will NOT advance the process.`,
        header: 'Delete Task',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Delete',
        acceptClass: 'p-button-danger',
        accept: async () => {
            try {
                await $api.tasks.deleteTask(task.id);
                toast.add({ severity: 'success', summary: 'Task deleted', life: 3000 });
                await loadTasks();
            } catch {
                toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete task.', life: 4000 });
            }
        },
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusSeverity: Record<string, 'success' | 'danger' | 'warn' | 'info' | 'secondary'> = {
    COMPLETED: 'success',
    FAILED:    'danger',
    WAITING:   'warn',
    SCHEDULED: 'warn',
    CREATED:   'info',
    RUNNING:   'info',
};

function taskIcon(type: string) {
    if (type === 'bpmn:UserTask')         return 'pi pi-user';
    if (type === 'bpmn:ServiceTask')      return 'pi pi-cog';
    if (type === 'bpmn:ScriptTask')       return 'pi pi-code';
    if (type === 'bpmn:BusinessRuleTask') return 'pi pi-table';
    return 'pi pi-bolt';
}

async function loadTasks() {
    if (!props.processInstanceId) return;
    loading.value = true;
    try {
        tasks.value = await $api.processes.getInstanceTasks(props.processInstanceId) as Task[];
    } finally {
        loading.value = false;
    }
}

watch(() => props.processInstanceId, loadTasks, { immediate: true });

defineExpose({ reload: loadTasks });
</script>

<template>
    <Accordion class="-mx-3" multiple>
        <AccordionPanel v-for="task in tasks" :key="task.id" :value="task.id">
            <AccordionHeader>
                <div class="flex items-center gap-2 w-full pr-2">
                    <i :class="[taskIcon(task.type), 'text-surface-400 shrink-0']" />
                    <span class="font-bold">{{ task.name ?? task.taskDefinitionId }}</span>
                    <div class="ml-auto flex items-center gap-2 shrink-0">
                        <Badge
                            :value="task.status"
                            :severity="statusSeverity[task.status] ?? 'secondary'"
                            class="font-mono text-xs"
                        />
                        <!-- Quick retry — FAILED automated tasks only -->
                        <Button
                            v-if="task.status === 'FAILED' && task.type !== 'bpmn:UserTask'"
                            icon="pi pi-refresh"
                            size="small"
                            severity="warn"
                            text
                            label="Retry"
                            v-tooltip.top="'Quick retry — same variables'"
                            :loading="retryingId === task.id"
                            @click="retryTask(task, $event)"
                        />
                        <!-- Retry with variable overrides — FAILED automated tasks -->
                        <Button
                            v-if="task.status === 'FAILED' && task.type !== 'bpmn:UserTask'"
                            icon="pi pi-sliders-v"
                            size="small"
                            severity="warn"
                            text
                            rounded
                            v-tooltip.top="'Retry with variable overrides'"
                            @click="openReplayDialog(task, 'retry', $event)"
                        />
                        <!-- Replay from checkpoint — COMPLETED or FAILED automated tasks -->
                        <Button
                            v-if="['COMPLETED', 'FAILED'].includes(task.status) && task.type !== 'bpmn:UserTask'"
                            icon="pi pi-history"
                            size="small"
                            severity="secondary"
                            text
                            rounded
                            v-tooltip.top="'Replay from this task (rewinds process)'"
                            @click="openReplayDialog(task, 'replay', $event)"
                        />
                        <!-- Edit service config -->
                        <Button
                            icon="pi pi-cog"
                            size="small"
                            severity="secondary"
                            text
                            rounded
                            v-tooltip.top="'Edit service config'"
                            @click="openServiceConfig(task, $event)"
                        />
                        <!-- Edit variables -->
                        <Button
                            icon="pi pi-sliders-h"
                            size="small"
                            severity="secondary"
                            text
                            rounded
                            v-tooltip.top="'Edit variables'"
                            @click="openVariables(task, $event)"
                        />
                        <!-- Delete -->
                        <Button
                            icon="pi pi-trash"
                            size="small"
                            severity="danger"
                            text
                            rounded
                            v-tooltip.top="'Delete task'"
                            @click="confirmDelete(task, $event)"
                        />
                    </div>
                </div>
            </AccordionHeader>
            <AccordionContent>
                <JsonEditor
                    :modelValue="task"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :statusBar="false"
                    :darkTheme="true"
                    :readOnly="true"
                    height="300"
                />
            </AccordionContent>
        </AccordionPanel>
    </Accordion>

    <!-- Variables dialog -->
    <EditVariablesDialog
        v-model:visible="variablesDialogVisible"
        :task="variablesTask"
        @saved="loadTasks"
    />

    <!-- Service config dialog -->
    <EditServiceConfigDialog
        v-model:visible="serviceConfigDialogVisible"
        :task="serviceConfigTask"
        @saved="loadTasks"
    />

    <!-- Replay / retry-with-overrides dialog -->
    <ReplayFromTaskDialog
        v-model:visible="replayDialogVisible"
        :task="replayTask"
        :mode="replayMode"
        @done="loadTasks"
    />
</template>
