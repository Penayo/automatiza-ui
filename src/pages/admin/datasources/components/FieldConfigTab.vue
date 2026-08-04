<script setup lang="ts">
import { ref, computed } from 'vue';
import { Button, InputText, InputNumber, Select, ToggleSwitch, Tabs, TabList, Tab, TabPanels, TabPanel } from 'primevue';
import type { FieldDisplay, FieldFormComponent } from '@services/DatasourcesService';
import FieldDisplayEditor from './FieldDisplayEditor.vue';
import FieldFormEditor from './FieldFormEditor.vue';

defineProps<{
  sortStyleMode: string;
}>();

const operationsJson = defineModel<string>('operationsJson', { required: true });

// A structured helper over the operations JSON: the browse grid and details page
// each read their own per-field config (`index` / `view`), so let the admin edit
// them here rather than hand-editing the JSON.
function parsedOpsOrNull(): any[] | null {
  try {
    const ops = JSON.parse(operationsJson.value);
    return Array.isArray(ops) ? ops : null;
  } catch { return null; }
}

/** The operation the browse page indexes: the one keyed `browse`, else the first query. */
const primaryQueryOp = computed(() => {
  const ops = parsedOpsOrNull();
  if (!ops) return null;
  return ops.find((o: any) => o?.kind === 'query' && o?.key === 'browse')
    ?? ops.find((o: any) => o?.kind === 'query')
    ?? null;
});

const indexFields = computed<any[]>(() => primaryQueryOp.value?.result?.fields ?? []);

/** Finds `fieldName` in the live-parsed operations JSON, applies `patch`, writes it back. */
function mutateField(fieldName: string, patch: (field: any) => void) {
  const ops = parsedOpsOrNull();
  if (!ops) return;
  const opKey = primaryQueryOp.value?.key;
  const op = ops.find((o: any) => o?.kind === 'query' && o?.key === opKey);
  const field = op?.result?.fields?.find((f: any) => f.name === fieldName);
  if (!field) return;
  patch(field);
  operationsJson.value = JSON.stringify(ops, null, 2);
}

function setIndexConfig(fieldName: string, patch: Record<string, any>) {
  mutateField(fieldName, (field) => {
    field.index = { ...(field.index ?? {}), ...patch };
  });
}

function setViewConfig(fieldName: string, patch: Record<string, any>) {
  mutateField(fieldName, (field) => {
    field.view = { ...(field.view ?? {}), ...patch };
  });
}

function setFormConfig(fieldName: string, patch: Record<string, any>) {
  mutateField(fieldName, (field) => {
    field.form = { ...(field.form ?? {}), ...patch };
  });
}

/** Like `mutateField`, but patches the operation's own `result` — the custom view/form component names. */
function setOpResultConfig(patch: Record<string, any>) {
  const ops = parsedOpsOrNull();
  if (!ops) return;
  const opKey = primaryQueryOp.value?.key;
  const op = ops.find((o: any) => o?.kind === 'query' && o?.key === opKey);
  if (!op) return;
  op.result = { ...(op.result ?? {}), ...patch };
  operationsJson.value = JSON.stringify(ops, null, 2);
}

// ── Display editor dialog (index or view context) ────────────────────────────
const displayDialogVisible = ref(false);
const displayDialogContext = ref<'index' | 'view'>('index');
const displayDialogField   = ref('');
const displayDialogValue   = ref<FieldDisplay | undefined>(undefined);

function openDisplayDialog(context: 'index' | 'view', field: any) {
  displayDialogContext.value = context;
  displayDialogField.value = field.name;
  displayDialogValue.value = context === 'index' ? field.index?.display : field.view?.display;
  displayDialogVisible.value = true;
}

function saveDisplay(display: FieldDisplay | undefined) {
  const setter = displayDialogContext.value === 'index' ? setIndexConfig : setViewConfig;
  setter(displayDialogField.value, { display });
}

// ── Form component editor dialog ──────────────────────────────────────────────
const formDialogVisible = ref(false);
const formDialogField   = ref('');
const formDialogValue   = ref<FieldFormComponent | undefined>(undefined);

function openFormDialog(field: any) {
  formDialogField.value = field.name;
  formDialogValue.value = field.form?.component;
  formDialogVisible.value = true;
}

function saveFormComponent(component: FieldFormComponent | undefined) {
  setFormConfig(formDialogField.value, { component });
}
</script>

<template>
  <div class="flex flex-col gap-4">

    <div v-if="!primaryQueryOp" class="text-xs text-surface-400 py-2">
      Declare a <code>query</code> operation in the Operations tab first.
    </div>
    <div v-else>
      <h3 class="text-sm font-semibold mb-1">Field Configuration</h3>
      <small class="text-surface-400 block mb-2">
        Per-field behaviour for the <code>{{ primaryQueryOp.key }}</code> query.
      </small>
      <div v-if="!indexFields.length" class="text-xs text-surface-400 py-2">
        This query has no <code>result.fields</code> declared yet.
      </div>

      <Tabs v-else value="index">
        <TabList>
          <Tab value="index">Index Config</Tab>
          <Tab value="view">View Config</Tab>
          <Tab value="form">Form Config</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="index" class="flex flex-col gap-2 pt-2">
            <small class="text-surface-400 block">
              How fields behave in the Data browse grid — visibility, sortability, column
              width/alignment, and how the value renders.
              <span v-if="sortStyleMode === 'none'">Add a Sort Style above to enable column sorting.</span>
            </small>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-surface-500">
                  <th class="text-left font-medium py-1">Field</th>
                  <th class="font-medium w-20 text-center">Visible</th>
                  <th class="font-medium w-20 text-center">Sortable</th>
                  <th class="text-left font-medium w-24">Width</th>
                  <th class="text-left font-medium w-28">Align</th>
                  <th class="font-medium w-16 text-center">Display</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in indexFields" :key="f.name" class="border-t border-surface-100 dark:border-surface-800">
                  <td class="py-1.5">
                    {{ f.label ?? f.name }}
                    <span class="text-surface-400 text-xs">({{ f.name }})</span>
                  </td>
                  <td class="text-center">
                    <ToggleSwitch
                      :model-value="f.index?.visible !== false"
                      @update:model-value="(v: boolean) => setIndexConfig(f.name, { visible: v })"
                    />
                  </td>
                  <td class="text-center">
                    <ToggleSwitch
                      :model-value="f.index?.sortable !== false"
                      :disabled="sortStyleMode === 'none'"
                      @update:model-value="(v: boolean) => setIndexConfig(f.name, { sortable: v })"
                    />
                  </td>
                  <td class="py-1">
                    <InputText
                      :model-value="f.index?.width ?? ''" size="small" class="w-full"
                      placeholder="10rem"
                      @update:model-value="(v: string | undefined) => setIndexConfig(f.name, { width: v || undefined })"
                    />
                  </td>
                  <td class="py-1">
                    <Select
                      :model-value="f.index?.align ?? null" :options="['left', 'center', 'right']"
                      show-clear placeholder="left" size="small" class="w-full"
                      @update:model-value="(v: string | null) => setIndexConfig(f.name, { align: v ?? undefined })"
                    />
                  </td>
                  <td class="text-center">
                    <Button
                      icon="pi pi-palette" text rounded size="small"
                      v-tooltip.top="f.index?.display ? `Display: ${f.index.display.kind}` : 'Display: text'"
                      @click="openDisplayDialog('index', f)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </TabPanel>

          <TabPanel value="view" class="flex flex-col gap-2 pt-2">
            <small class="text-surface-400 block">
              How fields lay out on the standalone details page — every mapped field always
              shows there, grouped by <b>Section</b> (ungrouped fields first, then each named
              section in the order it first appears), ordered within its section, and
              rendered full-width to the page's container.
            </small>

            <div>
              <label class="text-xs font-medium">Custom view component (optional)</label>
              <InputText
                :model-value="primaryQueryOp?.result?.viewComponent ?? ''" size="small" class="w-full"
                placeholder="vehicle-view"
                @update:model-value="(v: string | undefined) => setOpResultConfig({ viewComponent: v || undefined })"
              />
              <small class="text-surface-400">
                When set, the details page renders <code>pages/datasources/views/{{ primaryQueryOp?.result?.viewComponent || '<name>' }}.vue</code>
                instead of the section layout below — the field rows here then only drive the browse grid, not the details page.
              </small>
            </div>

            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-surface-500">
                  <th class="text-left font-medium py-1">Field</th>
                  <th class="text-left font-medium w-40">Section</th>
                  <th class="font-medium w-20 text-center">Order</th>
                  <th class="text-left font-medium w-28">Col span</th>
                  <th class="font-medium w-16 text-center">Display</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in indexFields" :key="f.name" class="border-t border-surface-100 dark:border-surface-800">
                  <td class="py-1.5">
                    {{ f.label ?? f.name }}
                    <span class="text-surface-400 text-xs">({{ f.name }})</span>
                  </td>
                  <td class="py-1">
                    <InputText
                      :model-value="f.view?.section ?? ''" size="small" class="w-full"
                      placeholder="ungrouped"
                      @update:model-value="(v: string | undefined) => setViewConfig(f.name, { section: v || undefined })"
                    />
                  </td>
                  <td class="py-1">
                    <InputNumber
                      :model-value="f.view?.order ?? null" size="small" class="w-full" :min="0"
                      @update:model-value="(v: number | null) => setViewConfig(f.name, { order: v ?? undefined })"
                    />
                  </td>
                  <td class="py-1">
                    <Select
                      :model-value="f.view?.colSpan ?? null" :options="[1, 2, 3]"
                      show-clear placeholder="1" size="small" class="w-full"
                      @update:model-value="(v: number | null) => setViewConfig(f.name, { colSpan: v ?? undefined })"
                    />
                  </td>
                  <td class="text-center">
                    <Button
                      icon="pi pi-palette" text rounded size="small"
                      v-tooltip.top="f.view?.display ? `Display: ${f.view.display.kind}` : 'Display: text'"
                      @click="openDisplayDialog('view', f)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </TabPanel>

          <TabPanel value="form" class="flex flex-col gap-2 pt-2">
            <small class="text-surface-400 block">
              Which fields appear on the create form (§10.6) — opt-in, unlike Index/View, since
              most mapped fields (ids, timestamps, computed values) aren't meant to be
              user-editable. <b>Required</b> blocks submit client-side with an inline message;
              it isn't sent to the remote. Grouped by <b>Section</b> the same way as View
              Config. Length limits, searchable-select, and date range live in the Component
              dialog. Submitted values are sent keyed by each field's <code>path</code>.
            </small>

            <div>
              <label class="text-xs font-medium">Custom form component (optional)</label>
              <InputText
                :model-value="primaryQueryOp?.result?.formComponent ?? ''" size="small" class="w-full"
                placeholder="vehicle-form"
                @update:model-value="(v: string | undefined) => setOpResultConfig({ formComponent: v || undefined })"
              />
              <small class="text-surface-400">
                When set, the create form renders <code>pages/datasources/forms/{{ primaryQueryOp?.result?.formComponent || '<name>' }}.vue</code>
                instead of the fields below — the field rows here then only tell the custom form which remote <code>path</code> each field name maps to.
              </small>
            </div>

            <table class="w-full text-sm">
              <thead>
                <tr class="text-xs text-surface-500">
                  <th class="text-left font-medium py-1">Field</th>
                  <th class="font-medium w-20 text-center">Visible</th>
                  <th class="font-medium w-20 text-center">Required</th>
                  <th class="text-left font-medium w-40">Section</th>
                  <th class="font-medium w-20 text-center">Order</th>
                  <th class="text-left font-medium w-28">Col span</th>
                  <th class="font-medium w-16 text-center">Component</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in indexFields" :key="f.name" class="border-t border-surface-100 dark:border-surface-800">
                  <td class="py-1.5">
                    {{ f.label ?? f.name }}
                    <span class="text-surface-400 text-xs">({{ f.name }})</span>
                  </td>
                  <td class="text-center">
                    <ToggleSwitch
                      :model-value="f.form?.visible === true"
                      @update:model-value="(v: boolean) => setFormConfig(f.name, { visible: v })"
                    />
                  </td>
                  <td class="text-center">
                    <ToggleSwitch
                      :model-value="f.form?.required === true"
                      :disabled="f.form?.visible !== true"
                      @update:model-value="(v: boolean) => setFormConfig(f.name, { required: v })"
                    />
                  </td>
                  <td class="py-1">
                    <InputText
                      :model-value="f.form?.section ?? ''" size="small" class="w-full"
                      placeholder="ungrouped"
                      @update:model-value="(v: string | undefined) => setFormConfig(f.name, { section: v || undefined })"
                    />
                  </td>
                  <td class="py-1">
                    <InputNumber
                      :model-value="f.form?.order ?? null" size="small" class="w-full" :min="0"
                      @update:model-value="(v: number | null) => setFormConfig(f.name, { order: v ?? undefined })"
                    />
                  </td>
                  <td class="py-1">
                    <Select
                      :model-value="f.form?.colSpan ?? null" :options="[1, 2, 3]"
                      show-clear placeholder="1" size="small" class="w-full"
                      @update:model-value="(v: number | null) => setFormConfig(f.name, { colSpan: v ?? undefined })"
                    />
                  </td>
                  <td class="text-center">
                    <Button
                      icon="pi pi-pencil" text rounded size="small"
                      v-tooltip.top="f.form?.component ? `Input: ${f.form.component.kind}` : 'Input: text'"
                      @click="openFormDialog(f)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <FieldFormEditor
      v-model:visible="formDialogVisible"
      :field-name="formDialogField"
      :model-value="formDialogValue"
      @save="saveFormComponent"
    />

    <FieldDisplayEditor
      v-model:visible="displayDialogVisible"
      :context="displayDialogContext"
      :field-name="displayDialogField"
      :model-value="displayDialogValue"
      @save="saveDisplay"
    />

  </div>
</template>
