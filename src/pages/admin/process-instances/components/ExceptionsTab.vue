<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Button, useToast } from 'primevue';
import { $api } from '@services/api';
import type { ProcessException } from '@services/ProcessesService';

const props = defineProps<{ processInstanceId: string | undefined }>();
const toast = useToast();

const exceptions = ref<ProcessException[]>([]);
const loading = ref(false);
const page    = ref(1);
const total   = ref(0);
const pages   = ref(1);
const LIMIT   = 10;

const fetchExceptions = async (append = false) => {
    if (!props.processInstanceId) return;
    loading.value = true;
    try {
        const res = await $api.processes.getInstanceExceptions(props.processInstanceId, { page: page.value, rowsPerPage: LIMIT });
        exceptions.value = append ? [...exceptions.value, ...res.rows] : res.rows;
        total.value = res.totalRecords;
        pages.value = Math.ceil(res.totalRecords / LIMIT) || 1;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load exceptions', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const loadMore = () => {
    page.value++;
    fetchExceptions(true);
};

watch(() => props.processInstanceId, () => {
    page.value = 1;
    fetchExceptions();
});

onMounted(() => fetchExceptions());
</script>

<template>
    <div class="flex flex-col gap-4 mt-2">
        <div v-if="total > 0" class="flex justify-end">
            <span class="text-xs text-zinc-400">{{ total }} exceptions</span>
        </div>

        <div v-if="loading && exceptions.length === 0" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
        </div>

        <div v-else-if="exceptions.length === 0" class="flex items-center justify-center h-24 text-surface-400 text-sm">
            No exceptions recorded.
        </div>

        <template v-else>
            <div
                v-for="exception in exceptions"
                :key="`${exception.taskId}-${exception.createdAt}`"
                class="border border-red-200 dark:border-red-900/40 rounded-lg p-4 flex flex-col gap-2"
            >
                <div class="flex flex-col gap-0.5">
                    <span class="text-xs text-surface-400 font-mono">{{ exception.taskId }}</span>
                    <span class="text-xs text-surface-500">{{ new Date(exception.createdAt).toLocaleString() }}</span>
                </div>
                <pre class="text-xs bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3 rounded overflow-x-auto whitespace-pre-wrap break-all">{{ JSON.stringify(exception.error, null, 2) }}</pre>
            </div>

            <div v-if="page < pages" class="flex justify-center pt-2">
                <Button
                    label="Load more"
                    icon="pi pi-chevron-down"
                    severity="secondary"
                    variant="outlined"
                    size="small"
                    :loading="loading"
                    @click="loadMore"
                />
            </div>
        </template>
    </div>
</template>
