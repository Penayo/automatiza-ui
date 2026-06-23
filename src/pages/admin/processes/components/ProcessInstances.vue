<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useToast, Button, Select, DataTable, Column, Tag } from 'primevue';
import { $api } from '@services/api';
import type { ProcessInstance, ProcessInstanceQuery } from '@services/ProcessesService';
import type { PageResponse } from '@services/api';
import StartProcessDialog from './StartProcessDialog.vue';

const props = defineProps<{
    processId: string;
    processDefinitionId?: string;
    processName?: string;
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
    { label: 'All statuses', value: null         },
    { label: 'Running',      value: 'RUNNING'    },
    { label: 'Completed',    value: 'COMPLETED'  },
    { label: 'Failed',       value: 'FAILED'     },
    { label: 'Paused',       value: 'PAUSED'     },
    { label: 'Terminated',   value: 'TERMINATED' },
];

const severityMap: Record<string, string> = {
    COMPLETED: 'success', FAILED: 'danger', RUNNING: 'info', PAUSED: 'warn',
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
    const pid = route.params.id as string;
    if (pid) {
        router.push({ name: 'ProcessEditInstanceDetail', params: { id: pid, instanceId: id } });
    } else {
        router.push({ name: 'ProcessInstanceDetail', params: { id } });
    }
}

// ── Start dialog ──────────────────────────────────────────────────────────────

const startDialogVisible = ref(false);

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
                    @click="startDialogVisible = true"
                />
            </div>
        </div>

        <!-- Instances table -->
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

    <StartProcessDialog
        v-if="processDefinitionId"
        v-model:visible="startDialogVisible"
        :processDefinitionId="processDefinitionId"
        :processName="processName"
        @started="fetch"
    />
</template>
