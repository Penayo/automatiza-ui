<script setup lang="ts">
/**
 * Per-field display configuration — datasources.spec.md §6. Edits one field's
 * `index.display` or `view.display`: a fixed set of PrimeVue-backed render kinds,
 * each with its own small, purpose-built set of props (no raw prop passthrough).
 */
import { ref, watch } from 'vue';
import { Dialog, Select, InputText, InputNumber, ToggleSwitch, Button } from 'primevue';
import type { FieldDisplay, FieldDisplayKind, FieldSeverity } from '@services/DatasourcesService';

const props = defineProps<{
  visible: boolean;
  fieldName: string;
  /** Which config this edits — purely for the dialog header. */
  context: 'index' | 'view';
  modelValue?: FieldDisplay;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  /** undefined ⇒ clear the display config back to the default (plain text). */
  (e: 'save', display: FieldDisplay | undefined): void;
}>();

const KIND_OPTIONS: { label: string; value: FieldDisplayKind }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Tag', value: 'tag' },
  { label: 'Badge', value: 'badge' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Number', value: 'number' },
  { label: 'Link', value: 'link' },
  { label: 'Image', value: 'image' },
  { label: 'Progress', value: 'progress' },
];

const SEVERITY_OPTIONS: FieldSeverity[] = ['success', 'info', 'warn', 'danger', 'secondary', 'contrast'];
const NUMBER_STYLE_OPTIONS: ('decimal' | 'currency' | 'percent')[] = ['decimal', 'currency', 'percent'];
const TARGET_OPTIONS: ('_blank' | '_self')[] = ['_blank', '_self'];

function emptyForm(): FieldDisplay {
  return { kind: 'text' };
}

const form = ref<FieldDisplay>(emptyForm());
const severityRows = ref<{ value: string; severity: FieldSeverity }[]>([]);

function seed() {
  const d = props.modelValue;
  form.value = d ? { ...d } : emptyForm();
  severityRows.value = d?.severityMap
    ? Object.entries(d.severityMap).map(([value, severity]) => ({ value, severity }))
    : [];
}

watch(() => props.visible, (v) => { if (v) seed(); });

function addSeverityRow() { severityRows.value.push({ value: '', severity: 'secondary' }); }
function removeSeverityRow(i: number) { severityRows.value.splice(i, 1); }

function close() { emit('update:visible', false); }

function save() {
  const out: FieldDisplay = { kind: form.value.kind };

  if (out.kind === 'text') {
    out.monospace = form.value.monospace;
    out.truncate = form.value.truncate;
  } else if (out.kind === 'tag' || out.kind === 'badge') {
    const map: Record<string, FieldSeverity> = {};
    for (const row of severityRows.value) if (row.value.trim()) map[row.value.trim()] = row.severity;
    if (Object.keys(map).length) out.severityMap = map;
    out.defaultSeverity = form.value.defaultSeverity;
  } else if (out.kind === 'boolean') {
    out.trueLabel = form.value.trueLabel;
    out.falseLabel = form.value.falseLabel;
  } else if (out.kind === 'date') {
    out.format = form.value.format;
    out.relative = form.value.relative;
  } else if (out.kind === 'number') {
    out.style = form.value.style;
    out.currency = form.value.currency;
    out.decimals = form.value.decimals;
  } else if (out.kind === 'link') {
    out.hrefTemplate = form.value.hrefTemplate;
    out.label = form.value.label;
    out.target = form.value.target;
  } else if (out.kind === 'image') {
    out.srcTemplate = form.value.srcTemplate;
    out.width = form.value.width;
    out.height = form.value.height;
    out.preview = form.value.preview;
  } else if (out.kind === 'progress') {
    out.max = form.value.max;
  }

  emit('save', out.kind === 'text' && !out.monospace && !out.truncate ? undefined : out);
  close();
}

function clear() {
  emit('save', undefined);
  close();
}
</script>

<template>
  <Dialog
    :visible="visible" @update:visible="emit('update:visible', $event)"
    modal :header="`${context === 'index' ? 'Index column' : 'View field'} display — ${fieldName}`"
    :style="{ width: '30rem' }"
  >
    <div class="flex flex-col gap-3">
      <div>
        <label class="text-xs font-medium">Render as</label>
        <Select v-model="form.kind" :options="KIND_OPTIONS" option-label="label" option-value="value" class="w-full" size="small" />
      </div>

      <template v-if="form.kind === 'text'">
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 text-sm"><ToggleSwitch v-model="form.monospace" />Monospace</label>
          <label class="flex items-center gap-2 text-sm"><ToggleSwitch v-model="form.truncate" />Truncate</label>
        </div>
      </template>

      <template v-else-if="form.kind === 'tag' || form.kind === 'badge'">
        <div>
          <label class="text-xs font-medium">Value → severity</label>
          <div v-for="(row, i) in severityRows" :key="i" class="flex items-center gap-2 mt-1">
            <InputText v-model="row.value" size="small" placeholder="value" class="flex-1" />
            <Select v-model="row.severity" :options="SEVERITY_OPTIONS" size="small" style="width: 9rem" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeSeverityRow(i)" />
          </div>
          <Button label="Add mapping" icon="pi pi-plus" text size="small" class="mt-1" @click="addSeverityRow" />
        </div>
        <div>
          <label class="text-xs font-medium">Default severity</label>
          <Select v-model="form.defaultSeverity" :options="SEVERITY_OPTIONS" show-clear class="w-full" size="small" />
        </div>
      </template>

      <template v-else-if="form.kind === 'boolean'">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium">True label</label>
            <InputText v-model="form.trueLabel" class="w-full" size="small" placeholder="Yes" />
          </div>
          <div>
            <label class="text-xs font-medium">False label</label>
            <InputText v-model="form.falseLabel" class="w-full" size="small" placeholder="No" />
          </div>
        </div>
      </template>

      <template v-else-if="form.kind === 'date'">
        <div class="grid grid-cols-2 gap-3 items-end">
          <div>
            <label class="text-xs font-medium">Format</label>
            <InputText v-model="form.format" class="w-full" size="small" placeholder="YYYY-MM-DD" />
          </div>
          <label class="flex items-center gap-2 text-sm pb-1"><ToggleSwitch v-model="form.relative" />Relative (e.g. "3 days ago")</label>
        </div>
      </template>

      <template v-else-if="form.kind === 'number'">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs font-medium">Style</label>
            <Select v-model="form.style" :options="NUMBER_STYLE_OPTIONS" show-clear class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Currency</label>
            <InputText v-model="form.currency" :disabled="form.style !== 'currency'" class="w-full" size="small" placeholder="USD" />
          </div>
          <div>
            <label class="text-xs font-medium">Decimals</label>
            <InputNumber v-model="form.decimals" :min="0" :max="6" class="w-full" size="small" />
          </div>
        </div>
      </template>

      <template v-else-if="form.kind === 'link'">
        <div>
          <label class="text-xs font-medium">Href template</label>
          <InputText v-model="form.hrefTemplate" class="w-full" size="small" placeholder="https://example.com/{{value}}" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium">Label template</label>
            <InputText v-model="form.label" class="w-full" size="small" placeholder="{{value}}" />
          </div>
          <div>
            <label class="text-xs font-medium">Target</label>
            <Select v-model="form.target" :options="TARGET_OPTIONS" show-clear class="w-full" size="small" />
          </div>
        </div>
        <small class="text-surface-400">
          <span v-pre><code>{{value}}</code></span> — this field's value.
          <span v-pre><code>{{record.otherField}}</code></span> — another mapped field on the same record.
        </small>
      </template>

      <template v-else-if="form.kind === 'image'">
        <div>
          <label class="text-xs font-medium">Src template</label>
          <InputText v-model="form.srcTemplate" class="w-full" size="small" placeholder="https://example.com/img/{{value}}.jpg" />
        </div>
        <div class="grid grid-cols-3 gap-3 items-end">
          <div>
            <label class="text-xs font-medium">Width (px)</label>
            <InputNumber v-model="form.width" :min="1" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Height (px)</label>
            <InputNumber v-model="form.height" :min="1" class="w-full" size="small" />
          </div>
          <label class="flex items-center gap-2 text-sm pb-1"><ToggleSwitch v-model="form.preview" />Preview</label>
        </div>
      </template>

      <template v-else-if="form.kind === 'progress'">
        <div>
          <label class="text-xs font-medium">Max value</label>
          <InputNumber v-model="form.max" :min="1" class="w-full" size="small" placeholder="100" />
        </div>
      </template>
    </div>

    <template #footer>
      <Button label="Clear" text severity="secondary" size="small" class="mr-auto" @click="clear" />
      <Button label="Cancel" text size="small" @click="close" />
      <Button label="Save" icon="pi pi-check" size="small" @click="save" />
    </template>
  </Dialog>
</template>
