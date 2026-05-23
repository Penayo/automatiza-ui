<script setup lang="ts">
import type { AvgCompletionTime } from '@services/DashboardService';

defineProps<{ data: AvgCompletionTime | null }>();

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m ${totalSeconds % 60}s`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h ${totalMinutes % 60}m`;
  const days = Math.floor(totalHours / 24);
  return `${days}d ${totalHours % 24}h`;
}
</script>

<template>
  <div v-if="data && data.totalCompleted > 0" class="grid grid-cols-2 gap-3">
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Avg Time</p>
      <p class="text-2xl font-bold text-emerald-600">{{ formatDuration(data.avgMs) }}</p>
    </div>
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Completed</p>
      <p class="text-2xl font-bold text-blue-600">{{ data.totalCompleted }}</p>
    </div>
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Fastest</p>
      <p class="text-2xl font-bold text-green-500">{{ formatDuration(data.minMs) }}</p>
    </div>
    <div class="bg-gray-50 dark:bg-zinc-700 rounded-xl p-4 text-center">
      <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Slowest</p>
      <p class="text-2xl font-bold text-orange-500">{{ formatDuration(data.maxMs) }}</p>
    </div>
  </div>
  <div v-else class="flex items-center justify-center h-32 text-gray-400 text-sm">
    No completed tasks in selected period
  </div>
</template>
