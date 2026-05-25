<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button, Select } from 'primevue';
import { DashboardService, type ProcessAnalytics, type Period } from '@services/DashboardService';

const props = defineProps<{
    /** The process definition UUID — passed to the analytics endpoint */
    processDefinitionId: string;
}>();

const analytics = ref<ProcessAnalytics | null>(null);
const loading   = ref(false);
const period    = ref<Period>('week');

const periodOptions: { label: string; value: Period }[] = [
    { label: 'Today', value: 'day'   },
    { label: 'Week',  value: 'week'  },
    { label: 'Month', value: 'month' },
];

// ── Data ──────────────────────────────────────────────────────────────────────

async function fetch() {
    loading.value = true;
    try {
        analytics.value = await DashboardService.getProcessAnalytics(props.processDefinitionId, period.value);
    } catch {
        analytics.value = null;
    } finally {
        loading.value = false;
    }
}

const avgFormatted = computed(() => {
    const ms = analytics.value?.avgCompletionMs;
    if (!ms) return '—';
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
});

const maxCount = computed(() =>
    Math.max(1, ...(analytics.value?.completedOverTime?.map(p => p.count) ?? [0]))
);

onMounted(fetch);
</script>

<template>
    <div class="px-6 py-6">

        <!-- Period selector -->
        <div class="flex items-center gap-3 mb-6">
            <Select
                v-model="period"
                :options="periodOptions"
                optionLabel="label"
                optionValue="value"
                class="w-32"
                @change="fetch"
            />
            <Button icon="pi pi-refresh" severity="secondary" :loading="loading" @click="fetch" />
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
        </div>

        <!-- Empty -->
        <div v-else-if="!analytics" class="flex flex-col items-center justify-center py-20 text-surface-400 gap-3">
            <i class="pi pi-chart-bar text-4xl" />
            <p class="text-sm">No analytics data available for this process.</p>
        </div>

        <!-- Content -->
        <div v-else class="space-y-6">

            <!-- KPI cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Total Instances</p>
                    <p class="text-3xl font-bold text-surface-900 dark:text-surface-50">{{ analytics.totalInstances }}</p>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Running</p>
                    <p class="text-3xl font-bold text-blue-500">{{ analytics.runningInstances }}</p>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Completed</p>
                    <p class="text-3xl font-bold text-green-500">{{ analytics.completedInstances }}</p>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Failed</p>
                    <p class="text-3xl font-bold text-red-500">{{ analytics.failedInstances }}</p>
                </div>
            </div>

            <!-- Avg completion time -->
            <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5 inline-flex items-center gap-4">
                <i class="pi pi-clock text-surface-400 text-xl" />
                <div>
                    <p class="text-xs text-surface-400">Avg. Completion Time</p>
                    <p class="text-2xl font-bold text-surface-900 dark:text-surface-50">{{ avgFormatted }}</p>
                </div>
            </div>

            <!-- Completions over time -->
            <div v-if="analytics.completedOverTime?.length" class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                <p class="text-xs text-surface-400 uppercase tracking-wide mb-4">Completions Over Time</p>
                <div class="flex items-end gap-1.5 h-28">
                    <div
                        v-for="pt in analytics.completedOverTime"
                        :key="pt.date"
                        class="flex flex-col items-center gap-1 flex-1"
                    >
                        <span class="text-[10px] text-surface-400">{{ pt.count }}</span>
                        <div
                            class="w-full rounded-t bg-surface-300 dark:bg-surface-600 transition-colors"
                            style="cursor: default"
                            :style="{ height: Math.max(4, (pt.count / maxCount) * 80) + 'px', background: 'var(--layout-accent-color)', opacity: '0.7' }"
                            @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.opacity = '1'"
                            @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.opacity = '0.7'"
                        />
                        <span class="text-[9px] text-surface-400 rotate-45 origin-left whitespace-nowrap overflow-hidden max-w-6">
                            {{ pt.date.slice(5) }}
                        </span>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>
