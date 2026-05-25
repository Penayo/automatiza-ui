<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { DashboardService, type TasksDashboard, type Period } from '@services/DashboardService';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

// ── State ────────────────────────────────────────────────────────────────────

const loading   = ref(true);
const period    = ref<Period>('week');
const stats     = ref<TasksDashboard | null>(null);
const error     = ref(false);

// ── Derived KPIs ─────────────────────────────────────────────────────────────

const activeCount = computed(() => {
    if (!stats.value) return 0;
    const activeStatuses = ['CREATED', 'SCHEDULED', 'WAITING'];
    return stats.value.tasksByStatus
        .filter(s => activeStatuses.includes(s.status))
        .reduce((acc, s) => acc + s.count, 0);
});

const completedCount = computed(() => {
    if (!stats.value) return 0;
    const s = stats.value.tasksByStatus.find(s => s.status === 'COMPLETED');
    return s?.count ?? 0;
});

const failedCount = computed(() => {
    if (!stats.value) return 0;
    const s = stats.value.tasksByStatus.find(s => s.status === 'FAILED');
    return s?.count ?? 0;
});

const overdueCount = computed(() => stats.value?.dateAlerts.overdue ?? 0);
const dueTodayCount = computed(() => {
    if (!stats.value) return 0;
    // "due soon" from the backend is within 7 days; dueSoon - overdue gives us a rough today indicator
    // We use the overdue + dueSoon fields from DateAlerts
    return stats.value.dateAlerts.dueSoon;
});

const avgDuration = computed(() => {
    const ms = stats.value?.avgCompletionTime?.avgMs;
    if (!ms) return '—';
    const d = dayjs.duration(ms);
    if (d.asDays() >= 1) return `${Math.floor(d.asDays())}d ${d.hours()}h`;
    if (d.asHours() >= 1) return `${Math.floor(d.asHours())}h ${d.minutes()}m`;
    return `${d.minutes()}m`;
});

const completedTotal = computed(() => stats.value?.avgCompletionTime?.totalCompleted ?? 0);

// Bar chart: completed over time (last N periods)
const chartBars = computed(() => {
    const rows = stats.value?.completedOverTime ?? [];
    if (!rows.length) return [];
    const max = Math.max(...rows.map(r => r.count), 1);
    return rows.slice(-14).map(r => ({
        label: r.date,
        count: r.count,
        height: Math.max(4, Math.round((r.count / max) * 80)),
    }));
});

// ── Fetch ────────────────────────────────────────────────────────────────────

async function load() {
    loading.value = true;
    error.value   = false;
    try {
        stats.value = await DashboardService.getMyStats(period.value);
    } catch {
        error.value = true;
    } finally {
        loading.value = false;
    }
}

onMounted(load);
</script>

<template>
    <div class="p-4 md:p-6 space-y-6">

        <!-- Header -->
        <div class="flex items-center justify-between flex-wrap gap-3">
            <div>
                <h1 class="text-2xl font-semibold text-(--layout-accent-color)">My Dashboard</h1>
                <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Your personal task overview</p>
            </div>

            <!-- Period selector -->
            <div class="flex gap-1 text-sm">
                <button
                    v-for="p in (['day', 'week', 'month'] as Period[])"
                    :key="p"
                    class="px-3 py-1.5 rounded capitalize transition-colors"
                    :class="period === p
                        ? 'bg-(--layout-accent-color) text-white font-semibold'
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300'"
                    @click="period = p; load()"
                >
                    {{ p === 'day' ? 'Last 30d' : p === 'week' ? 'Last 12w' : 'Last 12m' }}
                </button>
            </div>
        </div>

        <!-- Error state -->
        <div v-if="error" class="flex flex-col items-center justify-center py-12 text-zinc-400">
            <i class="pi pi-exclamation-triangle text-4xl mb-3 text-amber-400" />
            <p>Could not load your stats. Please try again later.</p>
        </div>

        <!-- Loading skeleton -->
        <div v-else-if="loading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div
                v-for="i in 4" :key="i"
                class="rounded-xl p-4 h-24 animate-pulse bg-zinc-100 dark:bg-zinc-800"
            />
        </div>

        <template v-else>
            <!-- ── KPI cards ───────────────────────────────────────────── -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">

                <div class="rounded-xl border p-4 flex flex-col gap-1"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <span class="text-xs text-zinc-500 uppercase tracking-wide">Active tasks</span>
                    <span class="text-3xl font-bold text-(--layout-accent-color)">{{ activeCount }}</span>
                    <span class="text-xs text-zinc-400 mt-auto">assigned + available</span>
                </div>

                <div class="rounded-xl border p-4 flex flex-col gap-1"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <span class="text-xs text-zinc-500 uppercase tracking-wide">Overdue</span>
                    <span class="text-3xl font-bold" :class="overdueCount > 0 ? 'text-red-500' : 'text-zinc-400'">
                        {{ overdueCount }}
                    </span>
                    <span class="text-xs text-zinc-400 mt-auto">past due date</span>
                </div>

                <div class="rounded-xl border p-4 flex flex-col gap-1"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <span class="text-xs text-zinc-500 uppercase tracking-wide">Completed</span>
                    <span class="text-3xl font-bold text-green-500">{{ completedCount }}</span>
                    <span class="text-xs text-zinc-400 mt-auto">in selected period</span>
                </div>

                <div class="rounded-xl border p-4 flex flex-col gap-1"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <span class="text-xs text-zinc-500 uppercase tracking-wide">Avg. completion</span>
                    <span class="text-3xl font-bold text-(--layout-accent-color)">{{ avgDuration }}</span>
                    <span class="text-xs text-zinc-400 mt-auto">over {{ completedTotal }} tasks</span>
                </div>
            </div>

            <!-- ── Secondary alerts ────────────────────────────────────── -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div class="rounded-xl border p-4 flex items-center gap-4"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center"
                        :class="dueTodayCount > 0 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-zinc-100 dark:bg-zinc-800'">
                        <i class="pi pi-calendar text-lg"
                            :class="dueTodayCount > 0 ? 'text-orange-500' : 'text-zinc-400'" />
                    </div>
                    <div>
                        <p class="text-xs text-zinc-500 uppercase tracking-wide">Due within 7 days</p>
                        <p class="text-2xl font-semibold" :class="dueTodayCount > 0 ? 'text-orange-500' : ''">
                            {{ dueTodayCount }}
                        </p>
                    </div>
                </div>

                <div class="rounded-xl border p-4 flex items-center gap-4"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center"
                        :class="failedCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-zinc-100 dark:bg-zinc-800'">
                        <i class="pi pi-times-circle text-lg"
                            :class="failedCount > 0 ? 'text-red-500' : 'text-zinc-400'" />
                    </div>
                    <div>
                        <p class="text-xs text-zinc-500 uppercase tracking-wide">Failed tasks</p>
                        <p class="text-2xl font-semibold" :class="failedCount > 0 ? 'text-red-500' : ''">
                            {{ failedCount }}
                        </p>
                    </div>
                </div>

                <div class="rounded-xl border p-4 flex items-center gap-4"
                    style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                    <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <i class="pi pi-clock text-lg text-blue-500" />
                    </div>
                    <div>
                        <p class="text-xs text-zinc-500 uppercase tracking-wide">Follow-up pending</p>
                        <p class="text-2xl font-semibold text-(--layout-accent-color)">
                            {{ stats?.dateAlerts?.followUpPending ?? 0 }}
                        </p>
                    </div>
                </div>
            </div>

            <!-- ── Completion chart ────────────────────────────────────── -->
            <div class="rounded-xl border p-4"
                style="background: var(--layout-header-bg); border-color: var(--layout-sidebar-border);">
                <h2 class="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-4 uppercase tracking-wide">
                    Tasks completed over time
                </h2>

                <div v-if="!chartBars.length" class="flex flex-col items-center py-8 text-zinc-400 text-sm">
                    <i class="pi pi-chart-bar text-3xl mb-2" />
                    No completed tasks in this period yet.
                </div>

                <div v-else class="flex items-end gap-1 h-24 overflow-x-auto">
                    <div
                        v-for="bar in chartBars"
                        :key="bar.label"
                        class="flex flex-col items-center gap-1 flex-1 min-w-4 group"
                        :title="`${bar.label}: ${bar.count}`"
                    >
                        <span class="text-xs text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-700 rounded px-1 py-0.5 whitespace-nowrap">
                            {{ bar.count }}
                        </span>
                        <div
                            class="w-full rounded-t transition-all"
                            :style="`height: ${bar.height}px`"
                            style="background-color: var(--layout-accent-color); opacity: 0.8;"
                        />
                    </div>
                </div>

                <div class="flex justify-between text-xs text-zinc-400 mt-1" v-if="chartBars.length">
                    <span>{{ chartBars[0]?.label }}</span>
                    <span>{{ chartBars[chartBars.length - 1]?.label }}</span>
                </div>
            </div>

        </template>
    </div>
</template>
