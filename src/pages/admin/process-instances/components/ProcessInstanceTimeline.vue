<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Tag, useToast } from 'primevue';
import { $api } from '@services/api';
import type { ProcessTimelineEntry } from '@services/AuditService';

const props = defineProps<{ processInstanceId: string | undefined }>();
const toast = useToast();

const entries = ref<ProcessTimelineEntry[]>([]);
const loading = ref(false);

const actionConfig: Record<string, { label: string; severity: string; icon: string }> = {
    PROCESS_STARTED:   { label: 'Started',    severity: 'info',      icon: 'pi pi-play' },
    PROCESS_COMPLETED: { label: 'Completed',  severity: 'success',   icon: 'pi pi-check-circle' },
    PROCESS_FAILED:    { label: 'Failed',     severity: 'danger',    icon: 'pi pi-times-circle' },
    TASK_CREATED:      { label: 'Created',    severity: 'secondary', icon: 'pi pi-plus-circle' },
    TASK_STARTED:      { label: 'Started',    severity: 'secondary', icon: 'pi pi-play' },
    TASK_CLAIMED:      { label: 'Claimed',    severity: 'info',      icon: 'pi pi-user' },
    TASK_ASSIGNED:     { label: 'Assigned',   severity: 'info',      icon: 'pi pi-user-plus' },
    TASK_COMPLETED:    { label: 'Completed',  severity: 'success',   icon: 'pi pi-check' },
    TASK_FAILED:       { label: 'Failed',     severity: 'danger',    icon: 'pi pi-times' },
    TASK_RETRIED:      { label: 'Retried',    severity: 'warn',      icon: 'pi pi-refresh' },
    TASK_REPLAYED:     { label: 'Replayed',   severity: 'warn',      icon: 'pi pi-replay' },
};

const cfg = (action: string) =>
    actionConfig[action] ?? { label: action.replace(/_/g, ' '), severity: 'secondary', icon: 'pi pi-circle' };

const isHuman = (actor: string) => actor && actor !== 'system';

const fetchTimeline = async () => {
    if (!props.processInstanceId) return;
    loading.value = true;
    try {
        entries.value = await $api.audit.getProcessTimeline(props.processInstanceId);
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load process timeline', life: 3000 });
    } finally {
        loading.value = false;
    }
};

watch(() => props.processInstanceId, fetchTimeline);
onMounted(fetchTimeline);
</script>

<template>
    <div class="mt-2">

        <div v-if="loading" class="flex justify-center py-8">
            <i class="pi pi-spin pi-spinner text-2xl text-zinc-400" />
        </div>

        <div v-else-if="entries.length === 0" class="text-center py-8 text-zinc-400 text-sm">
            No business events recorded for this instance yet.
        </div>

        <ol v-else class="relative border-l border-zinc-200 dark:border-zinc-700 ml-4 flex flex-col gap-0">
            <li
                v-for="(entry, i) in entries"
                :key="i"
                class="mb-6 ml-6"
            >
                <!-- dot -->
                <span
                    class="absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-zinc-900"
                    :class="entry.action.includes('FAILED') ? 'bg-red-100 dark:bg-red-900/40' :
                            entry.action.includes('COMPLETED') ? 'bg-emerald-100 dark:bg-emerald-900/40' :
                            'bg-zinc-100 dark:bg-zinc-800'"
                >
                    <i
                        :class="[cfg(entry.action).icon, 'text-xs',
                            entry.action.includes('FAILED')    ? 'text-red-500'     :
                            entry.action.includes('COMPLETED') ? 'text-emerald-600 dark:text-emerald-400' :
                            'text-zinc-400']"
                    />
                </span>

                <!-- card -->
                <div class="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 shadow-sm">
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                        <Tag
                            :value="cfg(entry.action).label"
                            :severity="cfg(entry.action).severity"
                            class="text-xs"
                        />
                        <span v-if="entry.taskName" class="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                            {{ entry.taskName }}
                        </span>
                        <span class="ml-auto text-xs text-zinc-400 whitespace-nowrap">
                            {{ new Date(entry.timestamp).toLocaleString() }}
                        </span>
                    </div>

                    <p class="text-sm text-zinc-600 dark:text-zinc-300 truncate">{{ entry.message }}</p>

                    <div class="flex items-center gap-1 mt-1.5">
                        <i
                            :class="isHuman(entry.actorUsername)
                                ? 'pi pi-user text-sky-500'
                                : 'pi pi-cog text-zinc-400'"
                            style="font-size: 0.65rem"
                        />
                        <span class="text-xs text-zinc-400">{{ entry.actorUsername }}</span>
                    </div>
                </div>
            </li>
        </ol>
    </div>
</template>
