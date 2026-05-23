<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Button, Tag, useToast } from 'primevue';
import { $api } from '@services/api';
import type { AuditLog } from '@services/AuditService';

const props = defineProps<{ processInstanceId: string | undefined }>();
const toast = useToast();

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const page = ref(1);
const total = ref(0);
const pages = ref(1);
const LIMIT = 20;

const activeLevel = ref<string | null>(null);

const levelOptions = [
    { label: 'All', value: null },
    { label: 'Info', value: 'info' },
    { label: 'Warn', value: 'warn' },
    { label: 'Error', value: 'error' },
];

const fetchLogs = async (append = false) => {
    if (!props.processInstanceId) return;
    loading.value = true;
    try {
        const query: Record<string, any> = {
            processInstanceId: props.processInstanceId,
            category: 'process',
            page: page.value,
            limit: LIMIT,
        };
        if (activeLevel.value) query.level = activeLevel.value;

        const res = await $api.audit.getLogs(query);
        logs.value = append ? [...logs.value, ...res.data] : res.data;
        total.value = res.total;
        pages.value = res.pages;
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load process logs', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const setLevel = (level: string | null) => {
    activeLevel.value = level;
    page.value = 1;
    fetchLogs();
};

const loadMore = () => {
    page.value++;
    fetchLogs(true);
};

const levelSeverity = (level: string) => {
    if (level === 'error') return 'danger';
    if (level === 'warn') return 'warn';
    return 'success';
};

const levelIcon = (level: string) => {
    if (level === 'error') return 'pi pi-times-circle';
    if (level === 'warn') return 'pi pi-exclamation-triangle';
    return 'pi pi-info-circle';
};

const expandedIds = ref<Set<string>>(new Set());
const toggleExpand = (id: string) => {
    if (expandedIds.value.has(id)) expandedIds.value.delete(id);
    else expandedIds.value.add(id);
};

watch(() => props.processInstanceId, () => {
    page.value = 1;
    fetchLogs();
});

onMounted(() => fetchLogs());
</script>

<template>
    <div class="flex flex-col gap-3 mt-2">

        <!-- Level filter chips -->
        <div class="flex gap-2 items-center">
            <span class="text-xs text-zinc-400">Filter:</span>
            <button
                v-for="opt in levelOptions"
                :key="String(opt.value)"
                class="px-3 py-1 rounded-full text-xs border transition-colors"
                :class="activeLevel === opt.value
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-400 hover:border-emerald-500'"
                @click="setLevel(opt.value)"
            >
                {{ opt.label }}
            </button>
            <span class="ml-auto text-xs text-zinc-400">{{ total }} entries</span>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading && logs.length === 0" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading && logs.length === 0" class="text-center py-8 text-zinc-400 text-sm">
            No log entries found.
        </div>

        <!-- Log entries -->
        <div v-else class="flex flex-col gap-2">
            <div
                v-for="entry in logs"
                :key="entry._id"
                class="rounded-lg border text-sm"
                :class="{
                    'border-zinc-400/40 bg-zinc-500/10': entry.level === 'debug',
                    'border-red-400/40 bg-red-500/10': entry.level === 'error',
                    'border-yellow-400/40 bg-yellow-500/10': entry.level === 'warn',
                    'border-emerald-400/30 bg-emerald-500/5': entry.level === 'info',
                }"
            >
                <div class="flex items-start gap-3 px-3 py-2">
                    <i :class="[levelIcon(entry.level), 'mt-0.5 shrink-0', {
                            'text-red-400': entry.level === 'error',
                            'text-yellow-400': entry.level === 'warn',
                            'text-emerald-500': entry.level === 'info',
                        }]"
                    />
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <Tag :severity="levelSeverity(entry.level)" :value="entry.level.toUpperCase()" class="text-xs" />
                            <span class="text-xs text-zinc-400">{{ new Date(entry.timestamp).toLocaleString() }}</span>
                        </div>
                        <p class="mt-1 text-zinc-700 dark:text-zinc-200 break-words">{{ entry.message }}</p>
                    </div>

                    <button
                        v-if="entry.metadata && Object.keys(entry.metadata).length"
                        class="shrink-0 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                        @click="toggleExpand(entry._id)"
                    >
                        <i :class="expandedIds.has(entry._id) ? 'pi pi-chevron-up' : 'pi pi-chevron-down'" />
                    </button>
                </div>

                <!-- Expandable metadata -->
                <div v-if="expandedIds.has(entry._id)" class="border-t border-inherit px-3 py-2">
                    <pre class="text-xs text-zinc-600 dark:text-zinc-300 overflow-auto max-h-40 whitespace-pre-wrap">{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
                </div>
            </div>
        </div>

        <!-- Load more -->
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
    </div>
</template>
