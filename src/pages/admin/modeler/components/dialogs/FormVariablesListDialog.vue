<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, DataTable, Column, Button, Tag } from 'primevue';
import { useRouter } from 'vue-router';
import { $api } from '@services/api';
import type { FormVariable } from '@services/FormVariablesService';

const visible = defineModel<boolean>('visible', { default: false });
const router  = useRouter();

const items   = ref<FormVariable[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try {
        items.value = await $api.formVariables.getAll();
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
        header="Form Variables"
        :style="{ width: '680px' }"
        :dismissableMask="true"
    >
        <DataTable :value="items" :loading="loading" size="small" stripedRows>
            <template #empty><div class="text-center py-6 text-surface-400">No form variables defined yet.</div></template>
            <Column field="key"   header="Key"   class="font-mono text-xs" style="width:180px" />
            <Column field="label" header="Label" />
            <Column field="description" header="Description" class="text-surface-400 text-sm" />
            <Column header="Options" style="width:90px">
                <template #body="{ data }">
                    <Tag :value="`${data.items?.length ?? 0} opts`" severity="secondary" class="text-xs" />
                </template>
            </Column>
            <Column style="width:60px">
                <template #body>
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Manage'"
                        @click="router.push({ name: 'FormVariablesIndex' }); visible = false" />
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="Manage Variables" icon="pi pi-list" size="small"
                @click="router.push({ name: 'FormVariablesIndex' }); visible = false" />
        </template>
    </Dialog>
</template>
