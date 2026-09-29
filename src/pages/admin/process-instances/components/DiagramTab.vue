<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Badge, Splitter, SplitterPanel, useToast } from 'primevue';
import { $api } from '@services/api';
import type { Task } from '@services/TasksService';
import type { ProcessInstance } from '@services/ProcessesService';
import VariableList from '@components/data/VariableList.vue';
import CopyVariables from '@components/data/CopyVariables.vue';
import BpmnInstanceViewer from './BpmnInstanceViewer.vue';

const props = defineProps<{
    instance: ProcessInstance | undefined;
}>();

const toast         = useToast();
const tasks         = ref<Task[]>([]);
const loaded        = ref(false);
const selectedTask  = ref<Task | null>(null);

const STATUS_SEVERITY: Record<string, string> = {
    COMPLETED: 'success',
    FAILED:    'danger',
    WAITING:   'warn',
    SCHEDULED: 'warn',
    CREATED:   'info',
    RUNNING:   'info',
};

async function loadTasks() {
    if (loaded.value || !props.instance) return;
    try {
        tasks.value = await $api.processes.getAllInstanceTasks(props.instance.id);
        loaded.value = true;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load tasks for diagram.', life: 3000 });
    }
}

watch(() => props.instance, () => {
    loaded.value      = false;
    tasks.value       = [];
    selectedTask.value = null;
    loadTasks();
});

onMounted(loadTasks);

defineExpose({ loadTasks });
</script>

<template>
    <!-- Panel widths are drag-resizable and remembered per browser via stateKey. -->
    <Splitter
        class="h-full app-splitter border-0 rounded-none"
        :gutter-size="5"
        state-key="instance-diagram-tab"
        state-storage="local"
    >

        <!-- ── Canvas ────────────────────────────────────────────────────── -->
        <SplitterPanel :size="65" :min-size="30" class="min-w-0 relative">
            <BpmnInstanceViewer
                v-if="instance?.processDefinition?.bpmnXml && loaded"
                :bpmn-xml="instance.processDefinition.bpmnXml"
                :tasks="tasks"
                @select="selectedTask = $event"
            />
            <div
                v-else
                class="flex items-center justify-center h-full text-surface-400 text-sm gap-2"
            >
                <i class="pi pi-spin pi-spinner" v-if="!loaded && instance" />
                <span>{{ instance ? 'Loading diagram…' : 'No instance loaded.' }}</span>
            </div>
        </SplitterPanel>

        <!-- ── Variable inspector ────────────────────────────────────────── -->
        <SplitterPanel :size="35" :min-size="20" class="min-w-0 flex flex-col overflow-hidden">

            <!-- Empty state -->
            <div
                v-if="!selectedTask"
                class="flex flex-col items-center justify-center h-full gap-2 text-surface-400 text-sm px-4 text-center"
            >
                <i class="pi pi-hand-pointer text-2xl" />
                <span>Click a task on the canvas to inspect its variables.</span>
            </div>

            <!-- Task selected -->
            <template v-else>
                <div class="px-4 py-3 border-b border-surface-200 dark:border-surface-700 shrink-0">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-semibold text-sm truncate flex-1">
                            {{ selectedTask.name ?? selectedTask.taskDefinitionId }}
                        </span>
                        <Badge
                            :value="selectedTask.status"
                            :severity="(STATUS_SEVERITY[selectedTask.status] ?? 'secondary') as any"
                            class="text-xs font-mono shrink-0"
                        />
                    </div>
                    <span class="text-xs text-surface-400 font-mono">{{ selectedTask.taskDefinitionId }}</span>
                </div>

                <div class="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Input Variables</p>
                            <CopyVariables :variables="selectedTask.inputVariables" />
                        </div>
                        <VariableList :variables="selectedTask.inputVariables" />
                    </div>
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Output Variables</p>
                            <CopyVariables :variables="selectedTask.variables" />
                        </div>
                        <VariableList :variables="selectedTask.variables" />
                    </div>
                </div>
            </template>

        </SplitterPanel>
    </Splitter>
</template>
