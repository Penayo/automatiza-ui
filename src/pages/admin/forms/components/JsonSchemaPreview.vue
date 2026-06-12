<script setup lang="ts">
import VueForm from '@lljj/vue3-form-element';
import 'element-plus/dist/index.css';
import { ElConfigProvider } from 'element-plus';
import en from 'element-plus/es/locale/lang/en';
import { Button } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { ref, computed, watch, onMounted, onErrorCaptured, provide } from 'vue';
import DocReviewWidget from '@components/widgets/DocReviewWidget.vue';

const { isDark } = useTheme();

// @lljj/vue3-form-element has an internal null-component vnode issue on reactive
// prop updates with current Vue 3 — catch and suppress so the form still works.
onErrorCaptured((err) => {
    if (err instanceof TypeError && err.message.includes('emitsOptions')) return false;
    return true;
});
import { $api } from '@services/api';
import type { FormVariable } from '@services/FormVariablesService';
import { useTheme } from '@/composables/useTheme';

const props = defineProps<{
    schema:      Record<string, any>;
    uiSchema:    Record<string, any>;
    errorSchema?: Record<string, any>;
}>();

const emit = defineEmits<{ submit: [data: Record<string, any>] }>();

// ── Viewport ──────────────────────────────────────────────────────────────────
type Viewport = 'mobile' | 'tablet' | 'desktop';
const viewport = ref<Viewport>('desktop');

const viewports: { key: Viewport; icon: string; label: string; width: string }[] = [
    { key: 'mobile',  icon: 'pi-mobile',  label: 'Mobile',  width: '390px'  },
    { key: 'tablet',  icon: 'pi-tablet',  label: 'Tablet',  width: '768px'  },
    { key: 'desktop', icon: 'pi-desktop', label: 'Desktop', width: '100%'   },
];

const currentViewport = computed(() => viewports.find(v => v.key === viewport.value)!);

// ── Form variables ────────────────────────────────────────────────────────────
const formVars        = ref<FormVariable[]>([]);
const formVarsLoading = ref(false);

async function loadFormVars() {
    formVarsLoading.value = true;
    try {
        formVars.value = await $api.formVariables.getAll();
        mergeContext(Object.fromEntries(formVars.value.map(v => [v.key, v.items])));
    } catch {
        // non-critical — preview still works without variables
    } finally {
        formVarsLoading.value = false;
    }
}

// ── Form data — single source of truth ───────────────────────────────────────
const formData     = ref<Record<string, any>>({});
const formDataText = ref('{}');
const jsonError    = ref('');
let programmaticUpdate = false;

function mergeContext(ctx: Record<string, any>) {
    programmaticUpdate = true;
    formData.value = { ...ctx, ...formData.value };
    formDataText.value = JSON.stringify(formData.value, null, 2);
    programmaticUpdate = false;
}

watch(formData, (val) => {
    if (programmaticUpdate) return;
    formDataText.value = JSON.stringify(val, null, 2);
}, { deep: true });

function applyJsonText() {
    try {
        const parsed = JSON.parse(formDataText.value);
        jsonError.value = '';
        programmaticUpdate = true;
        formData.value = parsed;
        programmaticUpdate = false;
    } catch (err: any) {
        jsonError.value = err?.message ?? 'Invalid JSON';
    }
}

function resetData() {
    programmaticUpdate = true;
    formData.value = {};
    programmaticUpdate = false;
    formDataText.value = '{}';
    jsonError.value = '';
    mergeContext(Object.fromEntries(formVars.value.map(v => [v.key, v.items])));
}

watch(() => props.schema, () => { resetData(); }, { deep: true });

function onSubmit() { emit('submit', formData.value); }

// ── Custom field resolution ───────────────────────────────────────────────────
// Replace "ui:field": "ComponentName" strings with actual component objects so
// lljj never has to call resolveComponent() — avoids all registration issues.
const CUSTOM_FIELDS: Record<string, object> = { DocReviewWidget };

function resolveCustomFields(uiSchema: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(uiSchema)) {
        if (key === 'ui:field' && typeof val === 'string' && CUSTOM_FIELDS[val]) {
            out[key] = CUSTOM_FIELDS[val];
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
            out[key] = resolveCustomFields(val);
        } else {
            out[key] = val;
        }
    }
    return out;
}

const resolvedUiSchema = computed(() => {
    const result = resolveCustomFields(props.uiSchema);
    console.log('[JsonSchemaPreview] raw uiSchema:', JSON.parse(JSON.stringify(props.uiSchema)));
    console.log('[JsonSchemaPreview] confirmedDocs ui:field value:', result?.confirmedDocs?.['ui:field']);
    console.log('[JsonSchemaPreview] confirmedDocs ui:field type:', typeof result?.confirmedDocs?.['ui:field']);
    return result;
});

// Provide formData so DocReviewWidget can inject it directly
provide('jsfFormData', formData);

onMounted(loadFormVars);
</script>

<template>
    <div class="flex flex-col h-full overflow-hidden">

        <!-- ── Preview toolbar ──────────────────────────────────────────────── -->
        <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 bg-white dark:bg-zinc-950 shrink-0">

            <!-- Viewport switcher -->
            <div class="flex items-center gap-1 bg-surface-100 dark:bg-zinc-800 rounded-lg p-1">
                <button
                    v-for="vp in viewports"
                    :key="vp.key"
                    @click="viewport = vp.key"
                    class="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                    :class="viewport === vp.key
                        ? 'bg-white dark:bg-zinc-700 text-surface-900 dark:text-white shadow-sm'
                        : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'"
                    :title="vp.label"
                >
                    <i :class="'pi ' + vp.icon" style="font-size: 0.8rem" />
                    <span class="hidden sm:inline">{{ vp.label }}</span>
                </button>
            </div>

            <!-- Width badge -->
            <span class="text-xs font-mono text-surface-400">
                {{ viewport === 'desktop' ? 'full width' : currentViewport.width }}
            </span>
        </div>

        <!-- ── Main area ─────────────────────────────────────────────────────── -->
        <div class="flex flex-1 min-h-0 overflow-hidden">

            <!-- Form data panel — left side, matching form-js preview layout -->
            <div
                class="flex flex-col border-r border-surface-200 dark:border-surface-700 shrink-0 overflow-hidden"
                style="width: 300px;"
            >
                <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold uppercase tracking-wide opacity-60">Form Data</span>
                        <span
                            v-if="formVars.length"
                            class="text-xs px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300 cursor-default"
                            v-tooltip.bottom="`Loaded ${formVars.length} form variable(s): ${formVars.map(v => v.key).join(', ')}`"
                        >
                            <i class="pi pi-database" style="font-size: 0.65rem" />
                            {{ formVars.length }}
                        </span>
                        <i v-if="formVarsLoading" class="pi pi-spin pi-spinner text-surface-400" style="font-size: 0.7rem" />
                    </div>
                    <div class="flex gap-1">
                        <Button label="Apply" size="small" @click="applyJsonText" v-tooltip.left="'Push JSON into form'" />
                        <Button icon="pi pi-refresh" size="small" severity="secondary" text rounded @click="resetData" v-tooltip.left="'Reset to variables'" />
                    </div>
                </div>

                <p v-if="jsonError" class="text-xs text-red-500 px-4 py-1 shrink-0">{{ jsonError }}</p>

                <p class="text-xs text-surface-400 px-4 pt-2 pb-1 shrink-0 leading-snug">
                    Prefill the form or observe live output. Form variables are auto-loaded as context.
                </p>

                <JsonEditor
                    v-model:text="formDataText"
                    mode="text"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    style="flex: 1; min-height: 0;"
                    @update:text="formDataText = $event"
                    :darkTheme="isDark"
                />
            </div>

            <!-- Live form preview -->
            <div class="flex-1 min-w-0 overflow-y-auto bg-surface-50 dark:bg-zinc-900 jsf-preview-root"
                 :class="viewport !== 'desktop' ? 'p-6' : 'p-6'">

                <!-- Device frame for mobile/tablet -->
                <div
                    class="mx-auto transition-all duration-300 ease-in-out"
                    :class="viewport !== 'desktop' ? 'rounded-xl border-2 border-surface-300 dark:border-zinc-600 shadow-xl bg-white dark:bg-zinc-950 overflow-hidden' : ''"
                    :style="viewport !== 'desktop'
                        ? `width: ${currentViewport.width}; max-width: 100%;`
                        : 'max-width: 800px;'"
                >
                    <!-- Device top bar (mobile/tablet only) -->
                    <div
                        v-if="viewport !== 'desktop'"
                        class="flex items-center justify-center py-2 border-b border-surface-200 dark:border-zinc-700 shrink-0"
                    >
                        <div class="w-16 h-1.5 rounded-full bg-surface-300 dark:bg-zinc-600" />
                    </div>

                    <div :class="viewport !== 'desktop' ? 'p-4' : ''">
                        <ElConfigProvider :locale="en">
                            <VueForm
                                v-model="formData"
                                :schema="schema"
                                :ui-schema="resolvedUiSchema"
                                :error-schema="errorSchema ?? {}"
                                :form-footer="{ show: false }"
                                @submit="onSubmit"
                            />
                        </ElConfigProvider>
                    </div>
                </div>
            </div>

        </div>
    </div>
</template>

<style>
.jsf-preview-root {
    font-family: inherit;
}

.jsf-preview-root .el-form-item__label {
    font-size: 0.875rem;
}

.jsf-preview-root .el-button--primary {
    --el-button-bg-color: #0f62fe;
    --el-button-border-color: #0f62fe;
    --el-button-hover-bg-color: #0353e9;
    --el-button-hover-border-color: #0353e9;
}

/* ── Dark mode overrides for Element Plus inside the preview ─────────────── */
.dark .jsf-preview-root {
    /* Text */
    --el-text-color-primary:     #e4e4e7;
    --el-text-color-regular:     #d4d4d8;
    --el-text-color-secondary:   #a1a1aa;
    --el-text-color-placeholder: #71717a;
    --el-text-color-disabled:    #52525b;

    /* Backgrounds */
    --el-bg-color:               #18181b;
    --el-bg-color-page:          #09090b;
    --el-bg-color-overlay:       #27272a;

    /* Borders */
    --el-border-color:           #3f3f46;
    --el-border-color-light:     #52525b;
    --el-border-color-lighter:   #3f3f46;
    --el-border-color-extra-light:#27272a;
    --el-border-color-dark:      #71717a;

    /* Fill (input backgrounds, tags, etc.) */
    --el-fill-color:             #27272a;
    --el-fill-color-light:       #3f3f46;
    --el-fill-color-lighter:     #27272a;
    --el-fill-color-extra-light: #18181b;
    --el-fill-color-dark:        #52525b;
    --el-fill-color-darker:      #71717a;
    --el-fill-color-blank:       #27272a;

    /* Input specific */
    --el-input-text-color:       #e4e4e7;
    --el-input-bg-color:         #27272a;
    --el-input-border-color:     #52525b;
    --el-input-hover-border-color: #71717a;
    --el-input-focus-border-color: #818cf8;

    /* Select dropdown */
    --el-select-option-hover-bg: #3f3f46;

    /* Mask / overlay */
    --el-mask-color:             rgba(0,0,0,0.6);
    --el-mask-color-extra-light: rgba(0,0,0,0.3);

    /* Box shadow */
    --el-box-shadow:             0 4px 6px -1px rgba(0,0,0,0.4), 0 2px 4px -1px rgba(0,0,0,0.3);
    --el-box-shadow-light:       0 2px 4px rgba(0,0,0,0.3);
    --el-box-shadow-lighter:     0 2px 8px rgba(0,0,0,0.25);
    --el-box-shadow-dark:        0 8px 16px rgba(0,0,0,0.5);

    /* Disabled state */
    --el-disabled-bg-color:      #27272a;
    --el-disabled-border-color:  #3f3f46;
    --el-disabled-text-color:    #52525b;
}

/* Input wrapper background (the visible box) */
.dark .jsf-preview-root .el-input__wrapper,
.dark .jsf-preview-root .el-textarea__inner {
    background-color: #27272a;
    box-shadow: 0 0 0 1px #52525b inset;
}

.dark .jsf-preview-root .el-input__wrapper:hover,
.dark .jsf-preview-root .el-textarea__inner:hover {
    box-shadow: 0 0 0 1px #71717a inset;
}

.dark .jsf-preview-root .el-input__wrapper.is-focus,
.dark .jsf-preview-root .el-textarea__inner:focus {
    box-shadow: 0 0 0 1px #818cf8 inset;
}

/* Select dropdown panel */
.dark .el-select-dropdown {
    background-color: #27272a;
    border-color: #3f3f46;
}

.dark .el-select-dropdown__item {
    color: #d4d4d8;
}

.dark .el-select-dropdown__item:hover,
.dark .el-select-dropdown__item.hover {
    background-color: #3f3f46;
}

.dark .el-select-dropdown__item.selected {
    color: #818cf8;
}

/* Popper / date-picker popups */
.dark .el-popper {
    background: #27272a;
    border-color: #3f3f46;
    color: #d4d4d8;
}

.dark .el-popper__arrow::before {
    background: #27272a;
    border-color: #3f3f46;
}
</style>
