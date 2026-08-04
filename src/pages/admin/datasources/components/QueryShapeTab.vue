<script setup lang="ts">
import { InputText, Select, Message } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import type { SaveDatasourceDto } from '@services/DatasourcesService';

defineProps<{
  isDark: boolean;
}>();

const form               = defineModel<SaveDatasourceDto>('form', { required: true });
const paginationWireJson = defineModel<string>('paginationWireJson', { required: true });
const defaultHeadersJson = defineModel<string>('defaultHeadersJson', { required: true });
const wireError           = defineModel<string>('wireError', { required: true });
const headersError        = defineModel<string>('headersError', { required: true });

const FILTER_MODES = ['params', 'composed'];
const SORT_MODES   = ['none', 'param', 'params'];
const PAGE_STYLES  = ['page', 'offset', 'range', 'none'];
const TOTAL_FROM   = ['none', 'body', 'header'];
</script>

<template>
  <div class="flex flex-col gap-4">

    <!-- Filter style -->
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Filter Style</h3>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-medium">Mode</label>
          <Select v-model="form.filterStyle.mode" :options="FILTER_MODES" class="w-full" size="small" />
        </div>
        <template v-if="form.filterStyle.mode === 'composed'">
          <div>
            <label class="text-xs font-medium">Param</label>
            <InputText v-model="form.filterStyle.param" class="w-full" size="small" placeholder="where" />
          </div>
          <div>
            <label class="text-xs font-medium">Join</label>
            <InputText v-model="form.filterStyle.join" class="w-full" size="small" placeholder="~and" />
          </div>
        </template>
      </div>
      <small class="text-surface-400">
        <b>params</b> — one query param per filter, operator inside the value (PostgREST).
        <b>composed</b> — all filters merged into one param (NocoDB).
      </small>
    </div>

    <!-- Sort style -->
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Sort Style</h3>
      <div class="grid grid-cols-4 gap-3">
        <div>
          <label class="text-xs font-medium">Mode</label>
          <Select v-model="form.sortStyle!.mode" :options="SORT_MODES" class="w-full" size="small" />
        </div>
        <template v-if="form.sortStyle!.mode === 'param'">
          <div>
            <label class="text-xs font-medium">Param</label>
            <InputText v-model="form.sortStyle!.param" class="w-full" size="small" placeholder="order" />
          </div>
          <div>
            <label class="text-xs font-medium">Asc template</label>
            <InputText v-model="form.sortStyle!.asc" class="w-full" size="small" :placeholder="'{{field}}.asc'" />
          </div>
          <div>
            <label class="text-xs font-medium">Desc template</label>
            <InputText v-model="form.sortStyle!.desc" class="w-full" size="small" :placeholder="'{{field}}.desc'" />
          </div>
        </template>
        <template v-else-if="form.sortStyle!.mode === 'params'">
          <div>
            <label class="text-xs font-medium">Field param</label>
            <InputText v-model="form.sortStyle!.fieldParam" class="w-full" size="small" placeholder="sortBy" />
          </div>
          <div>
            <label class="text-xs font-medium">Dir param</label>
            <InputText v-model="form.sortStyle!.dirParam" class="w-full" size="small" placeholder="sortDir" />
          </div>
          <div>
            <label class="text-xs font-medium">Asc / Desc value</label>
            <div class="flex gap-1">
              <InputText v-model="form.sortStyle!.ascValue" class="w-full" size="small" placeholder="asc" />
              <InputText v-model="form.sortStyle!.descValue" class="w-full" size="small" placeholder="desc" />
            </div>
          </div>
        </template>
      </div>
      <small class="text-surface-400">
        <b>param</b> — one sort param, e.g. PostgREST <code>?order=age.desc</code>
        (asc template <span v-pre><code>{{field}}.asc</code></span>, NocoDB desc <span v-pre><code>-{{field}}</code></span>).
        <b>params</b> — two params, e.g. <code>?sortBy=age&sortDir=desc</code>. <b>none</b> — no sorting.
      </small>
    </div>

    <!-- Pagination -->
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Pagination</h3>
      <div class="grid grid-cols-3 gap-3">
        <div>
          <label class="text-xs font-medium">Style</label>
          <Select v-model="form.pagination.style" :options="PAGE_STYLES" class="w-full" size="small" />
        </div>
        <div>
          <label class="text-xs font-medium">Total from</label>
          <Select v-model="form.pagination.total!.from" :options="TOTAL_FROM" class="w-full" size="small" />
        </div>
        <div v-if="form.pagination.total?.from === 'body'">
          <label class="text-xs font-medium">Body path</label>
          <InputText v-model="form.pagination.total!.path" class="w-full" size="small" placeholder="pageInfo.totalRows" />
        </div>
        <template v-if="form.pagination.total?.from === 'header'">
          <div>
            <label class="text-xs font-medium">Header</label>
            <InputText v-model="form.pagination.total!.header" class="w-full" size="small" placeholder="Content-Range" />
          </div>
          <div>
            <label class="text-xs font-medium">Format</label>
            <Select v-model="form.pagination.total!.format" :options="['int', 'content-range']" class="w-full" size="small" />
          </div>
        </template>
      </div>
      <small class="text-surface-400">
        Style and total source are independent. <code>range</code> pages by request header;
        a total may still need <code>Prefer: count=exact</code> in the operation's request headers.
      </small>

      <div class="mt-3">
        <label class="text-xs font-medium">Wire config</label>
        <div style="height: 170px">
          <JsonEditor
            v-model:text="paginationWireJson"
            mode="text"
            :dark-theme="isDark"
            :main-menu-bar="false"
            :navigation-bar="false"
            style="height: 100%"
            @update:text="wireError = ''"
          />
        </div>
        <Message v-if="wireError" severity="error" size="small" class="mt-1" :closable="false">{{ wireError }}</Message>
        <!-- v-pre: the placeholder braces are literal text, not interpolation. -->
        <small v-else class="text-surface-400">
          <code>params</code> (page/offset styles), <code>headers</code> (range style),
          <code>requestHeaders</code> (sent to obtain a total). Placeholders:
          <span v-pre><code>{{page}}</code> <code>{{limit}}</code> <code>{{offset}}</code> <code>{{end}}</code></span>.
        </small>
      </div>
    </div>

    <!-- Default headers -->
    <div class="border-t pt-3">
      <h3 class="text-sm font-semibold mb-2">Default Headers</h3>
      <div style="height: 120px">
        <JsonEditor
          v-model:text="defaultHeadersJson"
          mode="text"
          :dark-theme="isDark"
          :main-menu-bar="false"
          :navigation-bar="false"
          style="height: 100%"
          @update:text="headersError = ''"
        />
      </div>
      <Message v-if="headersError" severity="error" size="small" class="mt-1" :closable="false">{{ headersError }}</Message>
      <small v-else class="text-surface-400">Applied to every operation; an operation's own headers win per key.</small>
    </div>

  </div>
</template>
