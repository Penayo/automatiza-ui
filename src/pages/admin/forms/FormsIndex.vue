<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast, Button, DataTable, Column, InputText, SplitButton, Tag } from 'primevue';
import type { IForm } from '@services/FormsService';
import { $api } from '@services/api';

const router  = useRouter();
const toast   = useToast();
const forms   = ref<IForm[]>([]);
const loading = ref(false);
const search  = ref('');

// Type filter: null = all, 'jsonschema' = JSON Schema only, 'formjs' = form-js only
type TypeFilter = null | 'jsonschema' | 'formjs';
const typeFilter = ref<TypeFilter>(null);

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

const filtered = computed(() => {
    let result = forms.value;

    if (typeFilter.value === 'jsonschema') {
        result = result.filter(f => f.type === 'jsonschema');
    } else if (typeFilter.value === 'formjs') {
        result = result.filter(f => f.type !== 'jsonschema');
    }

    const q = search.value.trim().toLowerCase();
    if (!q) return result;
    return result.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.id?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
    );
});

function openEditor(data: IForm) {
    if (data.type === 'jsonschema') {
        router.push({ name: 'JsonSchemaEdit', params: { id: data.id } });
    } else {
        router.push({ name: 'FormsEdit', params: { id: data.id } });
    }
}

async function load() {
    loading.value = true;
    try {
        forms.value = await $api.forms.getAll();
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load forms.', life: 3000 });
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div class="p-6">
        <div class="flex items-center justify-between mb-4">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Forms</h1>
                <p class="text-sm text-surface-400 mt-0.5">Form schemas for user tasks and start events</p>
            </div>
            <div class="flex items-center gap-2">
                <InputText
                    v-model="search"
                    placeholder="Search forms..."
                    size="small"
                    style="width: 200px"
                />
                <Button size="small" icon="pi pi-refresh" text rounded @click="load" />
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
                All ({{ forms.length }})
            </button>
            <button
                @click="typeFilter = 'formjs'"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="typeFilter === 'formjs'
                    ? 'bg-surface-800 dark:bg-surface-200 text-white dark:text-surface-900 border-transparent'
                    : 'border-surface-300 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:border-surface-400'"
            >
                <i class="pi pi-objects-column mr-1" style="font-size: 0.7rem" />
                Visual ({{ forms.filter(f => f.type !== 'jsonschema').length }})
            </button>
            <button
                @click="typeFilter = 'jsonschema'"
                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                :class="typeFilter === 'jsonschema'
                    ? 'bg-violet-600 text-white border-transparent'
                    : 'border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400 hover:border-violet-400'"
            >
                <i class="pi pi-code mr-1" style="font-size: 0.7rem" />
                JSON Schema ({{ forms.filter(f => f.type === 'jsonschema').length }})
            </button>
        </div>

        <DataTable
            :value="filtered"
            :loading="loading"
            emptyMessage="No forms found."
            size="small"
        >
            <Column header="Name">
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

            <Column header="ID" style="width: 220px">
                <template #body="{ data }">
                    <span class="text-xs font-mono text-surface-400">{{ data.id }}</span>
                </template>
            </Column>

            <Column header="Version" style="width: 90px">
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
