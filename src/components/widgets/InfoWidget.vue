<!--
  InfoWidget — read-only display of a field's value.

  Register as:  "ui:widget": "InfoWidget"

  Renders the bound value as text instead of an input. The surrounding
  el-form-item still draws the label; this widget restyles it (bold, muted) so
  the label reads clearly against the value, and by default pulls it onto the
  same line. Nothing is ever written back — the value shown is whatever the
  form data (task variables, process context, prefilled JSON) already holds.

  ui:options
  ──────────
  layout     ("inline" | "stacked", default "inline")
             "inline"  → Label： Value   on one line
             "stacked" → label above the value (the normal form layout)

  labelWidth (string, e.g. "160px")
             Handled by lljj itself, but worth knowing: set it on every info
             field of a group to line the inline values up in a column.

  emptyText  (string, default "—")
             Shown when the value is null / undefined / empty string.

  prefix     (string, default "")
  suffix     (string, default "")
             Static text placed before / after the value (e.g. suffix: " kg").

  copyable   (boolean, default false)
             Adds a small copy-to-clipboard button next to the value.
-->
<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  modelValue?: any;
  layout?:     'inline' | 'stacked';
  emptyText?:  string;
  prefix?:     string;
  suffix?:     string;
  copyable?:   boolean;
}>();

// lljj passes ui:options through as plain props, so they arrive already
// flattened above. Only formatting of the value itself is left to do.
const display = computed(() => {
  const v = props.modelValue;
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.map(i => (i && typeof i === 'object' ? JSON.stringify(i) : String(i))).join(', ');
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
});

const isEmpty     = computed(() => display.value === null);
const isMultiline = computed(() => !!display.value && display.value.includes('\n'));

const copied = ref(false);
async function copy() {
  if (!display.value) return;
  try {
    await navigator.clipboard.writeText(display.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  } catch {
    // clipboard unavailable (non-secure context) — silently ignore
  }
}
</script>

<template>
  <div
    class="info-widget"
    :class="layout === 'stacked' ? 'info-widget--stacked' : 'info-widget--inline'"
  >
    <span v-if="isEmpty" class="info-widget__empty">{{ emptyText ?? '—' }}</span>

    <component
      v-else
      :is="isMultiline ? 'pre' : 'span'"
      class="info-widget__value"
      :class="isMultiline ? 'info-widget__value--multiline' : ''"
    >{{ prefix ?? '' }}{{ display }}{{ suffix ?? '' }}</component>

    <button
      v-if="copyable && !isEmpty"
      type="button"
      class="info-widget__copy"
      :title="copied ? 'Copied' : 'Copy'"
      @click="copy"
    >
      <i :class="['pi', copied ? 'pi-check' : 'pi-copy']" style="font-size: 0.75rem" />
    </button>
  </div>
</template>

<!--
  Not scoped: the label lives in the parent el-form-item, outside this
  component's DOM. Every selector is anchored on .info-widget, so nothing here
  reaches form items that don't host one.
-->
<style>
.info-widget {
    display:     flex;
    align-items: baseline;
    gap:         6px;
    min-width:   0;
    line-height: 22px;
}

.info-widget__value {
    min-width:   0;
    font-size:   14px;
    color:       var(--el-text-color-primary, #303133);
    word-break:  break-word;
}

.info-widget__value--multiline {
    margin:      0;
    white-space: pre-wrap;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size:   13px;
}

.info-widget__empty {
    font-size:   14px;
    font-style:  italic;
    color:       var(--el-text-color-placeholder, #a8abb2);
}

.info-widget__copy {
    flex-shrink: 0;
    opacity:     0.45;
    transition:  opacity 0.15s;
}

.info-widget__copy:hover {
    opacity: 1;
}

/* ── Label: bold + muted, so it reads apart from the value ──────────────── */
.el-form-item:has(> .el-form-item__content > .info-widget) > .el-form-item__label,
.el-form-item:has(> .el-form-item__content > .info-widget) > .el-form-item__label-wrap > .el-form-item__label {
    font-weight: 600;
    color:       var(--el-text-color-secondary, #909399);
}

/* ── Inline layout: undo the label-top stacking for this item only ──────── */
.el-form-item:has(> .el-form-item__content > .info-widget--inline) {
    display:       flex;
    align-items:   baseline;
    margin-bottom: 10px;
}

.el-form-item:has(> .el-form-item__content > .info-widget--inline) > .el-form-item__label {
    display:       inline-flex;
    height:        auto;
    margin-bottom: 0;
    padding-right: 6px;
    line-height:   22px;
}

.el-form-item:has(> .el-form-item__content > .info-widget--inline) > .el-form-item__content {
    line-height: 22px;
}
</style>
