<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useToast, useConfirm, Button, DataTable, Column, InputText, IconField, InputIcon } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { $api } from '@services/api';
import type { EmailTemplateDefinition } from '@services/EmailTemplatesService';
import { onApprove } from '@/utils/common';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

dayjs.extend(relativeTime);

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const {
    items: templates, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, onPage, onSort, clearSearch,
} = useTableQuery<EmailTemplateDefinition>({
    load: (params) => $api.emailTemplates.getPage(params),
});

function remove(t: EmailTemplateDefinition) {
    onApprove(confirm, `Delete "${t.name}"? This cannot be undone.`, async () => {
        try {
            await $api.emailTemplates.remove(t.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${t.name}" deleted.`, life: 3000 });
            // reload(), not fetchPage() — deleting a row shouldn't jump back to page 1.
            await reload();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete template.', life: 3000 });
        }
    });
}
</script>

<template>
    <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Email Templates</h1>
                <p class="text-sm text-surface-400 mt-0.5">Drag-and-drop email designs built with Unlayer</p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText
                        v-model="search"
                        placeholder="Search templates..."
                        size="small"
                        style="width: 220px"
                    />
                </IconField>
                <Button icon="pi pi-refresh" size="small" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <Button
                    label="New Template"
                    icon="pi pi-plus"
                    size="small"
                    @click="router.push({ name: 'EmailTemplateNew' })"
                />
            </div>
        </div>

        <!-- Table -->
        <DataTable
            :value="templates"
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
                    <template v-else>No email templates yet. Click 'New Template' to create one.</template>
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
                            size="small" text rounded
                            v-tooltip.top="'Open designer'"
                            @click="router.push({ name: 'EmailTemplateEdit', params: { id: data.id } })"
                        />
                        <Button
                            icon="pi pi-trash"
                            size="small" text rounded
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
