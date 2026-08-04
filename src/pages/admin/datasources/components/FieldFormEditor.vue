<script setup lang="ts">
/**
 * Per-field create/update-form configuration — datasources.spec.md §10.6. Edits
 * one field's `form.component`: a fixed set of input kinds, each with its own
 * small, purpose-built set of props (no raw prop passthrough) — same pattern as
 * FieldDisplayEditor.vue, just for editable inputs instead of rendering.
 */
import { ref, watch, computed } from 'vue';
import { Dialog, Select, InputText, InputNumber, ToggleSwitch, DatePicker, Button } from 'primevue';
import type { FieldFormComponent, FieldFormKind } from '@services/DatasourcesService';

const props = defineProps<{
  visible: boolean;
  fieldName: string;
  modelValue?: FieldFormComponent;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  /** undefined ⇒ clear back to no component (plain text input). */
  (e: 'save', component: FieldFormComponent | undefined): void;
}>();

const KIND_OPTIONS: { label: string; value: FieldFormKind }[] = [
  { label: 'Text', value: 'text' },
  { label: 'Textarea', value: 'textarea' },
  { label: 'Number', value: 'number' },
  { label: 'Select', value: 'select' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
];

function emptyForm(): FieldFormComponent {
  return { kind: 'text' };
}

const form = ref<FieldFormComponent>(emptyForm());
const optionRows = ref<{ label: string; value: string }[]>([]);

function seed() {
  const c = props.modelValue;
  form.value = c ? { ...c } : emptyForm();
  optionRows.value = c?.options?.map(o => ({ label: o.label, value: String(o.value) })) ?? [];
}

watch(() => props.visible, (v) => { if (v) seed(); });

function addOptionRow() { optionRows.value.push({ label: '', value: '' }); }
function removeOptionRow(i: number) { optionRows.value.splice(i, 1); }

// DatePicker works with Date objects; the stored config is an ISO date string.
const minDateValue = computed({
  get: () => (form.value.minDate ? new Date(form.value.minDate) : null),
  set: (v: Date | null) => { form.value.minDate = v ? v.toISOString().slice(0, 10) : undefined; },
});
const maxDateValue = computed({
  get: () => (form.value.maxDate ? new Date(form.value.maxDate) : null),
  set: (v: Date | null) => { form.value.maxDate = v ? v.toISOString().slice(0, 10) : undefined; },
});

function close() { emit('update:visible', false); }

function save() {
  const out: FieldFormComponent = { kind: form.value.kind };

  if (out.kind === 'text') {
    out.placeholder = form.value.placeholder;
    out.minLength = form.value.minLength;
    out.maxLength = form.value.maxLength;
  } else if (out.kind === 'textarea') {
    out.placeholder = form.value.placeholder;
    out.rows = form.value.rows;
    out.minLength = form.value.minLength;
    out.maxLength = form.value.maxLength;
  } else if (out.kind === 'number') {
    out.min = form.value.min;
    out.max = form.value.max;
    out.step = form.value.step;
  } else if (out.kind === 'select') {
    out.options = optionRows.value
      .filter(r => r.label.trim())
      .map(r => ({ label: r.label.trim(), value: r.value }));
    out.filterable = form.value.filterable;
  } else if (out.kind === 'date') {
    out.format = form.value.format;
    out.minDate = form.value.minDate;
    out.maxDate = form.value.maxDate;
  }

  emit('save', out);
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
    modal :header="`Form field — ${fieldName}`"
    :style="{ width: '28rem' }"
  >
    <div class="flex flex-col gap-3">
      <div>
        <label class="text-xs font-medium">Input</label>
        <Select v-model="form.kind" :options="KIND_OPTIONS" option-label="label" option-value="value" class="w-full" size="small" />
      </div>

      <template v-if="form.kind === 'text'">
        <div>
          <label class="text-xs font-medium">Placeholder</label>
          <InputText v-model="form.placeholder" class="w-full" size="small" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium">Min length</label>
            <InputNumber v-model="form.minLength" :min="0" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Max length</label>
            <InputNumber v-model="form.maxLength" :min="1" class="w-full" size="small" />
          </div>
        </div>
      </template>

      <template v-else-if="form.kind === 'textarea'">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium">Placeholder</label>
            <InputText v-model="form.placeholder" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Rows</label>
            <InputNumber v-model="form.rows" :min="1" class="w-full" size="small" placeholder="3" />
          </div>
          <div>
            <label class="text-xs font-medium">Min length</label>
            <InputNumber v-model="form.minLength" :min="0" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Max length</label>
            <InputNumber v-model="form.maxLength" :min="1" class="w-full" size="small" />
          </div>
        </div>
      </template>

      <template v-else-if="form.kind === 'number'">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="text-xs font-medium">Min</label>
            <InputNumber v-model="form.min" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Max</label>
            <InputNumber v-model="form.max" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-xs font-medium">Step</label>
            <InputNumber v-model="form.step" :min="1" class="w-full" size="small" placeholder="1" />
          </div>
        </div>
      </template>

      <template v-else-if="form.kind === 'select'">
        <div>
          <label class="text-xs font-medium">Options</label>
          <div v-for="(row, i) in optionRows" :key="i" class="flex items-center gap-2 mt-1">
            <InputText v-model="row.label" size="small" placeholder="label" class="flex-1" />
            <InputText v-model="row.value" size="small" placeholder="value" class="flex-1" />
            <Button icon="pi pi-trash" text rounded size="small" severity="danger" @click="removeOptionRow(i)" />
          </div>
          <Button label="Add option" icon="pi pi-plus" text size="small" class="mt-1" @click="addOptionRow" />
        </div>
        <label class="flex items-center gap-2 text-sm"><ToggleSwitch v-model="form.filterable" />Searchable (many options)</label>
      </template>

      <template v-else-if="form.kind === 'date'">
        <div>
          <label class="text-xs font-medium">Format</label>
          <InputText v-model="form.format" class="w-full" size="small" placeholder="yy-mm-dd" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-medium">Earliest date</label>
            <DatePicker v-model="minDateValue" class="w-full" size="small" show-icon />
          </div>
          <div>
            <label class="text-xs font-medium">Latest date</label>
            <DatePicker v-model="maxDateValue" class="w-full" size="small" show-icon />
          </div>
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
