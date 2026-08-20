<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button, DataTable, Column, InputText, IconField, InputIcon, SplitButton, Tag } from 'primevue';
import type { IForm } from '@services/FormsService';
import { $api } from '@services/api';
import { useTableQuery, ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

const router = useRouter();

// Type filter: null = all, 'jsonschema' = JSON Schema only, 'formjs' = form-js only
type TypeFilter = null | 'jsonschema' | 'formjs';
const typeFilter = ref<TypeFilter>(null);

// "Visual" is every type that is not jsonschema ('default' | 'form' | 'Form' |
// 'custom'), so it needs notEqualsTo rather than an equality match.
const {
    items: forms, totalRecords, loading, search, activeSearch,
    firstRow, rowsPerPage, reload, onPage, onSort, clearSearch,
} = useTableQuery<IForm>({
    load: (params) => $api.forms.getPage(params),
    filter: () => {
        if (typeFilter.value === 'jsonschema') return { type: { equalsTo: 'jsonschema' } };
        if (typeFilter.value === 'formjs')     return { type: { notEqualsTo: 'jsonschema' } };
        return undefined;
    },
});

const newFormItems = [
    {
        label: 'Visual designer (form-js)',
        icon:  'pi pi-objects-column',
        command: () => router.push({ name: 'FormsNew' }),
    },
    {
        label: 'JSON Schema form',
        icon:  'pi pi-code',
        command: () => router.push({ name: 'JsonSchemaNew' }),
    },
];

function openEditor(data: IForm) {
    if (data.type === 'jsonschema') {
        router.push({ name: 'JsonSchemaEdit', params: { id: data.id } });
    } else {
        router.push({ name: 'FormsEdit', params: { id: data.id } });
    }
}
</script>

<template>
    <div class="p-6">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Forms</h1>
                <p class="text-sm text-surface-400 mt-0.5">Form schemas for user tasks and start events</p>
            </div>
            <div class="flex items-center gap-2">
                <IconField>
                    <InputIcon><i class="pi pi-search" /></InputIcon>
                    <InputText
                        v-model="search"
                        placeholder="Search forms..."
                        size="small"
                        style="width: 200px"
                    />
                </IconField>
                <Button size="small" icon="pi pi-refresh" text rounded v-tooltip.top="'Refresh'" @click="reload" />
                <SplitButton
                    size="small"
                    label="New Form"
                    icon="pi pi-plus"
                    :model="newFormItems"
                    @click="router.push({ name: 'FormsNew' })"
                />
            </div>
        </div>

        <!-- Type filter chips -->
        <div class="flex items-center gap-2 mb-4">
            <button
                @click="typeFilter = null"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="typeFilter === null
                    ? 'bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 border-transparent'
                    : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-400'"
            >
                All
            </button>
            <button
                @click="typeFilter = 'formjs'"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="typeFilter === 'formjs'
                    ? 'bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 border-transparent'
                    : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-400'"
            >
                <i class="pi pi-objects-column mr-1" style="font-size: 0.7rem" />
                Visual
            </button>
            <button
                @click="typeFilter = 'jsonschema'"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="typeFilter === 'jsonschema'
                    ? 'bg-violet-600 text-white border-transparent'
                    : 'border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:border-violet-400'"
            >
                <i class="pi pi-code mr-1" style="font-size: 0.7rem" />
                JSON Schema
            </button>

            <span class="text-xs text-surface-400 ml-1">
                {{ totalRecords }} form{{ totalRecords === 1 ? '' : 's' }}
            </span>
        </div>

        <DataTable
            :value="forms"
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
                    <template v-else>No forms found.</template>
                </div>
            </template>

            <Column header="Name" field="name" sortable>
                <template #body="{ data }: { data: IForm }">
                    <div class="flex flex-col py-0.5">
                        <div class="flex items-center gap-2">
                            <a
                                class="font-medium cursor-pointer hover:underline"
                                style="color: var(--layout-accent-color)"
                                @click="openEditor(data)"
                            >{{ data.name }}</a>
                            <Tag
                                v-if="data.type === 'jsonschema'"
                                value="JSON Schema"
                                severity="secondary"
                                style="font-size: 0.65rem; padding: 1px 6px;"
                            />
                        </div>
                        <span v-if="data.description" class="text-xs text-surface-400">{{ data.description }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Code" field="code" sortable style="width: 220px">
                <template #body="{ data }: { data: IForm }">
                    <!-- Forms created before `code` existed fall back to the raw id,
                         same as the editors do when they prefill the Code field. -->
                    <span class="text-xs font-mono text-surface-400">{{ data.code || data.id }}</span>
                </template>
            </Column>

            <Column header="Version" field="version" sortable style="width: 110px">
                <template #body="{ data }">
                    <span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">
                        v{{ data.version }}
                    </span>
                </template>
            </Column>

            <Column header="Fields" style="width: 100px">
                <template #body="{ data }: { data: IForm }">
                    <span v-if="data.type === 'jsonschema'" class="text-xs text-surface-400 italic">
                        {{ Object.keys(data.jsonSchema?.properties ?? {}).length }} props
                    </span>
                    <span v-else class="text-sm text-surface-500">
                        {{ data.components?.length ?? 0 }} fields
                    </span>
                </template>
            </Column>

            <Column header="Actions" style="width: 90px">
                <template #body="{ data }: { data: IForm }">
                    <Button
                        icon="pi pi-pencil"
                        size="small" text rounded
                        v-tooltip.top="data.type === 'jsonschema' ? 'Open JSON Schema editor' : 'Open designer'"
                        @click="openEditor(data)"
                    />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
