<script setup lang="ts">
import type { ProcessDuration } from '../../../services/ProcessDashboardService';

defineProps<{ data: ProcessDuration | null }>();

function fmt(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
</script>

<template>
  <div v-if="data && data.totalCompleted > 0" class="grid grid-cols-2 gap-3">
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Avg Duration</p>
      <p class="text-2xl font-bold text-indigo-600">{{ fmt(data.avgMs) }}</p>
    </div>
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Completed</p>
      <p class="text-2xl font-bold text-blue-600">{{ data.totalCompleted }}</p>
    </div>
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fastest</p>
      <p class="text-2xl font-bold text-green-500">{{ fmt(data.minMs) }}</p>
    </div>
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Slowest</p>
      <p class="text-2xl font-bold text-orange-500">{{ fmt(data.maxMs) }}</p>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-32 text-gray-400 text-sm">
    No completed instances in selected period
  </div>
</template>
