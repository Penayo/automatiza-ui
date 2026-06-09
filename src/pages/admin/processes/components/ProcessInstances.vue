<script setup lang="ts">
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';
import { ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast, Button, Select, DataTable, Column, Tag, Dialog } from 'primevue';
import { Form } from '@bpmn-io/form-js';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import JsonEditor from 'vue3-ts-jsoneditor';
import { $api } from '@services/api';
import type { ProcessInstance, ProcessInstanceQuery } from '@services/ProcessesService';
import type { IForm } from '@services/FormsService';
import type { PageResponse } from '@services/api';

const props = defineProps<{
    /** BPMN processId field — used as the filter for the instances query */
    processId: string;
    /** Database id of the ProcessDefinition — used to start a new instance */
    processDefinitionId?: string;
}>();

const router = useRouter();
const route  = useRoute();
const toast  = useToast();

const instances   = ref<PageResponse<ProcessInstance>>();
const loading     = ref(false);
const rowsPerPage = ref(15);
const currentPage = ref(1);
const status      = ref<string | null>(null);

const statusOptions = [
    { label: 'All statuses', value: null        },
    { label: 'Running',      value: 'RUNNING'   },
    { label: 'Completed',    value: 'COMPLETED' },
    { label: 'Failed',       value: 'FAILED'    },
    { label: 'Paused',       value: 'PAUSED'    },
    { label: 'Terminated',   value: 'TERMINATED'},
];

const severityMap: Record<string, string> = {
    COMPLETED: 'success',
    FAILED:    'danger',
    RUNNING:   'info',
    PAUSED:    'warn',
};
const statusSeverity = (s: string) => severityMap[s] ?? 'secondary';

// ── Data fetching ─────────────────────────────────────────────────────────────

async function fetch() {
    loading.value = true;
    try {
        const q: ProcessInstanceQuery = {
            processId:   props.processId,
            page:        currentPage.value,
            rowsPerPage: rowsPerPage.value,
        };
        if (status.value) q.status = status.value;
        instances.value = await $api.processes.getAllInstances(q) as PageResponse<ProcessInstance>;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load instances', life: 3000 });
    } finally {
        loading.value = false;
    }
}

function onPageChange({ page, rows }: { page: number; rows: number }) {
    currentPage.value = page + 1;
    rowsPerPage.value = rows;
    fetch();
}

function onStatusChange() {
    currentPage.value = 1;
    fetch();
}

function openDetail(id: string) {
    // Navigate to child route — Detail dialog renders inside EditProcess via <RouterView />
    const processId = route.params.id as string;
    if (processId) {
        router.push({ name: 'ProcessEditInstanceDetail', params: { id: processId, instanceId: id } });
    } else {
        router.push({ name: 'ProcessInstanceDetail', params: { id } });
    }
}

// ── Start Process ─────────────────────────────────────────────────────────────

const startDialogVisible = ref(false);
const startLoading       = ref(false);
const starting           = ref(false);
const startFormRef       = ref<HTMLElement | null>(null);
const startFormSchema    = ref<IForm | null>(null);
const startFormViewer    = ref<InstanceType<typeof Form> | null>(null);
const startVars          = ref('{}');

async function openStartDialog() {
    if (!props.processDefinitionId) return;
    startDialogVisible.value = true;
    startLoading.value       = true;
    startFormSchema.value    = null;
    startVars.value          = '{}';
    try {
        startFormSchema.value = await $api.processes.getStartForm(props.processDefinitionId);
    } catch {
        // no start form — fall back to JSON editor
    } finally {
        startLoading.value = false;
    }
}

function onStartDialogShow() {
    // Schema may not be loaded yet — the watch below handles that case.
    if (startFormSchema.value && startFormRef.value) mountStartForm();
}

function mountStartForm() {
    if (!startFormRef.value) return;
    const form = new Form({ container: startFormRef.value, additionalModules: [DocumentListModule] });
    startFormViewer.value = form;
    form.importSchema(startFormSchema.value, {});
    form.on('submit', (event: { data: Record<string, any>; errors: unknown[] }) => {
        submitStart(event.data);
    });
}

watch(startFormSchema, (schema) => {
    if (!schema) return;
    // Wait for the v-if="startFormSchema" div to render before mounting.
    setTimeout(() => mountStartForm(), 0);
});

async function submitStart(variables: Record<string, any>) {
    starting.value = true;
    try {
        await $api.processes.startProcess(props.processDefinitionId!, { variables });
        toast.add({ severity: 'success', summary: 'Started', detail: 'Process instance created.', life: 3000 });
        startDialogVisible.value = false;
        await fetch();
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'Failed to start process.', life: 4000 });
    } finally {
        starting.value = false;
    }
}

function handleStartSubmit() {
    if (startFormViewer.value && startFormSchema.value) {
        startFormViewer.value.submit();
    } else {
        try {
            submitStart(JSON.parse(startVars.value));
        } catch {
            toast.add({ severity: 'error', summary: 'Invalid JSON', detail: 'Fix the variables JSON before starting.', life: 3000 });
        }
    }
}

onMounted(fetch);
</script>

<template>
    <div class="px-6 py-6">

        <!-- Toolbar -->
        <div class="flex flex-wrap items-end gap-3 mb-4">
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-400">Status</label>
                <Select
                    v-model="status"
                    :options="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-40"
                    @change="onStatusChange"
                />
            </div>
            <Button icon="pi pi-refresh" severity="secondary" :loading="loading" @click="fetch" />
            <Button
                severity="secondary"
                label="All Instances"
                icon="pi pi-external-link"
                @click="router.push({ name: 'ProcessInstancesIndex' })"
            />
            <div class="ml-auto">
                <Button
                    v-if="processDefinitionId"
                    label="Start Process"
                    icon="pi pi-play"
                    severity="success"
                    @click="openStartDialog"
                />
            </div>
        </div>

        <!-- Table -->
        <DataTable
            :value="instances?.rows"
            :totalRecords="instances?.totalRecords"
            :loading="loading"
            dataKey="id"
            lazy
            paginator
            :rows="rowsPerPage"
            :rowsPerPageOptions="[10, 15, 30, 50]"
            :first="(currentPage - 1) * rowsPerPage"
            @page="onPageChange"
        >
            <Column field="id" header="Instance ID">
                <template #body="{ data }">
                    <button
                        class="font-mono text-xs hover:underline"
                        style="color: var(--layout-accent-color)"
                        @click="openDetail(data.id)"
                    >{{ data.id }}</button>
                </template>
            </Column>

            <Column field="status" header="Status" style="width: 9rem">
                <template #body="{ data }">
                    <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                </template>
            </Column>

            <Column field="createdAt" header="Started" style="width: 11rem">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ new Date(data.createdAt).toLocaleString() }}</span>
                </template>
            </Column>

            <Column field="completedAt" header="Completed" style="width: 11rem">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.completedAt ? new Date(data.completedAt).toLocaleString() : '—' }}</span>
                </template>
            </Column>

            <template #empty>
                <div class="text-center py-10 text-surface-400">No instances found.</div>
            </template>
        </DataTable>
    </div>

    <!-- Start Process dialog -->
    <Dialog
        v-model:visible="startDialogVisible"
        modal
        header="Start Process"
        :style="{ width: '42rem' }"
        :dismissableMask="true"
        @show="onStartDialogShow"
    >
        <div v-if="startLoading" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-3xl text-surface-400" />
        </div>

        <div v-else>
            <div v-if="startFormSchema" ref="startFormRef" class="formjs-dark" />
            <div v-else class="space-y-3">
                <p class="text-sm text-surface-500">No start form configured. Provide initial variables as JSON (optional).</p>
                <JsonEditor
                    mode="text"
                    v-model:text="startVars"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :darkTheme="true"
                    height="200"
                />
            </div>
        </div>

        <template #footer>
            <Button label="Cancel" severity="secondary" text @click="startDialogVisible = false" />
            <Button
                v-if="!startLoading"
                label="Start"
                icon="pi pi-play"
                severity="success"
                :loading="starting"
                @click="handleStartSubmit"
            />
        </template>
    </Dialog>
</template>
