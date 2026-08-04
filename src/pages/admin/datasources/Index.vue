<script setup lang="ts">
import { ref } from 'vue';
import { useToast, useConfirm, Button, InputText, IconField, InputIcon } from 'primevue';
import { $api } from '@services/api';
import type { Datasource } from '@services/DatasourcesService';
import { onApprove } from '@/utils/common';
import { useTableQuery } from '@/composables/useTableQuery';
import DatasourceTable from './components/DatasourceTable.vue';
import DatasourceEditorDialog from './components/DatasourceEditorDialog.vue';

const toast   = useToast();
const confirm = useConfirm();

const {
    items, totalRecords, loading, search,
    firstRow, rowsPerPage, reload, onPage, onSort,
} = useTableQuery<Datasource>({
    load: (params) => $api.datasources.getPage(params),
});

const editorRef = ref<InstanceType<typeof DatasourceEditorDialog> | null>(null);

function openNew() {
    editorRef.value?.openNew();
}

function openEdit(ds: Datasource) {
    editorRef.value?.openEdit(ds);
}

function remove(ds: Datasource) {
    onApprove(confirm, `Delete "${ds.name}"? Processes referencing it will fail.`, async () => {
        try {
            await $api.datasources.remove(ds.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${ds.name}" deleted.`, life: 3000 });
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
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Datasources</h1>
                <p class="text-sm text-surface-400 mt-0.5">
                    Declared external data APIs. The platform stores the declaration — the data stays in the remote system.
                </p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText v-model="search" placeholder="Search datasources..." size="small" style="width: 220px" />
                </IconField>
                <Button icon="pi pi-refresh" size="small" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <Button label="New Datasource" icon="pi pi-plus" size="small" @click="openNew" />
            </div>
        </div>

        <DatasourceTable
            :items="items" :loading="loading" :total-records="totalRecords"
            :first-row="firstRow" :rows-per-page="rowsPerPage"
            @page="onPage" @sort="onSort" @edit="openEdit" @delete="remove"
        />

        <DatasourceEditorDialog ref="editorRef" @saved="reload" />
    </div>
</template>
