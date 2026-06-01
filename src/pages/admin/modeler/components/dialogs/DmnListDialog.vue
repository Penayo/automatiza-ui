<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, DataTable, Column, Button, Tag } from 'primevue';
import { useRouter } from 'vue-router';
import { $api } from '@services/api';
import type { DecisionDefinition } from '@services/DecisionsService';
import dayjs from 'dayjs';

const visible = defineModel<boolean>('visible', { default: false });
const router  = useRouter();

const items   = ref<DecisionDefinition[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try {
        items.value = await $api.decisions.getAll();
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
        header="DMN Decisions"
        :style="{ width: '680px' }"
        :dismissableMask="true"
    >
        <DataTable :value="items" :loading="loading" size="small" stripedRows>
            <template #empty><div class="text-center py-6 text-surface-400">No decisions defined yet.</div></template>
            <Column field="decisionId" header="Decision ID" class="font-mono text-xs" style="width:200px" />
            <Column field="name" header="Name" />
            <Column field="version" header="v" style="width:50px">
                <template #body="{ data }">
                    <Tag :value="`v${data.version}`" severity="secondary" class="text-xs" />
                </template>
            </Column>
            <Column field="deployedAt" header="Deployed" style="width:120px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.deployedAt ? dayjs(data.deployedAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:60px">
                <template #body="{ data }">
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Edit'"
                        @click="router.push({ name: 'DecisionEdit', params: { id: data.id } }); visible = false" />
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="New Decision" icon="pi pi-plus" size="small"
                @click="router.push({ name: 'DecisionNew' }); visible = false" />
        </template>
    </Dialog>
</template>
