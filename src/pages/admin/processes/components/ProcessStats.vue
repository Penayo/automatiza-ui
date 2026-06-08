<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Button, Select } from 'primevue';
import { DashboardService, type ProcessAnalytics, type Period } from '@services/DashboardService';

const props = defineProps<{ processDefinitionId: string }>();

const analytics = ref<ProcessAnalytics | null>(null);
const loading   = ref(false);
const period    = ref<Period>('week');

const periodOptions: { label: string; value: Period }[] = [
    { label: 'Today', value: 'day'   },
    { label: 'Week',  value: 'week'  },
    { label: 'Month', value: 'month' },
];

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

// ── Derived ───────────────────────────────────────────────────────────────────

const summary = computed(() => analytics.value?.completionRate?.[0] ?? null);
const failure = computed(() => analytics.value?.failureRateByDefinition?.[0] ?? null);
const avg     = computed(() => analytics.value?.avgProcessDuration ?? null);

function fmtMs(ms: number): string {
    if (!ms) return '—';
    if (ms < 1000)           return `${ms}ms`;
    if (ms < 60_000)         return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3_600_000)      return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
}

const maxOverTime = computed(() =>
    Math.max(1, ...(analytics.value?.instancesOverTime?.map(p => p.count) ?? [0]))
);

const maxBottleneck = computed(() =>
    Math.max(1, ...(analytics.value?.bottleneckAnalysis?.map(b => b.avgMs) ?? [0]))
);

onMounted(fetch);
</script>

<template>
    <div class="px-6 py-6 space-y-6">

        <!-- Toolbar -->
        <div class="flex items-center gap-3">
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

        <!-- Loading -->
        <div v-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-surface-100 dark:bg-surface-800 animate-pulse" />
        </div>

        <!-- Empty -->
        <div v-else-if="!analytics" class="flex flex-col items-center justify-center py-20 text-surface-400 gap-3">
            <i class="pi pi-chart-bar text-4xl" />
            <p class="text-sm">No analytics data available for this process.</p>
        </div>

        <template v-else>

            <!-- ── KPI cards ──────────────────────────────────────────────── -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Total Instances</p>
                    <p class="text-3xl font-bold" style="color:var(--layout-title-color)">{{ summary?.total ?? '—' }}</p>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Completed</p>
                    <p class="text-3xl font-bold text-green-500">{{ summary?.completed ?? '—' }}</p>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Failed</p>
                    <p class="text-3xl font-bold text-red-500">{{ summary?.failed ?? '—' }}</p>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                    <p class="text-xs text-surface-400 uppercase tracking-wide mb-1">Active</p>
                    <p class="text-3xl font-bold text-blue-500">{{ analytics.activeInstances?.length ?? '—' }}</p>
                </div>
            </div>

            <!-- ── Rate + Duration row ────────────────────────────────────── -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5 flex items-center gap-4">
                    <i class="pi pi-check-circle text-green-500 text-2xl" />
                    <div>
                        <p class="text-xs text-surface-400">Completion Rate</p>
                        <p class="text-2xl font-bold" style="color:var(--layout-title-color)">{{ summary?.completionRate ?? '—' }}%</p>
                    </div>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5 flex items-center gap-4">
                    <i class="pi pi-times-circle text-red-500 text-2xl" />
                    <div>
                        <p class="text-xs text-surface-400">Failure Rate</p>
                        <p class="text-2xl font-bold" style="color:var(--layout-title-color)">{{ failure?.failureRate ?? '—' }}%</p>
                    </div>
                </div>
                <div class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5 flex items-center gap-4">
                    <i class="pi pi-clock text-surface-400 text-2xl" />
                    <div>
                        <p class="text-xs text-surface-400">Avg Duration</p>
                        <p class="text-2xl font-bold" style="color:var(--layout-title-color)">{{ avg ? fmtMs(avg.avgMs) : '—' }}</p>
                        <p v-if="avg" class="text-[11px] text-surface-400 mt-0.5">
                            min {{ fmtMs(avg.minMs) }} · max {{ fmtMs(avg.maxMs) }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- ── Instances over time bar chart ──────────────────────────── -->
            <div v-if="analytics.instancesOverTime?.length" class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                <p class="text-xs text-surface-400 uppercase tracking-wide mb-4">Instances Over Time</p>
                <div class="flex items-end gap-1.5 h-28">
                    <div
                        v-for="pt in analytics.instancesOverTime"
                        :key="pt.date"
                        class="flex flex-col items-center gap-1 flex-1 min-w-0"
                    >
                        <span class="text-[10px] text-surface-400">{{ pt.count }}</span>
                        <div
                            class="w-full rounded-t transition-opacity"
                            style="cursor:default;opacity:0.7;"
                            :style="{ height: Math.max(4, (pt.count / maxOverTime) * 80) + 'px', background: 'var(--layout-accent-color)' }"
                            @mouseenter="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.opacity = '1'"
                            @mouseleave="(e: MouseEvent) => (e.currentTarget as HTMLElement).style.opacity = '0.7'"
                        />
                        <span class="text-[9px] text-surface-400 truncate w-full text-center">{{ pt.date.slice(5) }}</span>
                    </div>
                </div>
            </div>

            <!-- ── Bottleneck analysis ────────────────────────────────────── -->
            <div v-if="analytics.bottleneckAnalysis?.length" class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                <p class="text-xs text-surface-400 uppercase tracking-wide mb-4">Bottleneck Analysis</p>
                <div class="space-y-3">
                    <div
                        v-for="b in analytics.bottleneckAnalysis"
                        :key="b.taskDefinitionId"
                        class="flex items-center gap-3"
                    >
                        <div class="w-36 shrink-0 min-w-0">
                            <p class="text-sm font-medium truncate" style="color:var(--layout-title-color)">{{ b.taskName }}</p>
                            <p class="text-[10px] text-surface-400 font-mono truncate">{{ b.taskDefinitionId }}</p>
                        </div>
                        <div class="flex-1 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                            <div
                                class="h-full rounded-full bg-orange-400"
                                :style="{ width: Math.max(2, (b.avgMs / maxBottleneck) * 100) + '%' }"
                            />
                        </div>
                        <span class="text-sm font-mono text-surface-500 w-20 text-right shrink-0">{{ fmtMs(b.avgMs) }}</span>
                        <span class="text-xs text-surface-400 w-14 text-right shrink-0">{{ b.count }}×</span>
                    </div>
                </div>
            </div>

            <!-- ── Instance flow heatmap ──────────────────────────────────── -->
            <div v-if="analytics.instanceFlowHeatmap?.length" class="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 p-5">
                <p class="text-xs text-surface-400 uppercase tracking-wide mb-4">Instance Flow</p>
                <div class="flex flex-wrap gap-2">
                    <div
                        v-for="(h, i) in analytics.instanceFlowHeatmap"
                        :key="i"
                        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                        :style="{ background: `rgba(99,102,241,${Math.max(0.1, h.count / Math.max(...analytics.instanceFlowHeatmap.map(x => x.count)))})`, color: 'white' }"
                    >
                        <span>{{ h.taskName }}</span>
                        <span class="font-bold">{{ h.count }}</span>
                    </div>
                </div>
            </div>

        </template>
    </div>
</template>
