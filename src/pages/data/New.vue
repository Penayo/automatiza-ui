<script setup lang="ts">
/**
 * Standalone create-record page — docs/specs/datasources.spec.md §10.6.
 *
 * A full-page form over the fields marked `form.visible` on the datasource's
 * primary query operation, grouped/rendered the same way Detail.vue's view
 * fields are, but editable. Reached from the browse grid's "New" button
 * (shown only when `canCreate`). Routes: /admin/data/:datasourceKey/new and
 * /data/:datasourceKey/new.
 */
import { ref, shallowRef, computed, defineAsyncComponent, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, useToast, Message } from 'primevue';
import {
  DatasourcesService,
  type BrowsableDatasource,
  type BrowsableOperation,
  type BrowsableField,
} from '@services/DatasourcesService';
import FieldInput from '@components/data/FieldInput.vue';

// §10.6 — an operation may declare `result.formComponent`, a bare name resolved here to a
// hand-authored form instead of the generic field grid below. Fixed folder, so the name is
// never used to build an arbitrary path.
const customFormModules = import.meta.glob('/src/pages/datasources/forms/*.vue');

// Literal class names, not built from a template string — Tailwind's build-time
// scanner needs the full utility name present verbatim in the source to emit it.
const COLSPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: '', 2: 'sm:col-span-2', 3: 'sm:col-span-2 xl:col-span-3',
};

const route  = useRoute();
const router = useRouter();
const toast  = useToast();
const api    = new DatasourcesService();

const datasourceKey = computed(() => route.params.datasourceKey as string);
const listPath      = computed(() => `/${route.path.split('/').slice(1, -1).join('/')}`); // drop "/new"

const datasource = ref<BrowsableDatasource | null>(null);
const operation  = ref<BrowsableOperation | null>(null);
const loading    = ref(false);
const notFound   = ref(false);
const forbidden  = ref(false);
const saving     = ref(false);
const errors     = ref<string[]>([]);

const formValues = ref<Record<string, any>>({});

const customForm        = shallowRef<any>(null);
const customFormMissing = ref(false);

function resolveCustomForm() {
  customForm.value = null;
  customFormMissing.value = false;
  const name = operation.value?.formComponent;
  if (!name) return;
  const loader = customFormModules[`/src/pages/datasources/forms/${name}.vue`];
  if (!loader) { customFormMissing.value = true; return; }
  customForm.value = defineAsyncComponent(loader as () => Promise<any>);
}

function defaultFor(field: BrowsableField): any {
  return field.form?.component?.kind === 'boolean' ? false : null;
}

/** Same section/order grouping as Detail.vue's `sections`, but sourced from `form` and opt-in via `form.visible`. */
const sections = computed(() => {
  const fields = (operation.value?.fields ?? []).filter(f => f.form?.visible);
  const ungrouped: { f: BrowsableField; i: number }[] = [];
  const named = new Map<string, { f: BrowsableField; i: number }[]>();
  fields.forEach((f, i) => {
    const name = f.form?.section?.trim();
    if (!name) { ungrouped.push({ f, i }); return; }
    if (!named.has(name)) named.set(name, []);
    named.get(name)!.push({ f, i });
  });
  const byOrder = (a: { f: BrowsableField; i: number }, b: { f: BrowsableField; i: number }) =>
    (a.f.form?.order ?? a.i) - (b.f.form?.order ?? b.i);

  const groups: { name: string | null; fields: BrowsableField[] }[] = [];
  if (ungrouped.length) groups.push({ name: null, fields: ungrouped.sort(byOrder).map(x => x.f) });
  for (const [name, entries] of named) groups.push({ name, fields: entries.sort(byOrder).map(x => x.f) });
  return groups;
});

async function load() {
  loading.value = true;
  notFound.value = false;
  forbidden.value = false;
  try {
    const all = await api.browsable();
    const ds  = all.find(d => d.key === datasourceKey.value) ?? null;
    if (!ds || !ds.operations.length) { notFound.value = true; return; }
    datasource.value = ds;
    operation.value  = ds.operations.find(o => o.key === 'browse') ?? ds.operations[0];
    resolveCustomForm();

    if (!ds.canCreate) { forbidden.value = true; return; }

    const seeded: Record<string, any> = {};
    for (const f of operation.value.fields) if (f.form?.visible) seeded[f.name] = defaultFor(f);
    formValues.value = seeded;
  } catch {
    notFound.value = true;
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push(listPath.value);
}

function normalizeErrors(err: any): string[] {
  const message = err?.response?.data?.message ?? err?.message ?? 'Could not create the record.';
  return Array.isArray(message) ? message : [message];
}

function isEmpty(v: any): boolean {
  return v === null || v === undefined || v === '';
}

/**
 * Client-side only — `required`/`minLength`/`maxLength` are never sent to the
 * remote (§10.6); a violation here just blocks submit with an inline message,
 * the same list style as a server-side failure.
 */
function validate(): string[] {
  const errs: string[] = [];
  for (const f of operation.value?.fields ?? []) {
    if (!f.form?.visible) continue;
    const val = formValues.value[f.name];
    if (f.form.required && isEmpty(val)) {
      errs.push(`"${f.label}" is required.`);
      continue;
    }
    const comp = f.form.component;
    if (comp && typeof val === 'string' && val.length) {
      if (comp.minLength !== undefined && val.length < comp.minLength) {
        errs.push(`"${f.label}" must be at least ${comp.minLength} characters.`);
      }
      if (comp.maxLength !== undefined && val.length > comp.maxLength) {
        errs.push(`"${f.label}" must be at most ${comp.maxLength} characters.`);
      }
    }
  }
  return errs;
}

async function submit() {
  if (!operation.value) return;

  const validationErrors = validate();
  if (validationErrors.length) {
    errors.value = validationErrors;
    return;
  }
  errors.value = [];

  const data: Record<string, any> = {};
  for (const f of operation.value.fields) {
    if (f.form?.visible) data[f.path] = formValues.value[f.name];
  }

  saving.value = true;
  try {
    await api.createRecord(datasourceKey.value, data);
    toast.add({ severity: 'success', summary: 'Created', detail: 'The record was created.', life: 3000 });
    router.push(listPath.value);
  } catch (err: any) {
    errors.value = normalizeErrors(err);
  } finally {
    saving.value = false;
  }
}

/**
 * §10.6 — the custom form owns fields/validation/layout; the platform keeps sole ownership of
 * the create-proxy call, toast, and success/error navigation (same outcome as `submit()`).
 */
async function submitCustom(data: Record<string, any>) {
  errors.value = [];
  saving.value = true;
  try {
    await api.createRecord(datasourceKey.value, data);
    toast.add({ severity: 'success', summary: 'Created', detail: 'The record was created.', life: 3000 });
    router.push(listPath.value);
  } catch (err: any) {
    errors.value = normalizeErrors(err);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-4 flex flex-col gap-4 w-full">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <Button icon="pi pi-arrow-left" text rounded size="small" v-tooltip.right="'Back to list'" @click="goBack" />
      <i class="pi pi-plus-circle text-lg text-primary" />
      <div class="min-w-0">
        <h1 class="text-lg font-semibold truncate" style="color: var(--layout-title-color)">
          New {{ datasource?.name ?? datasourceKey }}
        </h1>
      </div>
    </div>

    <div v-if="loading" class="py-16 text-center text-surface-400 text-sm">
      <i class="pi pi-spin pi-spinner text-xl" />
    </div>

    <div v-else-if="notFound" class="flex flex-col items-center gap-2 py-16 text-surface-400">
      <i class="pi pi-exclamation-triangle text-2xl" />
      <span class="text-sm">No browsable datasource "{{ datasourceKey }}".</span>
      <Button label="Back to list" icon="pi pi-arrow-left" severity="secondary" size="small" @click="goBack" />
    </div>

    <div v-else-if="forbidden" class="flex flex-col items-center gap-2 py-16 text-surface-400">
      <i class="pi pi-lock text-2xl" />
      <span class="text-sm">You don't have access to create records here.</span>
      <Button label="Back to list" icon="pi pi-arrow-left" severity="secondary" size="small" @click="goBack" />
    </div>

    <template v-else>
      <div v-if="errors.length" class="flex flex-col gap-1">
        <Message v-for="(e, i) in errors" :key="i" severity="error" :closable="false">{{ e }}</Message>
      </div>

      <Message v-if="customFormMissing" severity="warn" size="small" :closable="false">
        Custom form component "{{ operation?.formComponent }}" was not found — showing the default form.
      </Message>

      <!-- Custom form component (§10.6) — owns fields/layout, emits submit(data)/cancel -->
      <component
        v-if="customForm"
        :is="customForm"
        :datasource-key="datasourceKey"
        :operation="operation"
        :saving="saving"
        @submit="submitCustom"
        @cancel="goBack"
      />

      <template v-else>
      <div v-if="!sections.length" class="text-sm text-surface-400 py-8 text-center">
        This datasource has no fields configured for the create form yet.
      </div>

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
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 p-4">
            <div
              v-for="f in section.fields"
              :key="f.name"
              class="flex flex-col gap-1"
              :class="f.form?.colSpan ? COLSPAN_CLASS[f.form.colSpan] : ''"
            >
              <label class="text-xs text-surface-500">
                {{ f.label }}<span v-if="f.form?.required" class="text-red-500">&nbsp;*</span>
              </label>
              <FieldInput v-model="formValues[f.name]" :component="f.form?.component" />
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 justify-end">
        <Button label="Cancel" text size="small" :disabled="saving" @click="goBack" />
        <Button label="Create" icon="pi pi-check" size="small" :loading="saving" :disabled="!sections.length" @click="submit" />
      </div>
      </template>
    </template>
  </div>
</template>
