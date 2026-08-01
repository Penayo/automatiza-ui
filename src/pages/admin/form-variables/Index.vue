<script setup lang="ts">
import { ref } from 'vue';
import { useToast, useConfirm, Button, DataTable, Column, Dialog, InputText, Textarea, IconField, InputIcon } from 'primevue';
import { $api } from '@services/api';
import type { FormVariable, SaveFormVariableDto } from '@services/FormVariablesService';
import { onApprove } from '@/utils/common';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

const toast   = useToast();
const confirm = useConfirm();

// ── List ──────────────────────────────────────────────────────────────────────
const {
    items, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, onPage, onSort, clearSearch,
} = useTableQuery<FormVariable>({
    load: (params) => $api.formVariables.getPage(params),
});

// ── Dialog ────────────────────────────────────────────────────────────────────
const dialogVisible = ref(false);
const saving        = ref(false);
const editingId     = ref<string | null>(null);

const form = ref<SaveFormVariableDto>({ key: '', label: '', description: '', items: [] });

function openNew() {
    editingId.value = null;
    form.value = { key: '', label: '', description: '', items: [{ label: '', value: '' }] };
    dialogVisible.value = true;
}

function openEdit(v: FormVariable) {
    editingId.value = v.id;
    form.value = {
        key:         v.key,
        label:       v.label,
        description: v.description ?? '',
        items:       v.items.map(i => ({ ...i })),
    };
    dialogVisible.value = true;
}

function closeDialog() {
    dialogVisible.value = false;
}

// ── Items editor ──────────────────────────────────────────────────────────────
function addItem() {
    form.value.items.push({ label: '', value: '' });
}

function removeItem(i: number) {
    form.value.items.splice(i, 1);
    if (!form.value.items.length) addItem();
}

// ── Save ──────────────────────────────────────────────────────────────────────
async function save() {
    const dto: SaveFormVariableDto = {
        ...form.value,
        items: form.value.items.filter(i => i.label.trim()),
    };

    saving.value = true;
    try {
        if (editingId.value) {
            await $api.formVariables.update(editingId.value, dto);
            toast.add({ severity: 'success', summary: 'Updated', detail: `"${dto.label}" updated.`, life: 3000 });
        } else {
            await $api.formVariables.create(dto);
            toast.add({ severity: 'success', summary: 'Created', detail: `"${dto.label}" created.`, life: 3000 });
        }
        closeDialog();
        // reload(), not fetchPage() — an edit shouldn't kick the user back to page 1.
        await reload();
    } catch (err: any) {
        toast.add({ severity: 'error', summary: 'Error', detail: err?.response?.data?.message ?? 'Could not save.', life: 4000 });
    } finally {
        saving.value = false;
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────
function remove(v: FormVariable) {
    onApprove(confirm, `Delete "${v.label}"? This cannot be undone.`, async () => {
        try {
            await $api.formVariables.remove(v.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${v.label}" deleted.`, life: 3000 });
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
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Form Variables</h1>
                <p class="text-sm text-surface-400 mt-0.5">
                    Named option lists injected into form fields via <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-1 rounded">valuesExpression</code>
                </p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText
                        v-model="search"
                        placeholder="Search form variables..."
                        size="small"
                        style="width: 220px"
                    />
                </IconField>
                <Button icon="pi pi-refresh" size="small" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <Button label="New Form Variable" icon="pi pi-plus" size="small" @click="openNew" />
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
                    <template v-else>No Form Variables yet. Click 'New Form Variable' to create one.</template>
                </div>
            </template>

            <Column header="Key" field="key" sortable style="width: 220px">
                <template #body="{ data }">
                    <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-(--layout-accent-color)">
                        {{ data.key }}
                    </code>
                </template>
            </Column>

            <Column header="Label" field="label" sortable />

            <Column header="Description">
                <template #body="{ data }">
                    <span class="text-sm text-surface-400">{{ data.description || '—' }}</span>
                </template>
            </Column>

            <Column header="Items" style="width: 80px">
                <template #body="{ data }">
                    <span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                        {{ data.items?.length ?? 0 }}
                    </span>
                </template>
            </Column>

            <Column header="Actions" style="width: 100px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button icon="pi pi-pencil" size="small" text rounded v-tooltip.top="'Edit'" @click="openEdit(data)" />
                        <Button icon="pi pi-trash" size="small" text rounded severity="danger" v-tooltip.top="'Delete'" @click="remove(data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <!-- Create / Edit dialog -->
        <Dialog
            v-model:visible="dialogVisible"
            :header="editingId ? 'Edit Form Variable' : 'New Form Variable'"
            modal
            :style="{ width: '540px' }"
            :draggable="false"
        >
            <div class="flex flex-col gap-4 py-2">

                <!-- Key -->
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Key <span class="text-red-500">*</span></label>
                    <InputText
                        v-model="form.key"
                        placeholder="e.g. countries"
                        class="font-mono"
                    />
                    <p class="text-xs text-surface-400">
                        Used in form builder: <code class="bg-surface-100 dark:bg-zinc-800 px-1 rounded">= {{ form.key || 'key' }}</code>
                    </p>
                    <p v-if="editingId" class="text-xs text-amber-500">
                        Changing the key will break any form that already references the old key in its <code class="bg-surface-100 dark:bg-zinc-800 px-1 rounded">valuesExpression</code>.
                    </p>
                </div>

                <!-- Label -->
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Label <span class="text-red-500">*</span></label>
                    <InputText v-model="form.label" placeholder="e.g. Countries" />
                </div>

                <!-- Description -->
                <div class="flex flex-col gap-1">
                    <label class="text-sm font-medium">Description</label>
                    <Textarea v-model="form.description" rows="2" placeholder="Optional description" auto-resize />
                </div>

                <!-- Items -->
                <div class="flex flex-col gap-2">
                    <label class="text-sm font-medium">Options</label>

                    <div
                        v-for="(item, i) in form.items"
                        :key="i"
                        class="flex items-center gap-2"
                    >
                        <InputText
                            v-model="item.label"
                            placeholder="Label"
                            class="flex-1"
                        />
                        <InputText
                            v-model="item.value"
                            placeholder="Value"
                            class="flex-1"
                        />
                        <Button
                            icon="pi pi-times"
                            text
                            rounded
                            size="small"
                            severity="danger"
                            @click="removeItem(i)"
                        />
                    </div>

                    <Button
                        label="Add option"
                        icon="pi pi-plus"
                        text
                        size="small"
                        class="self-start"
                        @click="addItem"
                    />
                </div>
            </div>

            <template #footer>
                <Button label="Cancel" severity="secondary" text @click="closeDialog" />
                <Button
                    label="Save"
                    icon="pi pi-save"
                    :loading="saving"
                    :disabled="!form.key.trim() || !form.label.trim()"
                    @click="save"
                />
            </template>
        </Dialog>

    </div>
</template>
