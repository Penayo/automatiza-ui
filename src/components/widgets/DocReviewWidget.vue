<!--
  DocReviewWidget — JSON-Schema UI field for reviewing uploaded documents.

  Register as:  "ui:field": "DocReviewWidget"

  ui:options
  ──────────
  docsKey    (string, default "docs")
             Dot-path into formData that holds the documents object.
             Example: "uploadedDocuments" or "nested.uploadedDocuments"

  urlField   (string, default "url")
             Property name on each doc entry that holds the signed download URL.

  nameField  (string, default "name")
             Property name on each doc entry that holds the display filename.

  keyField   (string, default "key")
             Property name on each doc entry that holds the R2 object key
             (used to refresh expired signed URLs).

  checkLabel (string, default "Correct?")
             Label shown next to each checkbox.

  Expected formData shape
  ───────────────────────
  The value at docsKey must be an object whose keys are document identifiers
  and whose values each contain at minimum the fields named by urlField,
  nameField, and keyField:

    uploadedDocuments: {
      nacional_id: {
        signedUrl: "https://…?X-Amz-Date=…&X-Amz-Expires=…",
        filename:  "national_id.pdf",
        key:       "tenant/instance-id/nacional_id.pdf"
      },
      business_fundation: {
        signedUrl: "https://…?X-Amz-Date=…&X-Amz-Expires=…",
        filename:  "business_foundation.pdf",
        key:       "tenant/instance-id/business_fundation.pdf"
      }
    }

  Field output value
  ──────────────────
  The widget writes a per-key boolean map back to rootFormData at curNodePath:

    { "nacional_id": true, "business_fundation": false }

  Expired URLs
  ────────────
  If any signed URL is expired (X-Amz-Date + X-Amz-Expires in the past), a
  banner appears with a "Refresh links" button that calls
  $api.files.refreshSignedUrls({ docKey → r2ObjectKey }) and patches the URLs
  in place. Expired documents cannot be checked until their link is refreshed.
-->
<script setup lang="ts">
import { computed, inject, ref, onMounted, watch, type Ref } from 'vue';
import { ElCheckbox } from 'element-plus';
import { $api } from '@services/api';

const props = defineProps<{
  curNodePath:  string;
  rootFormData: Record<string, any>;
  uiSchema:     Record<string, any>;
  schema:       Record<string, any>;
  disabled?:    boolean;
  readonly?:    boolean;
}>();

console.log('[DocReviewWidget] setup — props received:', {
  curNodePath:  props.curNodePath,
  rootFormData: JSON.parse(JSON.stringify(props.rootFormData ?? {})),
  uiSchema:     props.uiSchema,
  schema:       props.schema,
});

onMounted(() => {
  console.log('[DocReviewWidget] mounted ✓');
  console.log('[DocReviewWidget] jsfFormData at mount:', JSON.parse(JSON.stringify(jsfFormData.value)));
  console.log('[DocReviewWidget] docs at mount:', docs.value);
});

const jsfFormData   = inject<Ref<Record<string, any>>>('jsfFormData', ref({}));
const formDisabled  = inject<Ref<boolean>>('formDisabled', ref(false));

console.log('[DocReviewWidget] jsfFormData injected (is default ref?):', !inject('jsfFormData'));

const opts = computed(() => (props.uiSchema?.['ui:options'] ?? {}) as {
  docsKey?:    string;
  urlField?:   string;
  nameField?:  string;
  keyField?:   string;   // R2 object key field (default: "key")
  checkLabel?: string;
});

function resolveDotPath(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((acc: any, k) => acc?.[k], obj);
}

const docs = computed(() => {
  const key = opts.value.docsKey ?? 'docs';
  const raw = resolveDotPath(jsfFormData.value, key) ?? {};
  console.log('[DocReviewWidget] docs computed — key:', key, '| raw:', raw);
  return Object.entries(raw) as [string, Record<string, any>][];
});

watch(jsfFormData, (val) => {
  console.log('[DocReviewWidget] jsfFormData changed:', JSON.parse(JSON.stringify(val)));
}, { deep: true });

const urlField   = computed(() => opts.value.urlField   ?? 'url');
const nameField  = computed(() => opts.value.nameField  ?? 'name');
const keyField   = computed(() => opts.value.keyField   ?? 'key');
const checkLabel = computed(() => opts.value.checkLabel ?? 'Correct?');

function isUrlExpired(url: string): boolean {
  try {
    const u = new URL(url);
    const date    = u.searchParams.get('X-Amz-Date');
    const expires = u.searchParams.get('X-Amz-Expires');
    if (!date || !expires) return false;
    const signed = Date.parse(
      date.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, '$1-$2-$3T$4:$5:$6Z')
    );
    return Date.now() > signed + Number(expires) * 1000;
  } catch {
    return false;
  }
}

const hasExpired = computed(() =>
  docs.value.some(([, doc]) => isUrlExpired(doc[urlField.value] ?? ''))
);

const refreshing = ref(false);

async function refreshExpiredLinks() {
  const docsKey = opts.value.docsKey ?? 'docs';
  // Build { docKey → R2ObjectKey } only for expired docs
  const keysToRefresh: Record<string, string> = {};
  for (const [docKey, doc] of docs.value) {
    if (isUrlExpired(doc[urlField.value] ?? '')) {
      const objectKey = doc[keyField.value];
      if (objectKey) keysToRefresh[docKey] = objectKey;
    }
  }
  if (!Object.keys(keysToRefresh).length) return;

  refreshing.value = true;
  try {
    const fresh = await $api.files.refreshSignedUrls(keysToRefresh);
    // Patch jsfFormData in place so the widget re-renders
    const target = resolveDotPath(jsfFormData.value, docsKey);
    if (target) {
      for (const [docKey, signedUrl] of Object.entries(fresh)) {
        if (target[docKey]) target[docKey][urlField.value] = signedUrl;
      }
    }
  } finally {
    refreshing.value = false;
  }
}

const confirmed = computed((): Record<string, boolean> => {
  if (!props.curNodePath) return props.rootFormData as Record<string, boolean>;
  return resolveDotPath(props.rootFormData, props.curNodePath) ?? {};
});

function toggle(docKey: string, checked: boolean | string | number) {
  const parts = props.curNodePath ? props.curNodePath.split('.') : [];
  let obj: any = props.rootFormData;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj[parts[i]]) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (!obj[last]) obj[last] = {};
  obj[last][docKey] = Boolean(checked);
}
</script>

<template>
  <div style="margin-bottom: 15px;">

    <!-- Field title (lljj skips this when ui:field is used) -->
    <div v-if="schema?.title" class="text-sm font-medium mb-2" style="color: var(--el-text-color-regular, #606266);">
      {{ schema.title }}
    </div>

    <!-- Expired-links banner -->
    <div
      v-if="hasExpired"
      class="flex items-center justify-between gap-3 px-3 py-2 mb-1 rounded border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-700 dark:text-orange-300"
    >
      <span class="flex items-center gap-1.5">
        <i class="pi pi-exclamation-triangle" style="font-size: 0.75rem" />
        Some file links have expired and can no longer be opened.
      </span>
      <button
        class="flex items-center gap-1 px-2 py-1 rounded bg-orange-100 dark:bg-orange-800/60 hover:bg-orange-200 dark:hover:bg-orange-700/60 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="refreshing"
        @click="refreshExpiredLinks"
      >
        <i :class="['pi', refreshing ? 'pi-spin pi-spinner' : 'pi-refresh']" style="font-size: 0.7rem" />
        {{ refreshing ? 'Refreshing…' : 'Refresh links' }}
      </button>
    </div>

    <!-- Document rows -->
    <div class="flex flex-col divide-y divide-surface-200 dark:divide-zinc-700 rounded border border-surface-200 dark:border-zinc-700 overflow-hidden">
      <div
        v-for="[key, doc] in docs"
        :key="key"
        class="flex items-center justify-between gap-3 px-3 py-2 hover:bg-surface-50 dark:hover:bg-zinc-800 transition-colors"
      >
        <template v-if="isUrlExpired(doc[urlField] ?? '')">
          <span class="flex items-center gap-1.5 text-sm text-surface-400 dark:text-zinc-500 truncate">
            <i class="pi pi-file text-xs shrink-0" />
            {{ doc[nameField] ?? key }}
            <span class="ml-1 text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 shrink-0">
              Expired
            </span>
          </span>
        </template>
        <template v-else>
          <a
            :href="doc[urlField]"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate"
          >
            <i class="pi pi-file text-xs shrink-0" />
            {{ doc[nameField] ?? key }}
          </a>
        </template>

        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs text-surface-500 dark:text-zinc-400">{{ checkLabel }}</span>
          <ElCheckbox
            :model-value="confirmed[key] ?? false"
            :disabled="formDisabled || disabled || readonly || isUrlExpired(doc[urlField] ?? '')"
            @change="toggle(key, $event)"
          />
        </div>
      </div>

      <div v-if="!docs.length" class="px-3 py-3 text-sm text-surface-400 dark:text-zinc-500">
        No documents found — set <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-1 rounded">ui:options.docsKey</code> in UI Schema.
      </div>
    </div>
  </div>
</template>
