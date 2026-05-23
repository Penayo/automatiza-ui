<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Button, InputText, Select, useToast } from 'primevue';
import Page from '@components/Page.vue';
import { DashboardService, type TasksDashboard, type Period } from '@services/DashboardService';
import TasksByStatusChart from '@pages/admin/dashboard/components/TasksByStatusChart.vue';
import CompletedOverTimeChart from '@pages/admin/dashboard/components/CompletedOverTimeChart.vue';
import AvgCompletionCard from '@pages/admin/dashboard/components/AvgCompletionCard.vue';
import DateAlertsCard from '@pages/admin/dashboard/components/DateAlertsCard.vue';

const toast = useToast();

const period = ref<Period>('week');
const claimedBy = ref('');
const processName = ref<string | null>(null);
const loading = ref(false);
const dashboard = ref<TasksDashboard | null>(null);
const processOptions = ref<{ label: string; value: string | null }[]>([]);

const periodOptions = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

async function fetchProcessNames() {
  try {
    const names = await DashboardService.getProcessNames();
    processOptions.value = [
      { label: 'All Processes', value: null },
      ...names.map((n) => ({ label: n, value: n })),
    ];
  } catch {
    // non-blocking
  }
}

async function fetchData() {
  loading.value = true;
  try {
    dashboard.value = await DashboardService.getTasksDashboard(
      period.value,
      claimedBy.value || undefined,
      processName.value ?? undefined,
    );
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load dashboard', life: 3000 });
  } finally {
    loading.value = false;
  }
}

watch(period, fetchData);
watch(processName, fetchData);
onMounted(() => {
  fetchProcessNames();
  fetchData();
});
</script>

<template>
  <Page title="Analytics Dashboard">
    <template #actions>
      <InputText
        v-model="claimedBy"
        placeholder="Filter by user"
        class="w-36"
        @keydown.enter="fetchData"
      />
      <Select
        v-model="processName"
        :options="processOptions"
        optionLabel="label"
        optionValue="value"
        placeholder="All Processes"
        class="w-48"
      />
      <Select
        v-model="period"
        :options="periodOptions"
        optionLabel="label"
        optionValue="value"
        class="w-36"
      />
      <Button variant="text" rounded icon="pi pi-refresh" :loading="loading" @click="fetchData" />
    </template>

    <div v-if="loading && !dashboard" class="flex justify-center items-center h-64">
      <i class="pi pi-spin pi-spinner text-4xl text-emerald-500"></i>
    </div>

    <div v-else-if="dashboard" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
      <!-- Tasks by Status (donut) -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Tasks by Status
        </h3>
        <TasksByStatusChart :data="dashboard.tasksByStatus" />
      </div>

      <!-- Completed Over Time (bar) — spans 2 columns -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3 lg:col-span-2">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Completed Over Time
        </h3>
        <CompletedOverTimeChart :data="dashboard.completedOverTime" />
      </div>

      <!-- Avg Completion Time -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Completion Time
        </h3>
        <AvgCompletionCard :data="dashboard.avgCompletionTime" />
      </div>

      <!-- Date Alerts — spans 2 columns -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3 lg:col-span-2">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Due Dates &amp; Follow-ups
        </h3>
        <DateAlertsCard :data="dashboard.dateAlerts" />
      </div>
    </div>
  </Page>
</template>
