<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button, Column, DataTable, DatePicker, InputText, Tag, useToast } from 'primevue';
import Page from '@components/Page.vue';
import { $api } from '@services/api';
import type { TaskTimingRow, AuditReportQuery } from '@services/AuditService';

const toast = useToast();

const rows        = ref<TaskTimingRow[]>([]);
const loading     = ref(false);
const from        = ref<Date | null>(null);
const to          = ref<Date | null>(null);
const processName = ref('');

const formatDuration = (ms: number): string => {
    if (!ms || ms < 0) return '—';
    const totalSeconds = Math.floor(ms / 1000);
    const days    = Math.floor(totalSeconds / 86400);
    const hours   = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0)    return `${days}d ${hours}h`;
    if (hours > 0)   return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
};

const taskTypeSeverity = (type: string): string => {
    if (type === 'USER_TASK')         return 'info';
    if (type === 'SERVICE_TASK')      return 'secondary';
    if (type === 'SCRIPT_TASK')       return 'warn';
    if (type === 'BUSINESS_RULE_TASK') return 'contrast';
    return 'secondary';
};

const buildQuery = (): AuditReportQuery => {
    const q: AuditReportQuery = {};
    if (from.value)        q.from        = from.value.toISOString();
    if (to.value)          q.to          = to.value.toISOString();
    if (processName.value) q.processName = processName.value;
    return q;
};

const fetchReport = async () => {
    loading.value = true;
    try {
        rows.value = await $api.audit.getTaskTimingReport(buildQuery());
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load task timing report', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const clearFilters = () => {
    from.value        = null;
    to.value          = null;
    processName.value = '';
    fetchReport();
};

onMounted(fetchReport);
</script>

<template>
    <Page title="Task Timing Report">
        <template #actions>
            <Button variant="text" rounded icon="pi pi-refresh" :loading="loading" @click="fetchReport" />
        </template>

        <div class="flex flex-wrap gap-3 mb-4 items-end">
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">From</label>
                <DatePicker v-model="from" showTime hourFormat="24" placeholder="Start date" class="w-44" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">To</label>
                <DatePicker v-model="to" showTime hourFormat="24" placeholder="End date" class="w-44" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">Process Name</label>
                <InputText
                    v-model="processName"
                    placeholder="Filter by process…"
                    class="w-48"
                    @keyup.enter="fetchReport"
                />
            </div>
            <div class="flex gap-2">
                <Button label="Apply" icon="pi pi-search" @click="fetchReport" />
                <Button label="Clear" icon="pi pi-times" severity="secondary" variant="outlined" @click="clearFilters" />
            </div>
        </div>

        <DataTable
            :value="rows"
            :loading="loading"
            dataKey="taskName"
            scrollable
            scrollHeight="calc(100vh - 300px)"
            tableStyle="min-width: 52rem"
            stripedRows
        >
            <Column field="taskName" header="Task Name" style="min-width: 14rem">
                <template #body="{ data }">
                    <span class="text-sm font-medium">{{ data.taskName || '—' }}</span>
                </template>
            </Column>

            <Column field="taskType" header="Type" style="width: 10rem">
                <template #body="{ data }">
                    <Tag
                        :value="data.taskType.replace(/_/g, ' ')"
                        :severity="taskTypeSeverity(data.taskType)"
                        class="text-xs"
                    />
                </template>
            </Column>

            <Column field="processName" header="Process" style="min-width: 12rem">
                <template #body="{ data }">
                    <span class="text-sm text-zinc-500">{{ data.processName || '—' }}</span>
                </template>
            </Column>

            <Column field="count" header="Executions" style="width: 8rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                        {{ data.count }}
                    </span>
                </template>
            </Column>

            <Column field="avgDurationMs" header="Avg Duration" style="width: 9rem" sortable>
                <template #body="{ data }">
                    <span class="font-mono text-sm text-sky-600 dark:text-sky-400">
                        {{ formatDuration(data.avgDurationMs) }}
                    </span>
                </template>
            </Column>

            <Column field="minDurationMs" header="Min Duration" style="width: 9rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {{ formatDuration(data.minDurationMs) }}
                    </span>
                </template>
            </Column>

            <Column field="maxDurationMs" header="Max Duration" style="width: 9rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm text-amber-600 dark:text-amber-400">
                        {{ formatDuration(data.maxDurationMs) }}
                    </span>
                </template>
            </Column>

            <template #empty>
                <div class="text-center py-8 text-zinc-400">No completed tasks found for the selected filters.</div>
            </template>
        </DataTable>
    </Page>
</template>
