<script setup lang="ts">
/**
 * STARTER custom task view — "look up a vehicle + its service history".
 *
 * A worked template for the personalized case: enter a value (VIN / plate),
 * fetch the vehicle from one datasource and its past services from another, and
 * write both back into the process as variables on submit.
 *
 * Wire-up:
 *   1. This file is registered as `custom:vehicle-history` in task-views/index.ts.
 *   2. In the BPMN modeler, set the user task's form key to: custom:vehicle-history
 *   3. Adapt the CONFIG block below to your real datasource keys / operations / fields.
 *
 * Data comes from the datasource read proxy ($api.datasources.execute), which
 * resolves credentials and SSRF-guards server-side — see docs/specs/datasources.spec.md.
 * Reads only (writes 405). Note: on a PUBLIC share-link form there is no JWT, so the
 * proxy is unreachable there — this view is for authenticated user tasks.
 */
import { ref, computed, onMounted } from 'vue';
import { Button, InputText, DataTable, Column, Message } from 'primevue';
import { $api } from '@services/api';

// ── CONFIG — change to match your datasource declarations ───────────────────────
const VEHICLE = {
  datasource:   'vehicles',   // datasource key
  operation:    'search',     // a `query` operation
  searchFilter: 'search',     // the declared filter key the lookup value binds to
};
const HISTORY = {
  datasource:      'serviceOrders', // datasource key (create one if you don't have it)
  operation:       'search',
  // Which field of the found vehicle identifies its history, and the filter key it feeds.
  // `_label` is the mapped labelField (e.g. plate); `_key` is the keyField; or a fields[].name.
  vehicleKeyField: '_label',
  filterKey:       'plate',
  sort:            { field: 'created_at', dir: 'desc' as const },
};
// Process variable to seed the lookup from (e.g. a VIN captured on a previous step).
const SEED_VARIABLE = 'vin';
// ────────────────────────────────────────────────────────────────────────────────

const props = defineProps<{
  task: any;
  variables: Record<string, any>;
  readOnly?: boolean;
}>();

const query    = ref(String(props.variables?.[SEED_VARIABLE] ?? ''));
const vehicle  = ref<Record<string, any> | null>(null);
const history  = ref<Record<string, any>[]>([]);
const loading  = ref(false);
const error    = ref<string | null>(null);
const searched = ref(false);

// Mapped rows/records expose their fields as `fieldName` keys plus internal `_key`/`_label`.
const vehicleFields = computed(() =>
  vehicle.value ? Object.entries(vehicle.value).filter(([k]) => !k.startsWith('_')) : [],
);
const historyColumns = computed(() =>
  history.value[0] ? Object.keys(history.value[0]).filter(k => !k.startsWith('_')) : [],
);

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function lookup() {
  const value = query.value.trim();
  if (!value) return;

  loading.value = true;
  error.value = null;
  vehicle.value = null;
  history.value = [];

  try {
    // 1. Find the vehicle.
    const res = await $api.datasources.execute(VEHICLE.datasource, VEHICLE.operation, {
      filters: { [VEHICLE.searchFilter]: value },
      limit: 1,
    });
    vehicle.value = res.items?.[0] ?? res.record ?? null;
    searched.value = true;

    // 2. Its service history, keyed off a field of the found vehicle.
    if (vehicle.value) {
      const key = vehicle.value[HISTORY.vehicleKeyField];
      if (key !== undefined && key !== null && key !== '') {
        const h = await $api.datasources.execute(HISTORY.datasource, HISTORY.operation, {
          filters: { [HISTORY.filterKey]: key },
          sort: HISTORY.sort,
          limit: 100,
        });
        history.value = h.items ?? [];
      }
    }
  } catch (e: any) {
    // The proxy surfaces the real remote reason (e.g. "HTTP 401: permission denied").
    error.value = e?.response?.data?.message ?? e?.message ?? 'Lookup failed.';
  } finally {
    loading.value = false;
  }
}

// Called by the task form's Save/Submit — persist what we found into process variables.
defineExpose({
  getVariables: () => ({
    ...props.variables,
    [SEED_VARIABLE]: query.value,
    vehicle:         vehicle.value,
    serviceHistory:  history.value,
  }),
});

onMounted(() => { if (query.value) lookup(); });
</script>

<template>
  <div class="flex flex-col gap-4 p-4">
    <h3 class="text-base font-semibold text-surface-800 dark:text-surface-100">
      {{ task?.name ?? 'Vehicle lookup' }}
    </h3>

    <!-- Lookup -->
    <div class="flex items-end gap-2">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-surface-500">VIN / plate</label>
        <InputText
          v-model="query"
          :disabled="readOnly"
          placeholder="Enter VIN or plate"
          class="w-64"
          @keyup.enter="lookup"
        />
      </div>
      <Button
        label="Look up"
        icon="pi pi-search"
        :loading="loading"
        :disabled="readOnly || !query.trim()"
        @click="lookup"
      />
    </div>

    <Message v-if="error" severity="warn" size="small" :closable="false">{{ error }}</Message>

    <div v-if="searched && !vehicle && !loading && !error" class="text-sm text-surface-400 py-4">
      No vehicle found for "{{ query }}".
    </div>

    <!-- Vehicle -->
    <div
      v-if="vehicle"
      class="rounded-lg border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800"
    >
      <div class="px-4 py-2 font-medium text-surface-800 dark:text-surface-100">
        {{ vehicle._label ?? 'Vehicle' }}
      </div>
      <div
        v-for="[name, val] in vehicleFields"
        :key="name"
        class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-4 py-2"
      >
        <span class="text-xs text-surface-500 sm:w-40 shrink-0">{{ name }}</span>
        <span class="text-sm wrap-break-word">{{ formatValue(val) }}</span>
      </div>
    </div>

    <!-- Service history -->
    <div v-if="vehicle" class="flex flex-col gap-2">
      <h4 class="text-sm font-semibold text-surface-700 dark:text-surface-200">
        Service history
        <span class="text-xs font-normal text-surface-400">({{ history.length }})</span>
      </h4>
      <DataTable
        v-if="history.length"
        :value="history"
        size="small"
        scrollable
        scroll-height="320px"
        class="text-sm"
      >
        <Column v-for="col in historyColumns" :key="col" :field="col" :header="col" />
      </DataTable>
      <p v-else class="text-sm text-surface-400">No past services on record.</p>
    </div>
  </div>
</template>
