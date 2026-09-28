<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useToast, useConfirm, Button, DataTable, Column, InputText, IconField, InputIcon } from 'primevue';
import { $api } from '@services/api';
import type { Worker } from '@services/WorkersService';
import { onApprove } from '@/utils/common';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const {
    items, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, onPage, onSort, clearSearch,
} = useTableQuery<Worker>({
    load: (params) => $api.workers.getPage(params),
});

async function copyType(w: Worker) {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(w.type);
    } else {
        // Clipboard API needs a secure context; plain-HTTP deployments fall back to execCommand.
        const ta = document.createElement('textarea');
        ta.value = w.type;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
    toast.add({ severity: 'success', summary: 'Copied', detail: `"${w.type}" copied — paste it as the Script Task's Type.`, life: 2000 });
}

function remove(w: Worker) {
    onApprove(confirm, `Delete worker "${w.type}"? Script Tasks that reference it will fail.`, async () => {
        try {
            await $api.workers.remove(w.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${w.type}" deleted.`, life: 3000 });
            await reload();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete.', life: 3000 });
        }
    });
}
</script>

<template>
    <div class="p-6">

        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Workers</h1>
                <p class="text-sm text-surface-400 mt-0.5">
                    JavaScript run by a Script Task set to <strong>Job worker</strong> — the task's
                    <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-1 rounded">Type</code> picks the worker
                </p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText
                        v-model="search"
                        placeholder="Search workers..."
                        size="small"
                        style="width: 220px"
                    />
                </IconField>
                <Button icon="pi pi-refresh" size="small" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <Button label="New Worker" icon="pi pi-plus" size="small" @click="router.push({ name: 'WorkerNew' })" />
            </div>
        </div>

        <!-- Table -->
        <DataTable
            :value="items"
            :loading="loading"
            dataKey="id"
            size="small"
            lazy
            paginator
            :first="firstRow"
            :rows="rowsPerPage"
            :totalRecords="totalRecords"
            :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS"
            @page="onPage"
            @sort="onSort"
        >
            <template #empty>
                <div class="text-center py-6 text-surface-400">
                    <template v-if="activeSearch">
                        <div>No matches for &ldquo;{{ activeSearch }}&rdquo;.</div>
                        <Button label="Clear search" text size="small" @click="clearSearch" />
                    </template>
                    <template v-else>No workers yet. Click 'New Worker' to create one.</template>
                </div>
            </template>

            <Column header="Type" field="type" sortable style="width: 240px">
                <template #body="{ data }">
                    <div class="flex items-center gap-1">
                        <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-(--layout-accent-color)">
                            {{ data.type }}
                        </code>
                        <Button icon="pi pi-copy" size="small" text rounded severity="secondary" v-tooltip.top="'Copy type'" @click="copyType(data)" />
                    </div>
                </template>
            </Column>

            <Column header="Name" field="name" sortable />

            <Column header="Description">
                <template #body="{ data }">
                    <span class="text-sm text-surface-400">{{ data.description || '—' }}</span>
                </template>
            </Column>

            <Column header="Version" field="version" sortable style="width: 90px">
                <template #body="{ data }">
                    <span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">v{{ data.version }}</span>
                </template>
            </Column>

            <Column header="Actions" style="width: 100px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button icon="pi pi-pencil" size="small" text rounded v-tooltip.top="'Edit'" @click="router.push({ name: 'WorkerEdit', params: { id: data.id } })" />
                        <Button icon="pi pi-trash" size="small" text rounded severity="danger" v-tooltip.top="'Delete'" @click="remove(data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

    </div>
</template>
