<script setup lang="ts">
import { ref } from 'vue';
import { Button, Select, Message } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { $api } from '@services/api';
import type { TestResult } from '@services/DatasourcesService';

const props = defineProps<{
  editingId: string | null;
  datasourceKey: string;
  parsedOperationKeys: string[];
  isDark: boolean;
}>();

function parseJson<T>(text: string, errorRef: { value: string }, fallback: T): T | null {
  const raw = (text ?? '').trim();
  if (!raw) { errorRef.value = ''; return fallback; }
  try {
    errorRef.value = '';
    return JSON.parse(raw) as T;
  } catch (e: any) {
    errorRef.value = e?.message ?? 'Invalid JSON';
    return null;
  }
}

const testOperation  = ref('');
const testInputJson  = ref('{\n  "filters": { "search": "ABC" },\n  "limit": 5,\n  "offset": 0\n}');
const testRunning    = ref(false);
const testResult     = ref<TestResult | null>(null);
const testInputError = ref('');

function reset() {
  testOperation.value = '';
  testResult.value = null;
  testInputError.value = '';
}

defineExpose({ reset });

async function runTest() {
  if (!props.editingId) return;
  const input = parseJson<Record<string, any>>(testInputJson.value, testInputError, {});
  if (input === null) return;

  testRunning.value = true;
  try {
    testResult.value = await $api.datasources.test(props.datasourceKey, testOperation.value, input);
  } catch (err: any) {
    testResult.value = { ok: false, error: err?.response?.data?.message ?? 'Request failed' };
  } finally {
    testRunning.value = false;
  }
}

const pretty = (v: any) => JSON.stringify(v, null, 2);
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Test</h3>
      <div v-if="!editingId" class="text-xs text-surface-400 mb-2">
        Save the datasource first — the test runs against the stored declaration.
      </div>
      <div class="flex gap-2 items-start">
        <Select v-model="testOperation" :options="parsedOperationKeys" placeholder="operation"
                size="small" style="width: 12rem" :disabled="!editingId" />
        <div class="flex-1" style="height: 150px">
          <JsonEditor
            v-model:text="testInputJson"
            mode="text"
            :dark-theme="isDark"
            :main-menu-bar="false"
            :navigation-bar="false"
            style="height: 100%"
            @update:text="testInputError = ''"
          />
        </div>
        <Button label="Run" icon="pi pi-play" size="small" :loading="testRunning"
                :disabled="!editingId || !testOperation" @click="runTest" />
      </div>
      <Message v-if="testInputError" severity="error" size="small" class="mt-1" :closable="false">{{ testInputError }}</Message>

      <div v-if="testResult" class="mt-3">
        <Message v-if="!testResult.ok" severity="error" size="small" :closable="false">
          {{ testResult.error }}
        </Message>

        <div v-if="testResult.trace" class="grid grid-cols-2 gap-3 mt-2">
          <div>
            <div class="text-xs font-medium mb-1">Request sent</div>
            <pre class="text-[11px] bg-surface-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-60">{{ testResult.trace.request.method }} {{ testResult.trace.request.url }}
{{ pretty({ params: testResult.trace.request.params, headers: testResult.trace.request.headers }) }}</pre>
          </div>
          <div>
            <div class="text-xs font-medium mb-1">Raw response ({{ testResult.trace.response.status }})</div>
            <pre class="text-[11px] bg-surface-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-60">{{ pretty(testResult.trace.response.headers) }}
{{ pretty(testResult.trace.response.body) }}</pre>
          </div>
        </div>

        <div v-if="testResult.result" class="mt-2">
          <div class="text-xs font-medium mb-1">Mapped result</div>
          <pre class="text-[11px] bg-surface-100 dark:bg-zinc-900 p-2 rounded overflow-auto max-h-48">{{ pretty(testResult.result) }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>
