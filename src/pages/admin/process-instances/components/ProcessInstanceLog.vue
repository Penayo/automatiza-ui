<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent, Button, Tag, useToast } from 'primevue';
import { $api } from '@services/api';
import type { AuditLog } from '@services/AuditService';

const props = defineProps<{ processInstanceId: string | undefined }>();
const toast = useToast();

const logs    = ref<AuditLog[]>([]);
const loading = ref(false);
const page    = ref(1);
const total   = ref(0);
const pages   = ref(1);
const LIMIT   = 20;

const activeLevel = ref<string | null>(null);

const levelOptions = [
    { label: 'All',   value: null    },
    { label: 'Info',  value: 'info'  },
    { label: 'Warn',  value: 'warn'  },
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
        logs.value  = append ? [...logs.value, ...res.data] : res.data;
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
    if (level === 'warn')  return 'warn';
    if (level === 'debug') return 'secondary';
    return 'success';
};

const levelIcon = (level: string) => {
    if (level === 'error') return 'pi pi-times-circle';
    if (level === 'warn')  return 'pi pi-exclamation-triangle';
    if (level === 'debug') return 'pi pi-cog';
    return 'pi pi-info-circle';
};

const levelColor = (level: string) => {
    if (level === 'error') return 'text-red-400';
    if (level === 'warn')  return 'text-yellow-400';
    if (level === 'debug') return 'text-zinc-400';
    return 'text-emerald-500';
};

const borderColor = (level: string) => {
    if (level === 'error') return 'border-l-red-400';
    if (level === 'warn')  return 'border-l-yellow-400';
    if (level === 'debug') return 'border-l-zinc-500';
    return 'border-l-emerald-500';
};

const hasDetails = (entry: AuditLog) =>
    !!(entry.metadata && Object.keys(entry.metadata).length) ||
    !!entry.actorUsername ||
    !!entry.action ||
    !!entry.taskId;

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

        <!-- Loading -->
        <div v-if="loading && logs.length === 0" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
        </div>

        <!-- Empty -->
        <div v-else-if="!loading && logs.length === 0" class="text-center py-8 text-zinc-400 text-sm">
            No log entries found.
        </div>

        <!-- Accordion log list -->
        <Accordion v-else multiple class="flex flex-col gap-1 log-accordion">
            <AccordionPanel
                v-for="entry in logs"
                :key="entry._id"
                :value="entry._id"
                :disabled="!hasDetails(entry)"
                class="rounded border border-surface-200 dark:border-zinc-700 overflow-hidden border-l-2"
                :class="borderColor(entry.level)"
            >
                <AccordionHeader>
                    <div class="flex items-center gap-2 w-full min-w-0">
                        <i :class="[levelIcon(entry.level), levelColor(entry.level), 'shrink-0 text-xs']" />
                        <Tag
                            :severity="levelSeverity(entry.level)"
                            :value="entry.level.toUpperCase()"
                            class="shrink-0"
                        />
                        <span class="flex-1 min-w-0 truncate text-sm text-zinc-700 dark:text-zinc-200">
                            {{ entry.message }}
                        </span>
                        <span class="shrink-0 text-xs text-zinc-400 ml-2 mr-4">
                            {{ new Date(entry.timestamp).toLocaleString() }}
                        </span>
                    </div>
                </AccordionHeader>

                <AccordionContent v-if="hasDetails(entry)">
                    <div class="px-3 py-2 flex flex-col gap-2 bg-surface-50 dark:bg-zinc-800/50">

                        <!-- Full message (in case it was truncated) -->
                        <p class="text-xs text-zinc-700 dark:text-zinc-200 wrap-break-word">{{ entry.message }}</p>

                        <!-- Quick-info row -->
                        <div v-if="entry.actorUsername || entry.action || entry.taskId" class="flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                            <span v-if="entry.actorUsername">
                                <i class="pi pi-user mr-1" style="font-size:0.65rem" />{{ entry.actorUsername }}
                            </span>
                            <span v-if="entry.action">
                                <i class="pi pi-tag mr-1" style="font-size:0.65rem" />{{ entry.action }}
                            </span>
                            <span v-if="entry.taskId">
                                <i class="pi pi-list mr-1" style="font-size:0.65rem" />{{ entry.taskId }}
                            </span>
                        </div>

                        <!-- Metadata JSON -->
                        <pre
                            v-if="entry.metadata && Object.keys(entry.metadata).length"
                            class="text-xs text-zinc-600 dark:text-zinc-300 overflow-auto max-h-48 whitespace-pre-wrap bg-surface-100 dark:bg-zinc-900 rounded p-2"
                        >{{ JSON.stringify(entry.metadata, null, 2) }}</pre>
                    </div>
                </AccordionContent>
            </AccordionPanel>
        </Accordion>

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

