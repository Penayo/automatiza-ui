<script setup lang="ts">
/**
 * Generic datasource browse page — docs/specs/datasources.spec.md §10.4.
 *
 * A read-only index over a datasource's `query` operation: columns from the
 * declared result.fields, the declared filters + search box, and server-side
 * paging + sort via the read proxy (§10.1). Reachable at /admin/data/:key and
 * /data/:key (same component, both layouts). Never a write path.
 */
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { DataTable, Column, InputText, Select, Button } from 'primevue';
import {
  DatasourcesService,
  type BrowsableDatasource,
  type BrowsableOperation,
  type FieldDisplay,
} from '@services/DatasourcesService';
import { rememberRecord } from './record-cache';
import { AuthService } from '@services/AuthService';
import FieldValue from '@components/data/FieldValue.vue';

const route  = useRoute();
const router = useRouter();
const api    = new DatasourcesService();

const isAdmin = computed(() => {
  const roles = new AuthService().getAccessInfo()?.user?.roles ?? [];
  return roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
});

const datasourceKey = computed(() => route.params.datasourceKey as string);

const datasource = ref<BrowsableDatasource | null>(null);
const operation  = ref<BrowsableOperation | null>(null);

const rows          = ref<Record<string, any>[]>([]);
const totalRecords  = ref(0);
const totalKnown    = ref(false);
const loading       = ref(false);
const loadError     = ref<string | null>(null);
const notFound      = ref(false);

const rowsPerPage = ref(20);
const page        = ref(1);            // 1-based
const sortField   = ref<string | null>(null);
const sortOrder   = ref<0 | 1 | -1>(0); // PrimeVue: 1 asc, -1 desc

// Filter values keyed by declared filter key (`search` reserved).
const filterValues = ref<Record<string, any>>({});

// Out-of-order guard — a slow response must never overwrite a newer one.
let reqSeq = 0;

// ── Columns (index shows index.visible fields; details shows all) ───────────────
interface Col {
  field: string; header: string; sortable: boolean;
  width?: string; align?: 'left' | 'center' | 'right'; frozen?: boolean; display?: FieldDisplay;
}

// Literal class names, not built from a template string — Tailwind's build-time
// scanner needs the full utility name present verbatim in the source to emit it.
const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left', center: 'text-center', right: 'text-right',
};

const columns = computed<Col[]>(() => {
  const op = operation.value;
  if (!op) return [];
  const canSort = op.sortable;
  const cols: Col[] = [
    { field: '_label', header: op.labelField || 'Label', sortable: canSort },
  ];
  for (const f of op.fields) {
    if (!f.index.visible) continue; // hidden from the index grid; still in details
    cols.push({
      field: f.name, header: f.label, sortable: canSort && f.index.sortable,
      width: f.index.width, align: f.index.align, frozen: f.index.frozen, display: f.index.display,
    });
  }
  return cols;
});

// ── Details — navigate to the standalone details page ───────────────────────────
// Single-row selection drives the right-side actions toolbar (grows over time).
const selected = ref<Record<string, any> | null>(null);

function goDetails(row: Record<string, any>) {
  const id = String(row?._key ?? '');
  if (!id) return;
  // Hand the already-loaded row (all fields) to the details page for an instant view.
  rememberRecord(datasourceKey.value, id, row);
  router.push(`${route.path}/${encodeURIComponent(id)}`);
}

function goCreate() {
  router.push(`${route.path}/new`);
}

const searchFilter = computed(() => operation.value?.filters.find(f => f.key === 'search') ?? null);
const otherFilters = computed(() => operation.value?.filters.filter(f => f.key !== 'search') ?? []);
const hasAnyFilter = computed(() => !!searchFilter.value || otherFilters.value.length > 0);

// ── Load metadata ──────────────────────────────────────────────────────────────
async function loadDatasource() {
  loadError.value = null;
  notFound.value  = false;
  try {
    const all = await api.browsable();
    const ds  = all.find(d => d.key === datasourceKey.value) ?? null;
    if (!ds || !ds.operations.length) {
      notFound.value = true;
      datasource.value = null;
      operation.value  = null;
      return;
    }
    datasource.value = ds;
    // Primary query operation: the one keyed "browse", else the first.
    operation.value = ds.operations.find(o => o.key === 'browse') ?? ds.operations[0];
    resetState();
    await loadPage();
  } catch (err: any) {
    loadError.value = err?.response?.data?.message ?? err?.message ?? 'Could not load datasources.';
  }
}

function resetState() {
  rows.value = [];
  totalRecords.value = 0;
  totalKnown.value = false;
  page.value = 1;
  sortField.value = null;
  sortOrder.value = 0;
  filterValues.value = {};
}

// ── Load a page ─────────────────────────────────────────────────────────────────
function activeFilters(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(filterValues.value)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
}

async function loadPage() {
  const op = operation.value;
  const ds = datasource.value;
  if (!op || !ds) return;

  const seq = ++reqSeq;
  loading.value  = true;
  loadError.value = null;

  const limit  = rowsPerPage.value;
  const offset = (page.value - 1) * limit;
  const sort   = sortField.value && sortOrder.value !== 0
    ? { field: sortField.value, dir: sortOrder.value === -1 ? 'desc' as const : 'asc' as const }
    : undefined;

  try {
    const res = await api.execute(ds.key, op.key, {
      filters: activeFilters(),
      limit,
      offset,
      page: page.value,
      sort,
    });
    if (seq !== reqSeq) return; // a newer request superseded this one

    rows.value = res.items ?? [];
    if (typeof res.total === 'number') {
      totalRecords.value = res.total;
      totalKnown.value = true;
    } else {
      // No total from the remote (§7.2 total.from: none): estimate enough to allow
      // paging forward while there is a full page.
      totalKnown.value = false;
      totalRecords.value = offset + rows.value.length + (rows.value.length === limit ? limit : 0);
    }
  } catch (err: any) {
    if (seq !== reqSeq) return;
    rows.value = [];
    totalRecords.value = 0;
    loadError.value = err?.response?.data?.message
      ?? err?.message
      ?? 'This datasource is currently unavailable.';
  } finally {
    if (seq === reqSeq) loading.value = false;
  }
}

// ── Events ──────────────────────────────────────────────────────────────────────
function onPage(e: any) {
  page.value = (e.page ?? 0) + 1;
  rowsPerPage.value = e.rows ?? rowsPerPage.value;
  loadPage();
}

function onSort(e: any) {
  sortField.value = typeof e.sortField === 'string' && e.sortField ? e.sortField : null;
  sortOrder.value = e.sortOrder === 1 || e.sortOrder === -1 ? e.sortOrder : 0;
  page.value = 1;
  loadPage();
}

function applyFilters() {
  page.value = 1;
  loadPage();
}

function clearFilters() {
  filterValues.value = {};
  page.value = 1;
  loadPage();
}

// Debounced live search.
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(() => filterValues.value.search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { page.value = 1; loadPage(); }, 350);
});

watch(datasourceKey, loadDatasource);
onMounted(loadDatasource);
</script>

<template>
  <div class="p-4 flex flex-col gap-4 h-full">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <i class="pi pi-database text-xl text-primary" />
      <div class="min-w-0">
        <h1 class="text-xl font-semibold truncate" style="color: var(--layout-title-color)">
          {{ datasource?.name ?? datasourceKey }}
        </h1>
        <p v-if="datasource?.description" class="text-sm text-surface-500 truncate">
          {{ datasource.description }}
        </p>
      </div>
    </div>

    <!-- Not found -->
    <div v-if="notFound" class="flex flex-col items-center gap-2 py-16 text-surface-400">
      <i class="pi pi-exclamation-triangle text-2xl" />
      <span class="text-sm">No browsable datasource "{{ datasourceKey }}".</span>
    </div>

    <template v-else>
      <!-- Filters + row actions -->
      <div class="flex flex-wrap items-end gap-3">
        <div v-if="hasAnyFilter" class="flex flex-wrap items-end gap-3">
        <!-- Search -->
        <div v-if="searchFilter" class="flex flex-col gap-1">
          <label class="text-xs text-surface-500">{{ searchFilter.label }}</label>
          <span class="p-input-icon-left">
            <InputText
              v-model="filterValues.search"
              :placeholder="searchFilter.label"
              class="w-64"
            />
          </span>
        </div>

        <!-- Declared filters -->
        <div v-for="f in otherFilters" :key="f.key" class="flex flex-col gap-1">
          <label class="text-xs text-surface-500">{{ f.label }}</label>
          <Select
            v-if="f.type === 'select'"
            v-model="filterValues[f.key]"
            :options="f.options ?? []"
            option-label="label"
            option-value="value"
            show-clear
            :placeholder="f.label"
            class="w-48"
          />
          <Select
            v-else-if="f.type === 'boolean'"
            v-model="filterValues[f.key]"
            :options="[{ label: 'Yes', value: true }, { label: 'No', value: false }]"
            option-label="label"
            option-value="value"
            show-clear
            :placeholder="f.label"
            class="w-40"
          />
          <InputText
            v-else
            v-model="filterValues[f.key]"
            :type="f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'"
            :placeholder="f.label"
            class="w-48"
            @keyup.enter="applyFilters"
          />
        </div>

        <div class="flex items-center gap-2">
          <Button label="Apply" icon="pi pi-filter" size="small" @click="applyFilters" />
          <Button label="Clear" icon="pi pi-times" size="small" severity="secondary" text @click="clearFilters" />
        </div>
        </div>

        <!-- Row actions -->
        <div class="flex items-end gap-2 ml-auto">
          <Button
            label="View details"
            icon="pi pi-eye"
            size="small"
            severity="secondary"
            :disabled="!selected"
            @click="selected && goDetails(selected)"
          />
          <Button
            v-if="datasource?.canCreate"
            label="New"
            icon="pi pi-plus"
            size="small"
            @click="goCreate"
          />
        </div>
      </div>

      <!-- Load error — the real remote reason is shown so it can be reported -->
      <div
        v-if="loadError"
        class="flex flex-col gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm"
      >
        <div class="flex items-start gap-2">
          <i class="pi pi-exclamation-triangle shrink-0 mt-0.5" />
          <span class="wrap-break-word">{{ loadError }}</span>
        </div>
        <div class="flex items-center gap-4 pl-6">
          <Button label="Retry" size="small" text @click="loadPage" />
          <router-link
            v-if="isAdmin"
            to="/admin/datasources"
            class="text-xs underline hover:no-underline"
          >Open datasource settings</router-link>
        </div>
      </div>

      <!-- Table -->
      <DataTable
        :value="rows"
        v-model:selection="selected"
        selection-mode="single"
        lazy
        paginator
        :rows="rowsPerPage"
        :rows-per-page-options="[10, 20, 50, 100]"
        :total-records="totalRecords"
        :loading="loading"
        :sort-field="sortField ?? undefined"
        :sort-order="sortOrder"
        removable-sort
        data-key="_key"
        class="flex-1"
        @page="onPage"
        @sort="onSort"
      >
        <Column
          v-for="col in columns"
          :key="col.field"
          :field="col.field"
          :header="col.header"
          :sortable="col.sortable"
          :frozen="col.frozen"
          :style="col.width ? { width: col.width } : undefined"
          :body-class="col.align ? ALIGN_CLASS[col.align] : undefined"
          :header-class="col.align ? ALIGN_CLASS[col.align] : undefined"
        >
          <template v-if="col.display" #body="{ data }">
            <FieldValue :value="data[col.field]" :display="col.display" :record="data" />
          </template>
        </Column>

        <Column :style="{ width: '4rem' }" body-class="text-right">
          <template #body="{ data }">
            <Button
              icon="pi pi-eye"
              text
              rounded
              size="small"
              v-tooltip.left="'Details'"
              @click="goDetails(data)"
            />
          </template>
        </Column>

        <template #empty>
          <div class="py-8 text-center text-surface-400 text-sm">
            {{ loadError ? 'Unavailable.' : 'No records.' }}
          </div>
        </template>
      </DataTable>

      <p v-if="!totalKnown && rows.length" class="text-xs text-surface-400">
        This datasource does not report a total count — page numbers are approximate.
      </p>
    </template>
  </div>
</template>
