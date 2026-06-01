<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, DataTable, Column, Button } from 'primevue';
import { useRouter } from 'vue-router';
import { $api } from '@services/api';
import type { ReportDefinition } from '@services/ReportsService';
import dayjs from 'dayjs';

const visible = defineModel<boolean>('visible', { default: false });
const router  = useRouter();

const items   = ref<ReportDefinition[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try {
        items.value = await $api.reports.getAll();
    } finally {
        loading.value = false;
    }
}

watch(visible, (v) => { if (v) load(); });
</script>

<template>
    <Dialog
        v-model:visible="visible"
        modal
        header="Report Definitions"
        :style="{ width: '680px' }"
        :dismissableMask="true"
    >
        <DataTable :value="items" :loading="loading" size="small" stripedRows>
            <template #empty><div class="text-center py-6 text-surface-400">No reports defined yet.</div></template>
            <Column field="key"  header="Key"  class="font-mono text-xs" />
            <Column field="name" header="Name" />
            <Column field="description" header="Description" class="text-surface-400 text-sm" />
            <Column field="createdAt" header="Created" style="width:120px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.createdAt ? dayjs(data.createdAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:60px">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Edit'" @click="router.push({ name: 'ReportEdit', params: { id: data.id } }); visible = false" />
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="New Report" icon="pi pi-plus" size="small"
                @click="router.push({ name: 'ReportNew' }); visible = false" />
        </template>
    </Dialog>
</template>
