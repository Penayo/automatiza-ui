<script setup lang="ts">
import { Message } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';

defineProps<{
  /** Shown as the resource segment paths track — see the dialog's renameResourceSegment. */
  datasourceKey: string;
  isDark: boolean;
}>();

const operationsJson = defineModel<string>('operationsJson', { required: true });
const jsonError      = defineModel<string>('jsonError', { required: true });
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Operations</h3>
      <div style="height: 380px">
        <JsonEditor
          v-model:text="operationsJson"
          mode="text"
          :dark-theme="isDark"
          :main-menu-bar="false"
          :navigation-bar="false"
          style="height: 100%"
          @update:text="jsonError = ''"
        />
      </div>
      <Message v-if="jsonError" severity="error" size="small" class="mt-1" :closable="false">{{ jsonError }}</Message>
      <small v-else class="text-surface-400 block">
        JSON array. Each operation needs <code>key</code>, <code>kind</code> (query/single/write),
        <code>method</code>, <code>path</code>, and — for reads — a <code>result</code> mapping.
      </small>
      <small class="text-surface-400 block mt-1">
        <template v-if="datasourceKey">
          Path segments reading <code>/{{ datasourceKey }}</code> follow the datasource key when it is
          renamed on the General tab; any other segment is left as typed.
        </template>
        <template v-else>Set a key on the General tab and these paths will follow it.</template>
      </small>
    </div>
  </div>
</template>
