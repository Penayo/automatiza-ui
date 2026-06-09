<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast, useConfirm, Button, DataTable, Column, Tag, InputText } from 'primevue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { $api } from '@services/api';
import type { DecisionDefinition } from '@services/DecisionsService';
import { onApprove } from '@/utils/common';

dayjs.extend(relativeTime);

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const decisions = ref<DecisionDefinition[]>([]);
const loading   = ref(false);
const search    = ref('');

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return decisions.value;
    return decisions.value.filter(d =>
        d.name?.toLowerCase().includes(q) ||
        d.decisionId?.toLowerCase().includes(q)
    );
});

async function load() {
    loading.value = true;
    try {
        decisions.value = await $api.decisions.getAll();
    } finally {
        loading.value = false;
    }
}

async function deploy(decision: DecisionDefinition) {
    onApprove(confirm, `Deploy "${decision.name}" v${decision.version}?`, async () => {
        try {
            await $api.decisions.deploy(decision.id);
            toast.add({ severity: 'success', summary: 'Deployed', detail: `"${decision.name}" is now active.`, life: 3000 });
            await load();
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
            await load();
        } catch {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete decision.', life: 3000 });
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
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Decision Definitions</h1>
                <p class="text-sm text-surface-400 mt-0.5">DMN decision tables used by Business Rule Tasks</p>
            </div>
            <div class="flex items-center gap-2">
                <InputText
                    v-model="search"
                    placeholder="Search decisions..."
                    size="small"
                    style="width: 220px"
                />
                <Button
                    icon="pi pi-refresh"
                    size="small"
                    text
                    rounded
                    v-tooltip.top="'Refresh'"
                    @click="load"
                />
                <Button
                    label="New Decision"
                    icon="pi pi-plus"
                    size="small"
                    @click="router.push({ name: 'DecisionNew' })"
                />
            </div>
        </div>

        <!-- Table -->
        <DataTable
            :value="filtered"
            :loading="loading"
            emptyMessage="No decisions found."
            size="small"
            :paginator="decisions.length > 20"
            :rows="20"
        >
            <Column header="Name" field="name">
                <template #body="{ data }">
                    <div class="flex flex-col py-0.5">
                        <span class="font-medium text-(--layout-accent-color)">{{ data.name }}</span>
                        <span class="text-xs text-surface-400 font-mono">{{ data.decisionId }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Version" field="version" style="width: 90px">
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

            <Column header="Deployed" style="width: 140px">
                <template #body="{ data }">
                    <span v-if="data.deployedAt" class="text-xs text-surface-500">
                        {{ dayjs(data.deployedAt).fromNow() }}
                    </span>
                    <span v-else class="text-xs text-surface-400">—</span>
                </template>
            </Column>

            <Column header="Created" style="width: 140px">
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
