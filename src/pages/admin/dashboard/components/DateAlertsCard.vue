<script setup lang="ts">
import type { DateAlerts } from '@services/DashboardService';

defineProps<{ data: DateAlerts | null }>();
</script>

<template>
  <div v-if="data" class="grid grid-cols-2 gap-3">
    <!-- Overdue -->
    <div
      class="rounded-xl p-4 flex items-center gap-3"
      :class="data.overdue > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-gray-50 dark:bg-zinc-700'"
    >
      <i
        class="pi pi-exclamation-triangle text-xl"
        :class="data.overdue > 0 ? 'text-red-500' : 'text-gray-400'"
      ></i>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overdue</p>
        <p
          class="text-2xl font-bold"
          :class="data.overdue > 0 ? 'text-red-600' : 'text-gray-400'"
        >{{ data.overdue }}</p>
      </div>
    </div>

    <!-- Due in 7 days -->
    <div
      class="rounded-xl p-4 flex items-center gap-3"
      :class="data.dueSoon > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-gray-50 dark:bg-zinc-700'"
    >
      <i
        class="pi pi-clock text-xl"
        :class="data.dueSoon > 0 ? 'text-amber-500' : 'text-gray-400'"
      ></i>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Due in 7 days</p>
        <p
          class="text-2xl font-bold"
          :class="data.dueSoon > 0 ? 'text-amber-600' : 'text-gray-400'"
        >{{ data.dueSoon }}</p>
      </div>
    </div>

    <!-- Follow-up pending -->
    <div
      class="rounded-xl p-4 flex items-center gap-3"
      :class="data.followUpPending > 0 ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-gray-50 dark:bg-zinc-700'"
    >
      <i
        class="pi pi-bell text-xl"
        :class="data.followUpPending > 0 ? 'text-orange-500' : 'text-gray-400'"
      ></i>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Follow-up past</p>
        <p
          class="text-2xl font-bold"
          :class="data.followUpPending > 0 ? 'text-orange-600' : 'text-gray-400'"
        >{{ data.followUpPending }}</p>
      </div>
    </div>

    <!-- Follow-up upcoming -->
    <div
      class="rounded-xl p-4 flex items-center gap-3"
      :class="data.followUpSoon > 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-gray-50 dark:bg-zinc-700'"
    >
      <i
        class="pi pi-calendar text-xl"
        :class="data.followUpSoon > 0 ? 'text-blue-500' : 'text-gray-400'"
      ></i>
      <div>
        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Follow-up in 7d</p>
        <p
          class="text-2xl font-bold"
          :class="data.followUpSoon > 0 ? 'text-blue-600' : 'text-gray-400'"
        >{{ data.followUpSoon }}</p>
      </div>
    </div>
  </div>

  <div v-else class="flex items-center justify-center h-32 text-gray-400 text-sm">
    No data available
  </div>
</template>
