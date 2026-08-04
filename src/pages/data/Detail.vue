<script setup lang="ts">
/**
 * Standalone datasource record details — docs/specs/datasources.spec.md §10.4.
 *
 * Shows every mapped field of one record. Reached from the browse grid's details
 * icon (which hands the row over via the record cache) or by deep-link/refresh
 * (which re-fetches via the datasource's `single` operation when one exists).
 * Routes: /admin/data/:datasourceKey/:id and /data/:datasourceKey/:id.
 */
import { ref, shallowRef, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, Message } from 'primevue';
import {
  DatasourcesService,
  type BrowsableDatasource,
  type BrowsableOperation,
  type BrowsableField,
} from '@services/DatasourcesService';
import { recallRecord } from './record-cache';
import FieldValue from '@components/data/FieldValue.vue';

// §10.4 — an operation may declare `result.viewComponent`, a bare name resolved here to a
// hand-authored layout instead of the generic section grid below. Fixed folder, so the name
// is never used to build an arbitrary path.
const customViewModules = import.meta.glob('/src/pages/datasources/views/*.vue');

// Literal class names, not built from a template string — Tailwind's build-time
// scanner needs the full utility name present verbatim in the source to emit it.
const COLSPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: '', 2: 'sm:col-span-2', 3: 'sm:col-span-2 xl:col-span-3',
};

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

const customView        = shallowRef<any>(null);
const customViewMissing = ref(false);

function resolveCustomView() {
  customView.value = null;
  customViewMissing.value = false;
  const name = operation.value?.viewComponent;
  if (!name) return;
  const loader = customViewModules[`/src/pages/datasources/views/${name}.vue`];
  if (!loader) { customViewMissing.value = true; return; }
  customView.value = defineAsyncComponent(loader as () => Promise<any>);
}

/**
 * Groups the operation's fields by `view.section` — ungrouped fields (no
 * `section`, or blank) form an unnamed group first, then each named section in
 * the order it first appears among the fields. Within a group, fields with an
 * explicit `view.order` sort by it; unordered fields keep their declaration
 * position (docs/specs/datasources.spec.md §6, §10.4).
 */
const sections = computed(() => {
  const fields = operation.value?.fields ?? [];
  const ungrouped: { f: BrowsableField; i: number }[] = [];
  const named = new Map<string, { f: BrowsableField; i: number }[]>();
  fields.forEach((f, i) => {
    const name = f.view?.section?.trim();
    if (!name) { ungrouped.push({ f, i }); return; }
    if (!named.has(name)) named.set(name, []);
    named.get(name)!.push({ f, i });
  });
  const byOrder = (a: { f: BrowsableField; i: number }, b: { f: BrowsableField; i: number }) =>
    (a.f.view?.order ?? a.i) - (b.f.view?.order ?? b.i);

  const groups: { name: string | null; fields: BrowsableField[] }[] = [];
  if (ungrouped.length) groups.push({ name: null, fields: ungrouped.sort(byOrder).map(x => x.f) });
  for (const [name, entries] of named) groups.push({ name, fields: entries.sort(byOrder).map(x => x.f) });
  return groups;
});

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
    resolveCustomView();

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
  <div class="p-4 flex flex-col gap-4 w-full">
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

    <template v-else-if="record">
      <Message v-if="customViewMissing" severity="warn" size="small" :closable="false" class="mb-2">
        Custom view component "{{ operation?.viewComponent }}" was not found — showing the default layout.
      </Message>

      <!-- Custom view component (§10.4) -->
      <component
        v-if="customView"
        :is="customView"
        :record="record"
        :operation="operation"
        :datasource="datasource"
        :datasource-key="datasourceKey"
        :record-id="recordId"
      />

      <!-- All fields, grouped by section -->
      <div v-else class="flex flex-col gap-4">
      <div
        v-for="(section, i) in sections"
        :key="section.name ?? `_ungrouped_${i}`"
        class="rounded-lg border border-surface-200 dark:border-surface-700 overflow-hidden"
      >
        <div
          v-if="section.name"
          class="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-surface-500 bg-surface-50 dark:bg-surface-900 border-b border-surface-200 dark:border-surface-700"
        >
          {{ section.name }}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 divide-y sm:divide-y-0 divide-surface-100 dark:divide-surface-800 p-4">
          <div
            v-for="f in section.fields"
            :key="f.name"
            class="flex flex-col gap-0.5 py-2 sm:py-1.5"
            :class="f.view?.colSpan ? COLSPAN_CLASS[f.view.colSpan] : ''"
          >
            <span class="text-xs text-surface-500">{{ f.label }}</span>
            <FieldValue :value="record[f.name]" :display="f.view?.display" :record="record" />
          </div>
        </div>
      </div>
    </div>
    </template>
  </div>
</template>
