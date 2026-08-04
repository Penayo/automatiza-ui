<script setup lang="ts">
/**
 * Renders one editable field per its declared `FieldFormComponent` (datasources.spec.md
 * §10.6) — used by the create-record page (New.vue). Parallel to FieldValue.vue, but for
 * input instead of display.
 */
import { computed } from 'vue';
import { InputText, Textarea, InputNumber, Select, ToggleSwitch, DatePicker } from 'primevue';
import type { FieldFormComponent } from '@services/DatasourcesService';

const props = defineProps<{
  modelValue: any;
  component?: FieldFormComponent;
}>();

const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>();

const value = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const kind = computed(() => props.component?.kind ?? 'text');

// DatePicker works with Date objects; the submitted value is normalized to an ISO string.
const dateValue = computed({
  get: () => (value.value ? new Date(value.value) : null),
  set: (v: Date | null) => { value.value = v ? v.toISOString() : null; },
});

const minDate = computed(() => (props.component?.minDate ? new Date(props.component.minDate) : undefined));
const maxDate = computed(() => (props.component?.maxDate ? new Date(props.component.maxDate) : undefined));
</script>

<template>
  <Textarea
    v-if="kind === 'textarea'"
    v-model="value" class="w-full" size="small" :rows="component?.rows ?? 3"
    :placeholder="component?.placeholder" :minlength="component?.minLength" :maxlength="component?.maxLength"
  />

  <InputNumber
    v-else-if="kind === 'number'"
    v-model="value" class="w-full" size="small"
    :min="component?.min" :max="component?.max" :step="component?.step"
  />

  <Select
    v-else-if="kind === 'select'"
    v-model="value" :options="component?.options ?? []"
    option-label="label" option-value="value" show-clear :filter="component?.filterable"
    class="w-full" size="small"
  />

  <div v-else-if="kind === 'boolean'" class="flex items-center h-full">
    <ToggleSwitch v-model="value" />
  </div>

  <DatePicker
    v-else-if="kind === 'date'"
    v-model="dateValue" class="w-full" size="small" show-icon
    :date-format="component?.format" :min-date="minDate" :max-date="maxDate"
  />

  <InputText
    v-else
    v-model="value" class="w-full" size="small" :placeholder="component?.placeholder"
    :minlength="component?.minLength" :maxlength="component?.maxLength"
  />
</template>
