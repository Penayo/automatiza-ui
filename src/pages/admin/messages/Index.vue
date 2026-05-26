<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button, Select, Dialog, Tag, DataTable, Column } from 'primevue';
import { $api } from '@services/api';
import type { ReceivedMessage, ReceivedMessageStatus } from '@services/MessagesService';

// ── State ─────────────────────────────────────────────────────────────────────

const rows        = ref<ReceivedMessage[]>([]);
const total       = ref(0);
const loading     = ref(false);
const page        = ref(1);
const limit       = ref(25);

// Filters
const filterName   = ref('');
const filterStatus = ref<ReceivedMessageStatus | ''>('');
const filterFrom   = ref('');
const filterTo     = ref('');

const statusOptions = [
    { label: 'All statuses', value: '' },
    { label: 'Queued',       value: 'queued'    },
    { label: 'Started',      value: 'started'   },
    { label: 'Unmatched',    value: 'unmatched' },
    { label: 'Failed',       value: 'failed'    },
];

// Detail dialog
const selected        = ref<ReceivedMessage | null>(null);
const detailVisible   = ref(false);

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetch() {
    loading.value = true;
    try {
        const res = await $api.messages.getMessages({
            name:   filterName.value   || undefined,
            status: (filterStatus.value || undefined) as ReceivedMessageStatus | undefined,
            from:   filterFrom.value   || undefined,
            to:     filterTo.value     || undefined,
            page:   page.value,
            limit:  limit.value,
        });
        rows.value  = res.data;
        total.value = res.total;
    } finally {
        loading.value = false;
    }
}

function resetAndFetch() {
    page.value = 1;
    fetch();
}

function clearFilters() {
    filterName.value   = '';
    filterStatus.value = '';
    filterFrom.value   = '';
    filterTo.value     = '';
    resetAndFetch();
}

function onPage(event: { page: number; rows: number }) {
    page.value  = event.page + 1;
    limit.value = event.rows;
    fetch();
}

// ── Status badge ──────────────────────────────────────────────────────────────

const statusSeverity: Record<ReceivedMessageStatus, string> = {
    queued:    'secondary',
    started:   'success',
    unmatched: 'warn',
    failed:    'danger',
};

// ── Detail ────────────────────────────────────────────────────────────────────

function openDetail(row: ReceivedMessage) {
    selected.value      = row;
    detailVisible.value = true;
}

function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleString();
}

onMounted(fetch);
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">

        <!-- ── Header ────────────────────────────────────────────────────── -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-5 border-b border-surface-200 dark:border-surface-700 shrink-0">
            <div>
                <h1 class="text-2xl font-thin" style="color: var(--layout-title-color)">Messages</h1>
                <p class="text-sm text-surface-500 mt-0.5">All BPMN messages received by the engine</p>
            </div>
            <div class="sm:ml-auto flex items-center gap-2">
                <Button variant="text" rounded icon="pi pi-refresh" @click="fetch" :loading="loading" />
            </div>
        </div>

        <!-- ── Filters ───────────────────────────────────────────────────── -->
        <div class="flex flex-wrap items-end gap-3 px-6 py-4 border-b border-surface-200 dark:border-surface-700 shrink-0">
            <!-- Name search -->
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">Message name</label>
                <div class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 text-sm pointer-events-none" />
                    <input
                        v-model="filterName"
                        type="text"
                        placeholder="Search by name…"
                        class="bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg pl-9 pr-4 py-2 text-sm text-surface-900 dark:text-surface-50 placeholder-surface-400 focus:outline-none focus:ring-1 w-52"
                        style="--tw-ring-color: var(--layout-accent-color)"
                        @keyup.enter="resetAndFetch"
                    />
                </div>
            </div>

            <!-- Status -->
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">Status</label>
                <Select
                    v-model="filterStatus"
                    :options="statusOptions"
                    optionLabel="label"
                    optionValue="value"
                    class="w-40"
                    @change="resetAndFetch"
                />
            </div>

            <!-- From -->
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">From</label>
                <input
                    v-model="filterFrom"
                    type="date"
                    class="bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-1"
                    style="--tw-ring-color: var(--layout-accent-color)"
                    @change="resetAndFetch"
                />
            </div>

            <!-- To -->
            <div class="flex flex-col gap-1">
                <label class="text-xs text-surface-500">To</label>
                <input
                    v-model="filterTo"
                    type="date"
                    class="bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-900 dark:text-surface-50 focus:outline-none focus:ring-1"
                    style="--tw-ring-color: var(--layout-accent-color)"
                    @change="resetAndFetch"
                />
            </div>

            <Button severity="secondary" icon="pi pi-filter-slash" label="Clear" @click="clearFilters" />
        </div>

        <!-- ── Table ─────────────────────────────────────────────────────── -->
        <div class="flex-1 overflow-auto px-6 py-4">
            <DataTable
                :value="rows"
                :loading="loading"
                lazy
                :totalRecords="total"
                :rows="limit"
                paginator
                :rowsPerPageOptions="[10, 25, 50, 100]"
                @page="onPage"
                rowHover
                class="text-sm"
                @row-click="(e) => openDetail(e.data)"
                style="cursor: pointer"
            >
                <template #empty>
                    <div class="flex flex-col items-center justify-center py-16 text-surface-400 gap-3">
                        <i class="pi pi-inbox text-4xl" />
                        <p class="text-sm">No messages found.</p>
                    </div>
                </template>

                <Column field="name" header="Message Name" class="font-mono text-xs" style="min-width:160px" />

                <Column header="Status" style="width:120px">
                    <template #body="{ data }">
                        <Tag :value="data.status" :severity="statusSeverity[data.status as ReceivedMessageStatus]" />
                    </template>
                </Column>

                <Column field="correlationKey" header="Correlation Key" style="min-width:140px">
                    <template #body="{ data }">
                        <span class="font-mono text-xs text-surface-500">{{ data.correlationKey || '—' }}</span>
                    </template>
                </Column>

                <Column header="Started Instances" style="width:150px">
                    <template #body="{ data }">
                        <span class="text-surface-500">{{ data.startedInstanceIds?.length ?? 0 }}</span>
                    </template>
                </Column>

                <Column header="Received At" style="min-width:160px">
                    <template #body="{ data }">
                        <span class="text-surface-500 text-xs">{{ fmt(data.createdAt) }}</span>
                    </template>
                </Column>

                <Column header="" style="width:60px">
                    <template #body="{ data }">
                        <Button
                            icon="pi pi-eye"
                            variant="text"
                            rounded
                            size="small"
                            @click.stop="openDetail(data)"
                            title="View details"
                        />
                    </template>
                </Column>
            </DataTable>
        </div>

        <!-- ── Detail Dialog ─────────────────────────────────────────────── -->
        <Dialog
            v-model:visible="detailVisible"
            modal
            header="Message Details"
            :style="{ width: '42rem' }"
            :breakpoints="{ '640px': '95vw' }"
        >
            <div v-if="selected" class="space-y-5 text-sm">

                <!-- Status + name -->
                <div class="flex items-center gap-3">
                    <Tag :value="selected.status" :severity="statusSeverity[selected.status]" />
                    <span class="font-mono font-semibold text-surface-900 dark:text-surface-50">{{ selected.name }}</span>
                </div>

                <!-- Meta grid -->
                <div class="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    <div>
                        <p class="text-surface-400 mb-0.5">Received at</p>
                        <p class="text-surface-800 dark:text-surface-100">{{ fmt(selected.createdAt) }}</p>
                    </div>
                    <div>
                        <p class="text-surface-400 mb-0.5">Job ID</p>
                        <p class="font-mono text-surface-800 dark:text-surface-100">{{ selected.jobId || '—' }}</p>
                    </div>
                    <div>
                        <p class="text-surface-400 mb-0.5">Correlation Key</p>
                        <p class="font-mono text-surface-800 dark:text-surface-100">{{ selected.correlationKey || '—' }}</p>
                    </div>
                    <div>
                        <p class="text-surface-400 mb-0.5">Time To Live</p>
                        <p class="text-surface-800 dark:text-surface-100">{{ selected.timeToLive || '—' }}</p>
                    </div>
                </div>

                <!-- Started instances -->
                <div v-if="selected.startedInstanceIds?.length">
                    <p class="text-xs text-surface-400 mb-2">Started Process Instances</p>
                    <div class="flex flex-col gap-1">
                        <span
                            v-for="id in selected.startedInstanceIds"
                            :key="id"
                            class="font-mono text-xs px-2 py-1 rounded bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300"
                        >{{ id }}</span>
                    </div>
                </div>

                <!-- Error -->
                <div v-if="selected.error" class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-3">
                    <p class="text-xs text-red-500 dark:text-red-400 font-medium mb-1">Error</p>
                    <p class="text-xs text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">{{ selected.error }}</p>
                </div>

                <!-- Variables -->
                <div>
                    <p class="text-xs text-surface-400 mb-2">Variables</p>
                    <div v-if="selected.variables && Object.keys(selected.variables).length">
                        <pre class="text-xs bg-surface-100 dark:bg-surface-800 rounded-lg p-3 overflow-auto max-h-48 text-surface-800 dark:text-surface-200">{{ JSON.stringify(selected.variables, null, 2) }}</pre>
                    </div>
                    <p v-else class="text-xs text-surface-400">—</p>
                </div>

            </div>
        </Dialog>

    </div>
</template>
