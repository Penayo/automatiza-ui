<script setup lang="ts">
import { InputText, InputNumber, Select, ToggleSwitch, Message } from 'primevue';
import type { SaveDatasourceDto } from '@services/DatasourcesService';

defineProps<{
  parsedOperationKeys: string[];
  /** Groups already in use — offered as suggestions; a new one is typed in directly. */
  groupOptions: string[];
}>();

const form = defineModel<SaveDatasourceDto>('form', { required: true });

const AUTH_TYPES = ['none', 'basic', 'bearer', 'apiKey'];
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Identity -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium">Key</label>
        <InputText v-model="form.key" class="w-full" size="small" placeholder="vehicles" />
        <small class="text-surface-400">Referenced by service tasks and lookup fields.</small>
      </div>
      <div>
        <label class="text-xs font-medium">Name</label>
        <InputText v-model="form.name" class="w-full" size="small" placeholder="Vehicles" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="text-xs font-medium">Group</label>
        <Select v-model="form.group" :options="groupOptions" editable class="w-full" size="small"
                showClear placeholder="car-shop" />
        <small class="text-surface-400">Groups this datasource in the Data menu. Leave empty for ungrouped.</small>
      </div>
      <div>
        <label class="text-xs font-medium">Description</label>
        <InputText v-model="form.description" class="w-full" size="small" placeholder="Vehicles registered in the shop" />
      </div>
    </div>

    <div>
      <label class="text-xs font-medium">Base URL</label>
      <InputText v-model="form.baseUrl" class="w-full" size="small" placeholder="https://api.example.com" />
      <small class="text-surface-400">
        Must be http(s). Hosts resolving to private or link-local addresses are blocked unless allowlisted.
      </small>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="text-xs font-medium">Timeout (ms)</label>
        <InputNumber v-model="form.timeoutMs" class="w-full" size="small" :min="1" :max="60000" />
      </div>
      <div>
        <label class="text-xs font-medium">Health Check Operation</label>
        <Select v-model="form.healthCheck" :options="parsedOperationKeys" class="w-full" size="small"
                showClear placeholder="none" />
      </div>
      <div class="flex items-end gap-2 pb-1">
        <ToggleSwitch v-model="form.enabled" />
        <span class="text-sm">Enabled</span>
      </div>
    </div>

    <!-- Auth -->
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Authentication</h3>
      <div class="grid grid-cols-3 gap-3">
        <Select v-model="form.auth.type" :options="AUTH_TYPES" size="small" class="w-full" />
        <template v-if="form.auth.type === 'apiKey'">
          <InputText v-model="form.auth.name" size="small" placeholder="header/param name" />
          <Select v-model="form.auth.apiKeyLocation" :options="['header', 'query']" size="small" />
        </template>
      </div>

      <div v-if="form.auth.type !== 'none'" class="grid grid-cols-2 gap-3 mt-3">
        <div v-if="form.auth.type === 'bearer'">
          <label class="text-xs font-medium">Token</label>
          <InputText v-model="form.auth.token" class="w-full" size="small" placeholder="secrets.MY_TOKEN" />
        </div>
        <div v-if="form.auth.type === 'apiKey'">
          <label class="text-xs font-medium">Value</label>
          <InputText v-model="form.auth.value" class="w-full" size="small" placeholder="secrets.MY_KEY" />
        </div>
        <template v-if="form.auth.type === 'basic'">
          <div>
            <label class="text-xs font-medium">Username</label>
            <InputText v-model="form.auth.username" class="w-full" size="small" placeholder="secrets.API_USER" />
          </div>
          <div>
            <label class="text-xs font-medium">Password</label>
            <InputText v-model="form.auth.password" class="w-full" size="small" placeholder="secrets.API_PASSWORD" />
          </div>
        </template>
      </div>

      <Message v-if="form.auth.type !== 'none'" severity="secondary" size="small" class="mt-2" :closable="false">
        Credentials are stored as <code>secrets.KEY</code> references only — a literal value is rejected.
      </Message>
    </div>

  </div>
</template>
