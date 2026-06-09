<script setup lang="ts">
import { ref, watch } from 'vue';
import { Dialog, DataTable, Column, Button } from 'primevue';
import { useRouter } from 'vue-router';
import { $api } from '@services/api';
import type { IForm } from '@services/FormsService';
import dayjs from 'dayjs';

const visible = defineModel<boolean>('visible', { default: false });
const router  = useRouter();

const items   = ref<IForm[]>([]);
const loading = ref(false);

async function load() {
    loading.value = true;
    try {
        items.value = await $api.forms.getAll() as IForm[];
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
        header="Forms"
        :style="{ width: '680px' }"
        :dismissableMask="true"
    >
        <DataTable :value="items" :loading="loading" size="small" stripedRows>
            <template #empty><div class="text-center py-6 text-surface-400">No forms defined yet.</div></template>
            <Column field="id"   header="ID"   class="font-mono text-xs" style="width:220px" />
            <Column field="name" header="Name" />
            <Column field="createdAt" header="Created" style="width:120px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">{{ data.createdAt ? dayjs(data.createdAt).format('MMM D, YYYY') : '—' }}</span>
                </template>
            </Column>
            <Column style="width:60px">
                <template #body>
                    <Button icon="pi pi-pencil" text rounded size="small" severity="secondary"
                        v-tooltip.top="'Open Form Builder'"
                        @click="router.push({ name: 'FormsList' }); visible = false" />
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="Form Builder" icon="pi pi-file-edit" size="small"
                @click="router.push({ name: 'FormsList' }); visible = false" />
        </template>
    </Dialog>
</template>
