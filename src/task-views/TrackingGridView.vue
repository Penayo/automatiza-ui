<script setup lang="ts">
import { ref } from 'vue';
import { DataTable, Column, InputText, Tag } from 'primevue';
import type { Task } from '@services/TasksService';

const props = defineProps<{
    task: Task | null;
    variables: Record<string, any>;
    readOnly?: boolean;
}>();

// Expects variables.items: Array<{ serialNumber, trackingCode, status }>
const rows = ref<Record<string, any>[]>(
    (props.variables?.items ?? []).map((r: any) => ({ ...r }))
);

const STATUS_OPTIONS = ['pending', 'shipped', 'delivered'];

function statusSeverity(status: string) {
    if (status === 'delivered') return 'success';
    if (status === 'shipped')   return 'info';
    return 'warn';
}

// Called by TaskForm.vue action bar for both Save and Submit
defineExpose({
    getVariables: () => ({ ...props.variables, items: rows.value }),
});
</script>

<template>
    <div class="flex flex-col gap-4 p-4">
        <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold text-surface-800 dark:text-surface-100">
                {{ task?.name ?? 'Tracking Grid' }}
            </h3>
            <span class="text-xs text-surface-400">{{ rows.length }} items</span>
        </div>

        <DataTable
            :value="rows"
            size="small"
            scrollable
            scroll-height="400px"
            class="text-sm"
        >
            <Column field="serialNumber" header="Serial #" style="width: 160px">
                <template #body="{ data }">
                    <span class="font-mono text-xs">{{ data.serialNumber }}</span>
                </template>
            </Column>

            <Column field="trackingCode" header="Tracking Code" style="width: 200px">
                <template #body="{ data }">
                    <InputText
                        v-if="!readOnly"
                        v-model="data.trackingCode"
                        size="small"
                        class="w-full font-mono text-xs"
                        placeholder="Enter tracking code"
                    />
                    <span v-else class="font-mono text-xs">{{ data.trackingCode || '—' }}</span>
                </template>
            </Column>

            <Column field="status" header="Status" style="width: 140px">
                <template #body="{ data }">
                    <select
                        v-if="!readOnly"
                        v-model="data.status"
                        class="w-full text-xs border border-surface-300 dark:border-zinc-600 rounded px-2 py-1 bg-surface-0 dark:bg-zinc-800"
                    >
                        <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <Tag
                        v-else
                        :value="data.status"
                        :severity="statusSeverity(data.status)"
                        class="text-xs"
                    />
                </template>
            </Column>
        </DataTable>

    </div>
</template>
