<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useToast, useConfirm, Button, DataTable, Column, InputText, IconField, InputIcon } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { $api } from '@services/api';
import type { ReportDefinition } from '@services/ReportsService';
import { onApprove } from '@/utils/common';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

dayjs.extend(relativeTime);

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const {
    items: reports, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, onPage, onSort, clearSearch,
} = useTableQuery<ReportDefinition>({
    load: (params) => $api.reports.getPage(params),
});

function remove(r: ReportDefinition) {
    onApprove(confirm, `Delete "${r.name}"? This cannot be undone.`, async () => {
        try {
            await $api.reports.remove(r.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${r.name}" deleted.`, life: 3000 });
            // reload(), not fetchPage() — deleting a row shouldn't jump back to page 1.
            await reload();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete report.', life: 3000 });
        }
    });
}
</script>

<template>
    <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Report Definitions</h1>
                <p class="text-sm text-surface-400 mt-0.5">PDF report templates designed with pdfme</p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText
                        v-model="search"
                        placeholder="Search reports..."
                        size="small"
                        style="width: 220px"
                    />
                </IconField>
                <Button icon="pi pi-refresh" size="small" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <Button
                    label="New Report"
                    icon="pi pi-plus"
                    size="small"
                    @click="router.push({ name: 'ReportNew' })"
                />
            </div>
        </div>

        <!-- Table -->
        <DataTable
            :value="reports"
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
                    <template v-else>No reports yet. Click 'New Report' to create one.</template>
                </div>
            </template>

            <Column header="Name" field="name" sortable>
                <template #body="{ data }">
                    <div class="flex flex-col py-0.5">
                        <span class="font-medium text-(--layout-accent-color)">{{ data.name }}</span>
                        <span class="text-xs text-surface-400 font-mono">{{ data.key }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Description">
                <template #body="{ data }">
                    <span class="text-sm text-surface-400">{{ data.description || '—' }}</span>
                </template>
            </Column>

            <Column header="Updated" field="updatedAt" sortable style="width: 160px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-500">{{ dayjs(data.updatedAt ?? data.createdAt).fromNow() }}</span>
                </template>
            </Column>

            <Column header="Actions" style="width: 120px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button
                            icon="pi pi-pencil"
                            size="small"
                            text
                            rounded
                            v-tooltip.top="'Open designer'"
                            @click="router.push({ name: 'ReportEdit', params: { id: data.id } })"
                        />
                        <Button
                            icon="pi pi-trash"
                            size="small"
                            text
                            rounded
                            severity="danger"
                            v-tooltip.top="'Delete'"
                            @click="remove(data)"
                        />
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>
