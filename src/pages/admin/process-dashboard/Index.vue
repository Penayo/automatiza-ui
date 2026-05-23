<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { Button, Select, useToast } from 'primevue';
import Page from '@components/Page.vue';
import {
  ProcessDashboardService,
  type ProcessAnalytics,
  type Period,
  type ProcessDefinitionOption,
} from '@services/ProcessDashboardService';
import InstancesOverTimeChart from '@pages/admin/process-dashboard/components/InstancesOverTimeChart.vue';
import CompletionRateChart from '@pages/admin/process-dashboard/components/CompletionRateChart.vue';
import ProcessDurationCard from '@pages/admin/process-dashboard/components/ProcessDurationCard.vue';
import BottleneckChart from '@pages/admin/process-dashboard/components/BottleneckChart.vue';
import ActiveInstancesChart from '@pages/admin/process-dashboard/components/ActiveInstancesChart.vue';
import FailureRateChart from '@pages/admin/process-dashboard/components/FailureRateChart.vue';
import InstanceFlowHeatmap from '@pages/admin/process-dashboard/components/InstanceFlowHeatmap.vue';

const toast = useToast();

const period = ref<Period>('week');
const selectedProcess = ref<ProcessDefinitionOption | null>(null);
const loading = ref(false);
const analytics = ref<ProcessAnalytics | null>(null);
const processOptions = ref<ProcessDefinitionOption[]>([]);

const periodOptions = [
  { label: 'Daily', value: 'day' },
  { label: 'Weekly', value: 'week' },
  { label: 'Monthly', value: 'month' },
];

async function fetchProcessDefinitions() {
  try {
    processOptions.value = await ProcessDashboardService.getProcessDefinitions();
  } catch {
    // non-blocking
  }
}

async function fetchData() {
  loading.value = true;
  try {
    analytics.value = await ProcessDashboardService.getProcessAnalytics(
      period.value,
      selectedProcess.value?.id,
    );
  } catch {
    toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load process analytics', life: 3000 });
  } finally {
    loading.value = false;
  }
}

watch(period, fetchData);
watch(selectedProcess, fetchData);
onMounted(() => {
  fetchProcessDefinitions();
  fetchData();
});
</script>

<template>
  <Page title="Process Analytics">
    <template #actions>
      <Select
        v-model="selectedProcess"
        :options="processOptions"
        optionLabel="name"
        placeholder="All Processes"
        showClear
        class="w-52"
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

    <div v-if="loading && !analytics" class="flex justify-center items-center h-64">
      <i class="pi pi-spin pi-spinner text-4xl text-indigo-500"></i>
    </div>

    <div v-else-if="analytics" class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">

      <!-- Row 1: Avg Duration (1) + Instances Over Time (2) -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Avg Process Duration
        </h3>
        <ProcessDurationCard :data="analytics.avgProcessDuration" />
      </div>

      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3 lg:col-span-2">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Instances Started Over Time
        </h3>
        <InstancesOverTimeChart :data="analytics.instancesOverTime" />
      </div>

      <!-- Row 2: Active Instances (1) + Completion Rate (2) -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Active Instances
        </h3>
        <ActiveInstancesChart :data="analytics.activeInstances" />
      </div>

      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3 lg:col-span-2">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Completion Rate by Process
        </h3>
        <CompletionRateChart :data="analytics.completionRate" />
      </div>

      <!-- Row 3: Failure Rate (1) + Bottleneck Analysis (2) -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Failure Rate by Process
        </h3>
        <FailureRateChart :data="analytics.failureRateByDefinition" />
      </div>

      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3 lg:col-span-2">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Bottleneck Analysis — Top 10 Slowest Tasks
        </h3>
        <BottleneckChart :data="analytics.bottleneckAnalysis" />
      </div>

      <!-- Row 4: Heatmap full width -->
      <div class="bg-white dark:bg-zinc-800 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-700 p-5 flex flex-col gap-3 lg:col-span-3">
        <h3 class="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          Instance Flow Heatmap — Task Frequency per Process
        </h3>
        <InstanceFlowHeatmap :data="analytics.instanceFlowHeatmap" />
      </div>

    </div>
  </Page>
</template>
