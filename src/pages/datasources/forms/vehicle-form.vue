<script setup lang="ts">
/**
 * Bespoke create form for a "vehicles" datasource — example of `result.formComponent`
 * (datasources.spec.md §10.6). Rendered by New.vue instead of the generic field grid when a
 * datasource's primary query operation sets `result.formComponent: "vehicle-form"`.
 *
 * Owns its own fields/layout/validation only — the create-proxy call, toast, and navigation
 * stay with New.vue, which listens for `submit`/`cancel`.
 */
import { ref } from 'vue';
import { InputText, Button, Message } from 'primevue';
import type { BrowsableOperation } from '@services/DatasourcesService';

const props = defineProps<{
  datasourceKey: string;
  operation: BrowsableOperation | null;
  saving: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', data: Record<string, any>): void;
  (e: 'cancel'): void;
}>();

const form = ref({
  plate: '',
  vin: '',
  make: '',
  model: '',
  ownerName: '',
});

const validationError = ref('');

/**
 * The remote's own property name for a mapped field (§6/§10.6 — submitted values are keyed by
 * `path`, not the local field name). Falls back to the field name itself when the datasource's
 * operation doesn't map it, so submit still sends something rather than silently dropping it.
 */
function pathFor(name: string): string {
  return props.operation?.fields.find(f => f.name === name)?.path ?? name;
}

function submit() {
  if (!form.value.plate.trim()) {
    validationError.value = 'Plate is required.';
    return;
  }
  validationError.value = '';

  const data: Record<string, any> = {};
  for (const [name, value] of Object.entries(form.value)) {
    if (value !== '') data[pathFor(name)] = value;
  }
  emit('submit', data);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <Message v-if="validationError" severity="error" :closable="false">{{ validationError }}</Message>

    <div class="rounded-lg border border-surface-200 dark:border-surface-700 p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-surface-500">Plate<span class="text-red-500">&nbsp;*</span></label>
        <InputText v-model="form.plate" size="small" placeholder="ABC123" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-surface-500">VIN</label>
        <InputText v-model="form.vin" size="small" class="font-mono" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-surface-500">Make</label>
        <InputText v-model="form.make" size="small" placeholder="Toyota" />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-xs text-surface-500">Model</label>
        <InputText v-model="form.model" size="small" placeholder="Corolla" />
      </div>
      <div class="flex flex-col gap-1 sm:col-span-2">
        <label class="text-xs text-surface-500">Owner</label>
        <InputText v-model="form.ownerName" size="small" />
      </div>
    </div>

    <div class="flex items-center gap-2 justify-end">
      <Button label="Cancel" text size="small" :disabled="saving" @click="emit('cancel')" />
      <Button label="Create" icon="pi pi-check" size="small" :loading="saving" @click="submit" />
    </div>
  </div>
</template>
