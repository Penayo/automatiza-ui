<script setup lang="ts">
import { computed } from 'vue';
import { Button, Select, Tag } from 'primevue';
import { DATASOURCE_PRESETS, findPreset } from '../presets';

const selectedPreset = defineModel<string | null>({ required: true });

const emit = defineEmits<{
  (e: 'apply', id: string | null): void;
}>();

const presetDetail = computed(() => findPreset(selectedPreset.value));
</script>

<template>
  <div class="rounded p-3" style="background: var(--p-content-hover-background)">
    <div class="flex items-end gap-3">
      <div class="flex-1">
        <label class="text-xs font-medium">Start from a preset</label>
        <Select
          v-model="selectedPreset" :options="DATASOURCE_PRESETS"
          optionLabel="name" optionValue="id" showClear
          placeholder="Choose an API flavour…" size="small" class="w-full"
        />
      </div>
      <Button label="Apply" icon="pi pi-bolt" size="small" :disabled="!selectedPreset"
              @click="emit('apply', selectedPreset)" />
    </div>

    <div v-if="presetDetail" class="mt-3 text-xs flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Tag :value="presetDetail.verified ? 'verified' : 'not verified'"
             :severity="presetDetail.verified ? 'success' : 'warn'" />
        <span class="text-surface-500">{{ presetDetail.verified ?? 'Written from documentation — confirm with Test before trusting it.' }}</span>
        <a v-if="presetDetail.docsUrl" :href="presetDetail.docsUrl" target="_blank"
           rel="noopener" class="ml-auto text-primary">API docs ↗</a>
      </div>
      <p class="text-surface-500">{{ presetDetail.description }}</p>
      <ul class="list-disc pl-4 text-surface-500 flex flex-col gap-0.5">
        <li v-for="(note, i) in presetDetail.notes" :key="i">{{ note }}</li>
      </ul>
      <p class="text-surface-400">
        Presets live in <code>src/pages/admin/datasources/presets/</code> — edit the JSON there to change one.
      </p>
    </div>
  </div>
</template>
