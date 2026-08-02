<script setup lang="ts">
/**
 * Standalone datasource record details — docs/specs/datasources.spec.md §10.4.
 *
 * Shows every mapped field of one record. Reached from the browse grid's details
 * icon (which hands the row over via the record cache) or by deep-link/refresh
 * (which re-fetches via the datasource's `single` operation when one exists).
 * Routes: /admin/data/:datasourceKey/:id and /data/:datasourceKey/:id.
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from 'primevue';
import {
  DatasourcesService,
  type BrowsableDatasource,
  type BrowsableOperation,
} from '@services/DatasourcesService';
import { recallRecord } from './record-cache';

const route  = useRoute();
const router = useRouter();
const api    = new DatasourcesService();

const datasourceKey = computed(() => route.params.datasourceKey as string);
const recordId      = computed(() => route.params.id as string);
const listPath      = computed(() => `/${route.path.split('/').slice(1, -1).join('/')}`); // drop the :id segment

const datasource = ref<BrowsableDatasource | null>(null);
const operation  = ref<BrowsableOperation | null>(null);
const record     = ref<Record<string, any> | null>(null);
const loading    = ref(false);
const error      = ref<string | null>(null);
const notFound   = ref(false);

function formatValue(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function load() {
  loading.value = true;
  error.value = null;
  notFound.value = false;
  try {
    const all = await api.browsable();
    const ds  = all.find(d => d.key === datasourceKey.value) ?? null;
    if (!ds || !ds.operations.length) { notFound.value = true; return; }
    datasource.value = ds;
    operation.value  = ds.operations.find(o => o.key === 'browse') ?? ds.operations[0];

    // 1. Handed over from the list (has every field already).
    const cached = recallRecord(ds.key, recordId.value);
    if (cached) { record.value = cached; return; }

    // 2. Deep-link / refresh — re-fetch by key via the declared single op, if any.
    if (ds.detailOperation) {
      const res = await api.execute(ds.key, ds.detailOperation, { key: recordId.value });
      record.value = res.record ?? null;
      if (!record.value) notFound.value = true;
    } else {
      // No by-key operation declared — the record can only be reached from the list.
      error.value = 'Open this record from the list — this datasource has no by-key details operation.';
    }
  } catch (err: any) {
    error.value = err?.response?.data?.message ?? err?.message ?? 'This record is currently unavailable.';
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push(listPath.value);
}

onMounted(load);
</script>

<template>
  <div class="p-4 flex flex-col gap-4 max-w-3xl">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <Button icon="pi pi-arrow-left" text rounded size="small" v-tooltip.right="'Back to list'" @click="goBack" />
      <i class="pi pi-database text-lg text-primary" />
      <div class="min-w-0">
        <h1 class="text-lg font-semibold truncate" style="color: var(--layout-title-color)">
          {{ record?._label ?? recordId }}
        </h1>
        <p class="text-xs text-surface-500 truncate">{{ datasource?.name ?? datasourceKey }}</p>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-surface-400 text-sm">
      <i class="pi pi-spin pi-spinner text-xl" />
    </div>

    <div v-else-if="notFound" class="flex flex-col items-center gap-2 py-16 text-surface-400">
      <i class="pi pi-exclamation-triangle text-2xl" />
      <span class="text-sm">Record not found.</span>
      <Button label="Back to list" icon="pi pi-arrow-left" severity="secondary" size="small" @click="goBack" />
    </div>

    <div
      v-else-if="error"
      class="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm"
    >
      <i class="pi pi-exclamation-triangle shrink-0" />
      <span>{{ error }}</span>
      <Button label="Back" size="small" text class="ml-auto" @click="goBack" />
    </div>

    <!-- All fields -->
    <div v-else-if="record" class="rounded-lg border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800">
      <div
        v-for="f in (operation?.fields ?? [])"
        :key="f.name"
        class="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 px-4 py-2.5"
      >
        <span class="text-xs text-surface-500 sm:w-48 shrink-0">{{ f.label }}</span>
        <span class="text-sm wrap-break-word">{{ formatValue(record[f.name]) }}</span>
      </div>
    </div>
  </div>
</template>
