<script setup lang="ts">
import { ref } from 'vue';
import { Button, DataTable, Column, Tag } from 'primevue';
import type { DataTableSortEvent, DataTablePageEvent } from 'primevue/datatable';
import { $api } from '@services/api';
import type { Datasource, HealthResult } from '@services/DatasourcesService';
import { ROWS_PER_PAGE_OPTIONS } from '@/composables/useTableQuery';

defineProps<{
  items: Datasource[];
  loading: boolean;
  totalRecords: number;
  firstRow: number;
  rowsPerPage: number;
}>();

const emit = defineEmits<{
  (e: 'page', event: DataTablePageEvent): void;
  (e: 'sort', event: DataTableSortEvent): void;
  (e: 'edit', ds: Datasource): void;
  (e: 'delete', ds: Datasource): void;
}>();

// Health is checked on demand — it costs an outbound request, so it is not run
// for every row on every page load.
const health = ref<Record<string, HealthResult | 'loading'>>({});

async function checkHealth(ds: Datasource) {
  health.value = { ...health.value, [ds.key]: 'loading' };
  try {
    health.value = { ...health.value, [ds.key]: await $api.datasources.health(ds.key) };
  } catch {
    health.value = { ...health.value, [ds.key]: { status: 'unhealthy', message: 'Check failed' } };
  }
}

const healthSeverity = (s?: string) =>
  s === 'healthy' ? 'success' : s === 'unhealthy' ? 'danger' : 'secondary';
</script>

<template>
  <DataTable
    :value="items" :loading="loading" dataKey="id" size="small" lazy paginator
    :first="firstRow" :rows="rowsPerPage" :totalRecords="totalRecords"
    :rowsPerPageOptions="ROWS_PER_PAGE_OPTIONS" @page="emit('page', $event)" @sort="emit('sort', $event)"
  >
    <template #empty>
      <div class="text-center py-6 text-surface-400">
        No datasources yet. Declare one to let processes and forms reach an external API.
      </div>
    </template>

    <Column field="key" header="Key" sortable style="width: 14rem">
      <template #body="{ data }">
        <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-1 rounded">{{ data.key }}</code>
      </template>
    </Column>
    <Column field="name" header="Name" sortable />
    <Column field="group" header="Group" sortable style="width: 10rem">
      <template #body="{ data }">
        <Tag v-if="data.group" :value="data.group" severity="secondary" class="text-xs" />
        <span v-else class="text-xs text-surface-400">—</span>
      </template>
    </Column>
    <Column field="baseUrl" header="Base URL">
      <template #body="{ data }">
        <span class="text-xs text-surface-500">{{ data.baseUrl }}</span>
      </template>
    </Column>
    <Column header="Operations" style="width: 8rem">
      <template #body="{ data }">
        <span class="text-xs">{{ data.operations?.length ?? 0 }}</span>
      </template>
    </Column>
    <Column header="Enabled" style="width: 7rem">
      <template #body="{ data }">
        <Tag :value="data.enabled ? 'Enabled' : 'Disabled'"
             :severity="data.enabled ? 'success' : 'secondary'" />
      </template>
    </Column>
    <Column header="Health" style="width: 11rem">
      <template #body="{ data }">
        <div class="flex items-center gap-2">
          <Tag v-if="health[data.key] && health[data.key] !== 'loading'"
               :value="(health[data.key] as HealthResult).status"
               :severity="healthSeverity((health[data.key] as HealthResult).status)"
               v-tooltip.top="(health[data.key] as HealthResult).message" />
          <Button icon="pi pi-heart" size="small" text rounded
                  :loading="health[data.key] === 'loading'"
                  v-tooltip.top="'Run health check'" @click="checkHealth(data)" />
        </div>
      </template>
    </Column>
    <Column style="width: 7rem">
      <template #body="{ data }">
        <div class="flex gap-1 justify-end">
          <Button icon="pi pi-pencil" size="small" text rounded @click="emit('edit', data)" />
          <Button icon="pi pi-trash" size="small" text rounded severity="danger" @click="emit('delete', data)" />
        </div>
      </template>
    </Column>
  </DataTable>
</template>
