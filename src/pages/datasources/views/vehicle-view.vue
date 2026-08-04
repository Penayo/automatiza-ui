<script setup lang="ts">
/**
 * Bespoke details layout for a "vehicles" datasource — example of `result.viewComponent`
 * (datasources.spec.md §10.4). Rendered by Detail.vue instead of the generic field-driven
 * section grid when a datasource's primary query operation sets `result.viewComponent:
 * "vehicle-view"`.
 *
 * Built against the fields the PostgREST preset maps (`plate` as the label, `make`, `model`,
 * `vin`, `ownerName` — see presets/postgrest.json) plus a handful of commonly-useful extras
 * (`year`, `mileage`, `status`, `fuelLevel`, `imageUrl`) rendered only when present, so this
 * same file works whether or not those extra columns are mapped.
 */
import { computed } from 'vue';
import { Tag } from 'primevue';
import type { BrowsableDatasource, BrowsableOperation } from '@services/DatasourcesService';

const props = defineProps<{
  record: Record<string, any>;
  operation: BrowsableOperation | null;
  datasource: BrowsableDatasource | null;
  datasourceKey: string;
  recordId: string;
}>();

const STATUS_SEVERITY: Record<string, 'success' | 'warn' | 'danger' | 'secondary'> = {
  active: 'success', available: 'success',
  maintenance: 'warn', in_service: 'warn',
  retired: 'danger', sold: 'danger',
};

function has(key: string): boolean {
  const v = props.record?.[key];
  return v !== undefined && v !== null && v !== '';
}

const plate  = computed(() => props.record?._label ?? props.record?.plate ?? props.recordId);
const status = computed<string | undefined>(() => props.record?.status);
const statusSeverity = computed(() => STATUS_SEVERITY[String(status.value ?? '').toLowerCase()] ?? 'secondary');

const subtitle = computed(() =>
  [props.record?.make, props.record?.model, props.record?.year].filter(Boolean).join(' '),
);

const mileageText = computed(() => {
  const n = Number(props.record?.mileage);
  return has('mileage') && !Number.isNaN(n) ? `${n.toLocaleString()} mi` : null;
});

const fuelLevel = computed<number | null>(() => {
  const n = Number(props.record?.fuelLevel);
  return has('fuelLevel') && !Number.isNaN(n) ? n : null;
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header -->
    <div class="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden">
      <div class="flex items-center gap-4 p-4 bg-surface-50 dark:bg-surface-900">
        <div class="flex items-center justify-center w-14 h-14 rounded-lg bg-primary/10 text-primary shrink-0">
          <i class="pi pi-car text-2xl" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h2 class="text-xl font-semibold truncate" style="color: var(--layout-title-color)">{{ plate }}</h2>
            <Tag v-if="status" :value="status" :severity="statusSeverity" />
          </div>
          <p v-if="subtitle" class="text-sm text-surface-500">{{ subtitle }}</p>
        </div>
      </div>

      <img
        v-if="has('imageUrl')" :src="record.imageUrl" :alt="String(plate)"
        class="w-full max-h-64 object-cover"
      />
    </div>

    <!-- Details -->
    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3">
      <div v-if="has('vin')" class="flex flex-col gap-0.5">
        <span class="text-xs text-surface-500">VIN</span>
        <span class="text-sm font-mono">{{ record.vin }}</span>
      </div>
      <div v-if="has('ownerName')" class="flex flex-col gap-0.5">
        <span class="text-xs text-surface-500">Owner</span>
        <span class="text-sm">{{ record.ownerName }}</span>
      </div>
      <div v-if="has('make')" class="flex flex-col gap-0.5">
        <span class="text-xs text-surface-500">Make</span>
        <span class="text-sm">{{ record.make }}</span>
      </div>
      <div v-if="has('model')" class="flex flex-col gap-0.5">
        <span class="text-xs text-surface-500">Model</span>
        <span class="text-sm">{{ record.model }}</span>
      </div>
      <div v-if="has('year')" class="flex flex-col gap-0.5">
        <span class="text-xs text-surface-500">Year</span>
        <span class="text-sm">{{ record.year }}</span>
      </div>
      <div v-if="mileageText" class="flex flex-col gap-0.5">
        <span class="text-xs text-surface-500">Mileage</span>
        <span class="text-sm">{{ mileageText }}</span>
      </div>
    </div>

    <!-- Fuel level -->
    <div v-if="fuelLevel !== null" class="rounded-lg border border-surface-200 dark:border-surface-700 p-4">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-surface-500">Fuel level</span>
        <span class="text-xs text-surface-500">{{ fuelLevel }}%</span>
      </div>
      <div class="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
        <div class="h-full bg-primary" :style="{ width: `${Math.min(100, Math.max(0, fuelLevel ?? 0))}%` }" />
      </div>
    </div>

    <div v-if="!has('vin') && !has('ownerName') && !has('make') && !has('model')" class="text-sm text-surface-400 text-center py-4">
      This vehicle has no additional mapped fields.
    </div>
  </div>
</template>
