<script setup lang="ts">
/**
 * Renders one field's value per its declared `FieldDisplay` (datasources.spec.md §6) —
 * shared by the browse grid (Browse.vue) and the standalone details page (Detail.vue) so
 * both contexts render identically even though their index/view configs are separate.
 */
import { computed } from 'vue';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Tag, Badge, ProgressBar } from 'primevue';
import type { FieldDisplay } from '@services/DatasourcesService';

dayjs.extend(relativeTime);

const props = defineProps<{
  value: any;
  display?: FieldDisplay;
  /** The full record — link/image templates may reference other fields via {{record.x}}. */
  record?: Record<string, any>;
}>();

function formatPlain(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** `{{value}}` / `{{record.otherField}}` — no scripting, just the two placeholders §6 needs. */
function substitute(template: string): string {
  return template.replace(/\{\{\s*(value|record\.[\w.]+)\s*\}\}/g, (_m, expr: string) => {
    if (expr === 'value') return String(props.value ?? '');
    const path = expr.slice('record.'.length).split('.');
    let cur: any = props.record;
    for (const key of path) cur = cur?.[key];
    return cur === undefined || cur === null ? '' : String(cur);
  });
}

const kind = computed(() => props.display?.kind ?? 'text');

const severity = computed(() => {
  const map = props.display?.severityMap ?? {};
  return map[String(props.value)] ?? props.display?.defaultSeverity ?? 'secondary';
});

const dateText = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') return '—';
  const d = dayjs(props.value);
  if (!d.isValid()) return formatPlain(props.value);
  return props.display?.relative ? d.fromNow() : d.format(props.display?.format ?? 'YYYY-MM-DD');
});

const numberText = computed(() => {
  const n = Number(props.value);
  if (props.value === null || props.value === undefined || props.value === '' || Number.isNaN(n)) return '—';
  const opts: Intl.NumberFormatOptions = { maximumFractionDigits: props.display?.decimals ?? 2, minimumFractionDigits: props.display?.decimals };
  if (props.display?.style === 'currency') { opts.style = 'currency'; opts.currency = props.display.currency ?? 'USD'; }
  else if (props.display?.style === 'percent') opts.style = 'percent';
  return new Intl.NumberFormat(undefined, opts).format(n);
});

const href = computed(() => (props.display?.hrefTemplate ? substitute(props.display.hrefTemplate) : '#'));
const linkLabel = computed(() => (props.display?.label ? substitute(props.display.label) : formatPlain(props.value)));
const imgSrc = computed(() => (props.display?.srcTemplate ? substitute(props.display.srcTemplate) : ''));

const plainText = computed(() => formatPlain(props.value));

const progressPercent = computed(() => {
  const n = Number(props.value) || 0;
  const max = props.display?.max ?? 100;
  return Math.min(100, Math.max(0, max > 0 ? (n / max) * 100 : 0));
});
</script>

<template>
  <span v-if="kind === 'tag'"><Tag :value="plainText" :severity="severity" /></span>
  <span v-else-if="kind === 'badge'"><Badge :value="plainText" :severity="severity" /></span>

  <span v-else-if="kind === 'boolean'" class="text-sm">
    <i v-if="value === true" class="pi pi-check text-green-600" />
    <i v-else-if="value === false" class="pi pi-times text-red-500" />
    <template v-else>{{ plainText }}</template>
    <span v-if="value === true && display?.trueLabel" class="ml-1">{{ display.trueLabel }}</span>
    <span v-else-if="value === false && display?.falseLabel" class="ml-1">{{ display.falseLabel }}</span>
  </span>

  <span v-else-if="kind === 'date'" class="text-sm">{{ dateText }}</span>
  <span v-else-if="kind === 'number'" class="text-sm">{{ numberText }}</span>

  <a
    v-else-if="kind === 'link'"
    :href="href"
    :target="display?.target ?? '_blank'"
    rel="noopener"
    class="text-sm text-primary underline hover:no-underline"
  >{{ linkLabel }}</a>

  <img
    v-else-if="kind === 'image' && imgSrc"
    :src="imgSrc"
    :width="display?.width"
    :height="display?.height"
    class="rounded object-cover"
    :alt="plainText"
  />

  <div v-else-if="kind === 'progress'" style="min-width: 8rem">
    <ProgressBar :value="progressPercent" :show-value="true" style="height: 1rem" />
  </div>

  <span
    v-else
    class="text-sm wrap-break-word"
    :class="{ 'font-mono': display?.monospace, truncate: display?.truncate }"
  >{{ plainText }}</span>
</template>
