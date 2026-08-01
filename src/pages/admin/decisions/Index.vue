<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast, useConfirm, Button, DataTable, Column, Tag, InputText, IconField, InputIcon } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { $api } from '@services/api';
import type { DecisionDefinition } from '@services/DecisionsService';
import { onApprove } from '@/utils/common';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

dayjs.extend(relativeTime);

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

// null = all. `deployedAt` is a nullable date rather than a string, so the API
// takes this as a flat `deployed` param instead of a filter[…] entry.
const deployedFilter = ref<boolean | null>(null);

const {
    items: decisions, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, onPage, onSort, clearSearch,
} = useTableQuery<DecisionDefinition>({
    load: (params) => $api.decisions.getPage(params),
    extraParams: () => (deployedFilter.value === null ? {} : { deployed: deployedFilter.value }),
});

async function deploy(decision: DecisionDefinition) {
    onApprove(confirm, `Deploy "${decision.name}" v${decision.version}?`, async () => {
        try {
            await $api.decisions.deploy(decision.id);
            toast.add({ severity: 'success', summary: 'Deployed', detail: `"${decision.name}" is now active.`, life: 3000 });
            await reload();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not deploy decision.', life: 3000 });
        }
    });
}

async function remove(decision: DecisionDefinition) {
    onApprove(confirm, `Delete "${decision.name}" v${decision.version}? This cannot be undone.`, async () => {
        try {
            await $api.decisions.remove(decision.id);
            toast.add({ severity: 'success', summary: 'Deleted', detail: `"${decision.name}" deleted.`, life: 3000 });
            // reload(), not fetchPage() — deleting a row shouldn't jump back to page 1.
            await reload();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete decision.', life: 3000 });
        }
    });
}
</script>

<template>
    <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Decision Definitions</h1>
                <p class="text-sm text-surface-400 mt-0.5">DMN decision tables used by Business Rule Tasks</p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText
                        v-model="search"
                        placeholder="Search decisions..."
                        size="small"
                        style="width: 220px"
                    />
                </IconField>
                <Button
                    icon="pi pi-refresh"
                    size="small"
                    text
                    rounded
                    v-tooltip.top="'Refresh'"
                    @click="reload"
                />
                <Button
                    label="New Decision"
                    icon="pi pi-plus"
                    size="small"
                    @click="router.push({ name: 'DecisionNew' })"
                />
            </div>
        </div>

        <!-- Deployment state filter -->
        <div class="flex items-center gap-2 mb-4">
            <button
                v-for="opt in [
                    { label: 'All',      value: null },
                    { label: 'Deployed', value: true },
                    { label: 'Draft',    value: false },
                ]"
                :key="String(opt.value)"
                @click="deployedFilter = opt.value"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="deployedFilter === opt.value
                    ? 'bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 border-transparent'
                    : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-400'"
            >
                {{ opt.label }}
            </button>

            <span class="text-xs text-surface-400 ml-1">
                {{ totalRecords }} decision{{ totalRecords === 1 ? '' : 's' }}
            </span>
        </div>

        <!-- Table -->
        <DataTable
            :value="decisions"
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
                    <template v-else>No decisions found.</template>
                </div>
            </template>

            <Column header="Name" field="name" sortable>
                <template #body="{ data }">
                    <div class="flex flex-col py-0.5">
                        <span class="font-medium text-(--layout-accent-color)">{{ data.name }}</span>
                        <span class="text-xs text-surface-400 font-mono">{{ data.decisionId }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Version" field="version" sortable style="width: 110px">
                <template #body="{ data }">
                    <span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">v{{ data.version }}</span>
                </template>
            </Column>

            <Column header="Status" style="width: 130px">
                <template #body="{ data }">
                    <Tag
                        v-if="data.deployedAt"
                        value="Deployed"
                        severity="success"
                        class="text-xs"
                    />
                    <Tag
                        v-else
                        value="Draft"
                        severity="secondary"
                        class="text-xs"
                    />
                </template>
            </Column>

            <Column header="Deployed" field="deployedAt" sortable style="width: 160px">
                <template #body="{ data }">
                    <span v-if="data.deployedAt" class="text-xs text-surface-500">
                        {{ dayjs(data.deployedAt).fromNow() }}
                    </span>
                    <span v-else class="text-xs text-surface-400">—</span>
                </template>
            </Column>

            <Column header="Created" field="createdAt" sortable style="width: 160px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-500">{{ dayjs(data.createdAt).fromNow() }}</span>
                </template>
            </Column>

            <Column header="Actions" style="width: 160px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button
                            icon="pi pi-pencil"
                            size="small"
                            text
                            rounded
                            v-tooltip.top="'Edit in modeler'"
                            @click="router.push({ name: 'DecisionEdit', params: { id: data.id } })"
                        />
                        <Button
                            icon="pi pi-cloud-upload"
                            size="small"
                            text
                            rounded
                            :disabled="!!data.deployedAt"
                            v-tooltip.top="data.deployedAt ? 'Already deployed' : 'Deploy'"
                            @click="deploy(data)"
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
