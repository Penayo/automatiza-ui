<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast, useConfirm, Button, DataTable, Column } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { $api } from '@services/api';
import type { ReportDefinition } from '@services/ReportsService';
import { onApprove } from '@/utils/common';

dayjs.extend(relativeTime);

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const reports = ref<ReportDefinition[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try {
        reports.value = await $api.reports.getAll();
    } finally {
        loading.value = false;
    }
}

function remove(r: ReportDefinition) {
    onApprove(confirm, `Delete "${r.name}"? This cannot be undone.`, async () => {
        try {
            await $api.reports.remove(r.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${r.name}" deleted.`, life: 3000 });
            await load();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete report.', life: 3000 });
        }
    });
}

onMounted(load);
</script>

<template>
    <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Report Definitions</h1>
                <p class="text-sm text-surface-400 mt-0.5">PDF report templates designed with pdfme</p>
            </div>
            <Button
                label="New Report"
                icon="pi pi-plus"
                @click="router.push({ name: 'ReportNew' })"
            />
        </div>

        <!-- Table -->
        <DataTable
            :value="reports"
            :loading="loading"
            emptyMessage="No reports yet. Click 'New Report' to create one."
            size="small"
        >
            <Column header="Name">
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

            <Column header="Updated" style="width: 140px">
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
