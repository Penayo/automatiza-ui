<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Button, Column, DataTable, DatePicker, InputText, Select, Tag, useToast } from 'primevue';
import Page from '../../components/Page.vue';
import { $api } from '../../services/api';
import type { AuditLog } from '../../services/AuditService';
import { useRouter } from 'vue-router';

const toast = useToast();
const router = useRouter();

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const totalRecords = ref(0);
const expandedRows = ref<Record<string, boolean>>({});

const filters = ref({
    processInstanceId: '',
    category: null as string | null,
    level: null as string | null,
    from: null as Date | null,
    to: null as Date | null,
});

const pagination = ref({ page: 1, limit: 50 });

const categoryOptions = [
    { label: 'All categories', value: null },
    { label: 'Process', value: 'process' },
    { label: 'System', value: 'system' },
    { label: 'Task', value: 'task' },
    { label: 'Queue', value: 'queue' },
];

const levelOptions = [
    { label: 'All levels', value: null },
    { label: 'Info', value: 'info' },
    { label: 'Warn', value: 'warn' },
    { label: 'Error', value: 'error' },
    { label: 'Debug', value: 'debug' },
];

const levelSeverity = (level: string) => {
    if (level === 'error') return 'danger';
    if (level === 'warn') return 'warn';
    if (level === 'info') return 'success';
    return 'secondary';
};

const categorySeverity = (category: string) => {
    if (category === 'process') return 'info';
    if (category === 'system') return 'secondary';
    if (category === 'task') return 'warn';
    return 'secondary';
};

const fetchLogs = async () => {
    loading.value = true;
    try {
        const query: Record<string, any> = { page: pagination.value.page, limit: pagination.value.limit };
        if (filters.value.processInstanceId) query.processInstanceId = filters.value.processInstanceId;
        if (filters.value.category) query.category = filters.value.category;
        if (filters.value.level) query.level = filters.value.level;
        if (filters.value.from) query.from = filters.value.from.toISOString();
        if (filters.value.to) query.to = filters.value.to.toISOString();

        const res = await $api.audit.getLogs(query);
        logs.value = res.data;
        totalRecords.value = res.total;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load audit logs', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const onPage = (event: any) => {
    pagination.value.page = event.page + 1;
    pagination.value.limit = event.rows;
    fetchLogs();
};

const applyFilters = () => {
    pagination.value.page = 1;
    fetchLogs();
};

const clearFilters = () => {
    filters.value = { processInstanceId: '', category: null, level: null, from: null, to: null };
    pagination.value.page = 1;
    fetchLogs();
};

const goToInstance = (id: string) => {
    router.push({ name: 'ProcessInstanceDetail', params: { id } });
};

onMounted(fetchLogs);
</script>

<template>
    <Page title="Audit Logs">
        <template #actions>
            <Button variant="text" rounded icon="pi pi-refresh" @click="fetchLogs" />
        </template>

        <!-- Filters -->
        <div class="flex flex-wrap gap-3 mb-4 items-end">
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Process Instance ID</label>
                <InputText
                    v-model="filters.processInstanceId"
                    placeholder="Search by instance ID..."
                    class="w-64"
                    @keyup.enter="applyFilters"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Category</label>
                <Select
                    v-model="filters.category"
                    :options="categoryOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-40"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Level</label>
                <Select
                    v-model="filters.level"
                    :options="levelOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-36"
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

        <!-- Table -->
        <DataTable
            v-model:expandedRows="expandedRows"
            :value="logs"
            :loading="loading"
            lazy
            :totalRecords="totalRecords"
            :rows="pagination.limit"
            :first="(pagination.page - 1) * pagination.limit"
            paginator
            :rowsPerPageOptions="[25, 50, 100]"
            dataKey="_id"
            scrollable
            scrollHeight="calc(100vh - 320px)"
            tableStyle="min-width: 56rem"
            @page="onPage"
        >
            <Column expander style="width: 3rem" />

            <Column field="timestamp" header="Timestamp" style="width: 11rem">
                <template #body="{ data }">
                    <span class="text-xs text-zinc-500 whitespace-nowrap">
                        {{ new Date(data.timestamp).toLocaleString() }}
                    </span>
                </template>
            </Column>

            <Column field="level" header="Level" style="width: 6rem">
                <template #body="{ data }">
                    <Tag :value="data.level.toUpperCase()" :severity="levelSeverity(data.level)" />
                </template>
            </Column>

            <Column field="category" header="Category" style="width: 7rem">
                <template #body="{ data }">
                    <Tag :value="data.category" :severity="categorySeverity(data.category)" variant="outlined" />
                </template>
            </Column>

            <Column field="context" header="Context" style="width: 10rem">
                <template #body="{ data }">
                    <span class="text-xs text-zinc-400">{{ data.context ?? '-' }}</span>
                </template>
            </Column>

            <Column field="message" header="Message">
                <template #body="{ data }">
                    <span class="text-sm">{{ data.message }}</span>
                </template>
            </Column>

            <Column field="processInstanceId" header="Instance" style="width: 9rem">
                <template #body="{ data }">
                    <Button
                        v-if="data.processInstanceId"
                        :label="data.processInstanceId.slice(0, 8) + '…'"
                        variant="text"
                        size="small"
                        class="font-mono text-xs p-0"
                        @click="goToInstance(data.processInstanceId)"
                    />
                    <span v-else class="text-zinc-400 text-xs">-</span>
                </template>
            </Column>

            <!-- Expanded row: metadata / stack trace -->
            <template #expansion="{ data }">
                <div v-if="data.metadata" class="px-4 py-3">
                    <pre class="text-xs bg-zinc-100 dark:bg-zinc-800 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">{{ JSON.stringify(data.metadata, null, 2) }}</pre>
                </div>
                <div v-else class="px-4 py-3 text-xs text-zinc-400">No metadata</div>
            </template>

            <template #empty>
                <div class="text-center py-8 text-zinc-400">No audit logs found for the selected filters.</div>
            </template>
        </DataTable>
    </Page>
</template>
