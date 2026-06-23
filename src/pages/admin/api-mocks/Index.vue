<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button, DataTable, Column, Tag, ToggleSwitch, useToast, useConfirm } from 'primevue';
import Page from '@components/Page.vue';
import { $api } from '@services/api';
import type { IApiMock } from '@services/ApiMocksService';
import ApiMockFormDialog from './components/ApiMockFormDialog.vue';

const toast   = useToast();
const confirm = useConfirm();

const mocks   = ref<IApiMock[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try { mocks.value = await $api.apiMocks.findAll(); }
    finally { loading.value = false; }
}
onMounted(load);

// ── Dialog state ──────────────────────────────────────────────────────────────

const dialogVisible = ref(false);
const editingMock   = ref<IApiMock | null>(null);

function openNew() {
    editingMock.value   = null;
    dialogVisible.value = true;
}

function openEdit(mock: IApiMock) {
    editingMock.value   = mock;
    dialogVisible.value = true;
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function toggleEnabled(mock: IApiMock) {
    try {
        await $api.apiMocks.toggleEnabled(mock._id!);
        await load();
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not toggle mock.', life: 3000 });
    }
}

function confirmDelete(mock: IApiMock) {
    confirm.require({
        message: `Delete mock "${mock.name}"?`,
        header: 'Delete',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Delete',
        acceptClass: 'p-button-danger',
        accept: async () => {
            await $api.apiMocks.remove(mock._id!);
            toast.add({ severity: 'success', summary: 'Deleted', life: 3000 });
            await load();
        },
    });
}

// ── Display helpers ───────────────────────────────────────────────────────────

const statusSeverity = (s: number) =>
    s >= 500 ? 'danger' : s >= 400 ? 'warn' : s >= 200 ? 'success' : 'secondary';

const methodSeverity = (m: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' => {
    if (m === 'GET')                      return 'success';
    if (m === 'POST')                     return 'info';
    if (m === 'PUT' || m === 'PATCH')     return 'warn';
    if (m === 'DELETE')                   return 'danger';
    return 'secondary';
};
</script>

<template>
    <Page title="API Mocks">
        <template #actions>
            <Button label="New Mock" icon="pi pi-plus" @click="openNew" />
        </template>

        <DataTable :value="mocks" :loading="loading" dataKey="_id" stripedRows>
            <Column field="enabled" header="" style="width:50px">
                <template #body="{ data }">
                    <ToggleSwitch :modelValue="data.enabled" @update:modelValue="toggleEnabled(data)" />
                </template>
            </Column>
            <Column field="method" header="Method" style="width:100px">
                <template #body="{ data }">
                    <Tag :value="data.method" :severity="methodSeverity(data.method)" class="font-mono text-xs" />
                </template>
            </Column>
            <Column field="url" header="URL" class="font-mono text-sm" />
            <Column field="name" header="Name" />
            <Column header="Response" style="width:120px">
                <template #body="{ data }">
                    <Tag
                        :value="`${data.scenarios[data.activeScenarioIndex]?.status ?? '—'}`"
                        :severity="statusSeverity(data.scenarios[data.activeScenarioIndex]?.status)"
                        class="font-mono text-xs"
                    />
                </template>
            </Column>
            <Column header="Delay" style="width:120px">
                <template #body="{ data }">
                    <span class="text-xs text-zinc-400 font-mono">
                        {{ data.behavior.delayMs }}ms
                        <span v-if="data.behavior.delayJitterMs"> ± {{ data.behavior.delayJitterMs }}ms</span>
                    </span>
                </template>
            </Column>
            <Column field="tags" header="Tags" style="width:160px">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                        <Tag v-for="tag in data.tags" :key="tag" :value="tag" severity="secondary" class="text-xs" />
                    </div>
                </template>
            </Column>
            <Column header="" style="width:90px">
                <template #body="{ data }">
                    <div class="flex gap-1">
                        <Button icon="pi pi-pencil" size="small" text rounded severity="secondary" @click="openEdit(data)" />
                        <Button icon="pi pi-trash"  size="small" text rounded severity="danger"    @click="confirmDelete(data)" />
                    </div>
                </template>
            </Column>
            <template #empty>
                <div class="text-center text-zinc-400 py-8">
                    No API mocks yet. Create one to start intercepting REST tasks in test mode.
                </div>
            </template>
        </DataTable>
    </Page>

    <ApiMockFormDialog
        v-model:visible="dialogVisible"
        :mock="editingMock"
        @saved="load"
    />
</template>
