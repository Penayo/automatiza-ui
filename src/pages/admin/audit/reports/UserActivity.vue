<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button, Column, DataTable, DatePicker, InputText, useToast } from 'primevue';
import Page from '@components/Page.vue';
import { $api } from '@services/api';
import type { UserActivityRow, AuditReportQuery } from '@services/AuditService';

const toast = useToast();

const rows          = ref<UserActivityRow[]>([]);
const loading       = ref(false);
const from          = ref<Date | null>(null);
const to            = ref<Date | null>(null);
const usernameFilter = ref('');

const filteredRows = computed(() => {
    const q = usernameFilter.value.trim().toLowerCase();
    if (!q) return rows.value;
    return rows.value.filter(r => r.actorUsername.toLowerCase().includes(q));
});

const buildQuery = (): AuditReportQuery => {
    const q: AuditReportQuery = {};
    if (from.value) q.from = from.value.toISOString();
    if (to.value)   q.to   = to.value.toISOString();
    return q;
};

const fetchReport = async () => {
    loading.value = true;
    try {
        rows.value = await $api.audit.getUserActivityReport(buildQuery());
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load user activity report', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const clearFilters = () => {
    from.value          = null;
    to.value            = null;
    usernameFilter.value = '';
    fetchReport();
};

onMounted(fetchReport);
</script>

<template>
    <Page title="User Activity Report">
        <template #actions>
            <Button variant="text" rounded icon="pi pi-refresh" :loading="loading" @click="fetchReport" />
        </template>

        <div class="flex flex-wrap gap-3 mb-4 items-end">
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">User</label>
                <InputText
                    v-model="usernameFilter"
                    placeholder="Filter by username…"
                    class="w-44"
                />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">From</label>
                <DatePicker v-model="from" showTime hourFormat="24" placeholder="Start date" class="w-44" />
            </div>
            <div class="flex flex-col gap-1">
                <label class="text-xs text-zinc-500">To</label>
                <DatePicker v-model="to" showTime hourFormat="24" placeholder="End date" class="w-44" />
            </div>
            <div class="flex gap-2">
                <Button label="Apply" icon="pi pi-search" @click="fetchReport" />
                <Button label="Clear" icon="pi pi-times" severity="secondary" variant="outlined" @click="clearFilters" />
            </div>
        </div>

        <DataTable
            :value="filteredRows"
            :loading="loading"
            dataKey="actorUsername"
            scrollable
            scrollHeight="calc(100vh - 300px)"
            tableStyle="min-width: 50rem"
            stripedRows
        >
            <Column field="actorUsername" header="User" style="width: 12rem">
                <template #body="{ data }">
                    <span class="flex items-center gap-2 text-sm font-medium">
                        <i class="pi pi-user text-zinc-400" />
                        {{ data.actorUsername }}
                    </span>
                </template>
            </Column>

            <Column field="TASK_COMPLETED" header="Completed" style="width: 8rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm" :class="data.TASK_COMPLETED > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-zinc-400'">
                        {{ data.TASK_COMPLETED }}
                    </span>
                </template>
            </Column>

            <Column field="TASK_CLAIMED" header="Claimed" style="width: 7rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm" :class="data.TASK_CLAIMED > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400'">
                        {{ data.TASK_CLAIMED }}
                    </span>
                </template>
            </Column>

            <Column field="TASK_ASSIGNED" header="Assigned" style="width: 7rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm" :class="data.TASK_ASSIGNED > 0 ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-400'">
                        {{ data.TASK_ASSIGNED }}
                    </span>
                </template>
            </Column>

            <Column field="PROCESS_STARTED" header="Proc. Started" style="width: 8rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm" :class="data.PROCESS_STARTED > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'">
                        {{ data.PROCESS_STARTED }}
                    </span>
                </template>
            </Column>

            <Column field="PROCESS_COMPLETED" header="Proc. Completed" style="width: 9rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm" :class="data.PROCESS_COMPLETED > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'">
                        {{ data.PROCESS_COMPLETED }}
                    </span>
                </template>
            </Column>

            <Column field="TASK_FAILED" header="Failures" style="width: 7rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm" :class="data.TASK_FAILED > 0 || data.PROCESS_FAILED > 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-zinc-400'">
                        {{ data.TASK_FAILED + data.PROCESS_FAILED }}
                    </span>
                </template>
            </Column>

            <Column field="total" header="Total Actions" style="width: 8rem">
                <template #body="{ data }">
                    <span class="font-mono text-sm font-bold text-zinc-700 dark:text-zinc-200">
                        {{ data.total }}
                    </span>
                </template>
            </Column>

            <template #empty>
                <div class="text-center py-8 text-zinc-400">No activity found for the selected date range.</div>
            </template>
        </DataTable>
    </Page>
</template>
