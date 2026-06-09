<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast, Button, DataTable, Column, InputText } from 'primevue';
import type { IForm } from '@services/FormsService';
import { $api } from '@services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const router  = useRouter();
const toast   = useToast();
const forms   = ref<IForm[]>([]);
const loading = ref(false);
const search  = ref('');

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return forms.value;
    return forms.value.filter(f =>
        f.name?.toLowerCase().includes(q) ||
        f.id?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q)
    );
});

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
        <div class="flex items-center justify-between mb-6">
            <div>
                <h1 class="text-2xl font-semibold" style="color: var(--layout-title-color)">Forms</h1>
                <p class="text-sm text-surface-400 mt-0.5">Form schemas for user tasks and start events</p>
            </div>
            <div class="flex items-center gap-2">
                <InputText
                    v-model="search"
                    placeholder="Search forms..."
                    size="small"
                    style="width: 220px"
                />
                <Button
                    size="small"
                    icon="pi pi-refresh"
                    text
                    round
                    @click="load"
                />                
                <Button
                    size="small"
                    label="New Form"
                    icon="pi pi-plus"
                    @click="router.push({ name: 'FormsNew' })"
                />
            </div>
        </div>

        <DataTable
            :value="filtered"
            :loading="loading"
            emptyMessage="No forms found."
            size="small"
        >
            <Column header="ID" style="width: 220px">
                <template #body="{ data }">
                    <span class="text-xs font-mono text-surface-400">{{ data.id }}</span>
                </template>
            </Column>

            <Column header="Name">
                <template #body="{ data }">
                    <div class="flex flex-col py-0.5">
                        <a
                            class="font-medium cursor-pointer hover:underline"
                            style="color: var(--layout-accent-color)"
                            @click="router.push({ name: 'FormsEdit', params: { id: data.id } })"
                        >{{ data.name }}</a>
                        <span v-if="data.description" class="text-xs text-surface-400">{{ data.description }}</span>
                    </div>
                </template>
            </Column>

            <Column header="Version" style="width: 90px">
                <template #body="{ data }">
                    <span class="text-xs font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded text-surface-500">
                        v{{ data.version }}
                    </span>
                </template>
            </Column>

            <Column header="Components" style="width: 110px">
                <template #body="{ data }">
                    <span class="text-sm text-surface-500">{{ data.components?.length ?? 0 }} fields</span>
                </template>
            </Column>

            <Column header="Actions" style="width: 90px">
                <template #body="{ data }">
                    <Button
                        icon="pi pi-pencil"
                        size="small"
                        text
                        rounded
                        v-tooltip.top="'Open designer'"
                        @click="router.push({ name: 'FormsEdit', params: { id: data.id } })"
                    />
                </template>
            </Column>
        </DataTable>
    </div>
</template>
