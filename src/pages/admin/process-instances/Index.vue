<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Button, Column, DataTable, DatePicker, InputText, Select, Tag, useToast } from 'primevue';
import Page from '@components/Page.vue';
import { $api } from '@services/api';
import { useRouter } from 'vue-router';
import type { ProcessDefinition, ProcessInstance, ProcessInstanceQuery } from '@services/ProcessesService';
import type { PageResponse } from '@services/api';

const $router = useRouter();
const toast = useToast();
const pageRef = ref<InstanceType<typeof Page>>();

const items = ref<PageResponse<ProcessInstance>>();
const selectedItem = ref<ProcessInstance | null>(null);
const loading = ref(false);

const processes = ref<ProcessDefinition[]>([]);
const rowsPerPage = ref(15);
const currentPage = ref(1);

const filters = ref({
    search: '',
    processId: null as string | null,
    status: null as string | null,
    from: null as Date | null,
    to: null as Date | null,
});

const processOptions = ref<{ label: string; value: string | null }[]>([{ label: 'All processes', value: null }]);

const statusOptions = [
    { label: 'All statuses', value: null },
    { label: 'Running', value: 'RUNNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Failed', value: 'FAILED' },
    { label: 'Paused', value: 'PAUSED' },
    { label: 'Terminated', value: 'TERMINATED' },
];

const statusSeverity = (status: string) => {
    if (status === 'COMPLETED') return 'success';
    if (status === 'FAILED') return 'danger';
    if (status === 'RUNNING') return 'info';
    if (status === 'PAUSED') return 'warn';
    return 'secondary';
};

const fetchProcesses = async () => {
    try {
        processes.value = await $api.processes.getAllProcessDefinitions();
        processOptions.value = [
            { label: 'All processes', value: null },
            ...processes.value.map(p => ({ label: p.name, value: p.processId })),
        ];
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load processes', life: 3000 });
    }
};

const buildQuery = (): ProcessInstanceQuery => {
    const q: ProcessInstanceQuery = { page: currentPage.value, rowsPerPage: rowsPerPage.value };
    if (filters.value.search) q.search = filters.value.search;
    if (filters.value.processId) q.processId = filters.value.processId;
    if (filters.value.status) q.status = filters.value.status;
    if (filters.value.from) q.from = filters.value.from.toISOString();
    if (filters.value.to) q.to = filters.value.to.toISOString();
    return q;
};

const fetchData = async () => {
    loading.value = true;
    try {
        items.value = await $api.processes.getAllInstances(buildQuery());
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load instances', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const applyFilters = () => {
    currentPage.value = 1;
    fetchData();
};

const clearFilters = () => {
    filters.value = { search: '', processId: null, status: null, from: null, to: null };
    currentPage.value = 1;
    fetchData();
};

const onPageChange = ({ page, rows }: { page: number; rows: number }) => {
    currentPage.value = page + 1;
    rowsPerPage.value = rows;
    fetchData();
};

onMounted(async () => {
    await fetchProcesses();
    fetchData();
});
</script>

<template>
    <Page title="Instancias del Proceso" ref="pageRef">
        <template #actions>
            <Button variant="text" rounded icon="pi pi-refresh" @click="fetchData()" />
            <Button
                severity="info"
                :disabled="!selectedItem"
                label="Details"
                icon="pi pi-info-circle"
                @click="$router.push({ name: 'ProcessInstanceDetail', params: { id: selectedItem?.id } })"
            />
        </template>

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 mb-4 items-end">
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Search</label>
                <InputText
                    v-model="filters.search"
                    placeholder="Variable value, process name…"
                    class="w-56"
                    @keyup.enter="applyFilters"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Process</label>
                <Select
                    v-model="filters.processId"
                    :options="processOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-48"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Status</label>
                <Select
                    v-model="filters.status"
                    :options="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-40"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">From</label>
                <DatePicker v-model="filters.from" showTime hourFormat="24" placeholder="Start date" class="w-44" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">To</label>
                <DatePicker v-model="filters.to" showTime hourFormat="24" placeholder="End date" class="w-44" />
            </div>
            <div class="flex gap-2">
                <Button label="Search" icon="pi pi-search" @click="applyFilters" />
                <Button label="Clear" icon="pi pi-times" severity="secondary" variant="outlined" @click="clearFilters" />
            </div>
        </div>

        <DataTable
            v-model:selection="selectedItem"
            :value="items?.rows"
            :totalRecords="items?.totalRecords"
            :loading="loading"
            selectionMode="single"
            dataKey="id"
            lazy
            paginator
            :rows="rowsPerPage"
            :rowsPerPageOptions="[10, 15, 30, 50]"
            :first="(currentPage - 1) * rowsPerPage"
            scrollable
            :scrollHeight="(pageRef?.$el?.clientHeight - 260) + 'px'"
            tableStyle="min-width: 48rem"
            @page="onPageChange"
        >
            <Column field="id" header="Process">
                <template #body="{ data }">
                    <span class="font-mono text-xs">{{ data.processInfo ? data.processInfo.name : data.processDefinitionId }}</span>
                </template>
            </Column>

            <Column field="status" header="Status" style="width: 8rem">
                <template #body="{ data }">
                    <Tag :value="data.status" :severity="statusSeverity(data.status)" />
                </template>
            </Column>

            <Column field="createdAt" header="Created At" style="width: 11rem">
                <template #body="{ data }">
                    <span class="text-xs text-zinc-500">{{ new Date(data.createdAt).toLocaleString() }}</span>
                </template>
            </Column>

            <Column field="completedAt" header="Completed At" style="width: 11rem">
                <template #body="{ data }">
                    <span class="text-xs text-zinc-500">{{ data.completedAt ? new Date(data.completedAt).toLocaleString() : '-' }}</span>
                </template>
            </Column>

            <template #empty>
                <div class="text-center py-8 text-zinc-400">No instances found for the selected filters.</div>
            </template>
        </DataTable>

        <router-view />
    </Page>
</template>
