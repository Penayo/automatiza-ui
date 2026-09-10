<script setup lang="ts">
/**
 * The honest render: the whole compiled schema in one real Vueform instance, with
 * conditions and validation left on — unlike the canvas, which suppresses both.
 *
 * Mirrors the controls of the form-js preview tab (FormPreviewTab.vue): a viewport
 * selector, a task-variables editor to check that fields populate from process
 * variables, and a live view of what the form would submit.
 */
import { computed, ref, watch, nextTick } from 'vue';
import { Button, Select, SelectButton, Splitter, SplitterPanel } from 'primevue';
import JsonEditor from 'vue3-ts-jsoneditor';
import { useFormLocale } from '@/composables/useFormLocale';
import { resolveFormVariables } from '@/formbuilder/formVariables';
import type { VueformSchema, VueformSteps } from '@/formbuilder/types';

const props = defineProps<{ schema: VueformSchema; steps?: VueformSteps }>();

const { locale, locales } = useFormLocale();

// ── Viewport ──────────────────────────────────────────────────────────────────
type ViewMode = 'desktop' | 'tablet' | 'mobile';
const viewMode = ref<ViewMode>('desktop');
const viewOptions = [
    { value: 'desktop', icon: 'pi pi-desktop', label: 'Desktop' },
    { value: 'tablet',  icon: 'pi pi-tablet',  label: 'Tablet'  },
    { value: 'mobile',  icon: 'pi pi-mobile',  label: 'Mobile'  },
];
const canvasMaxWidth: Record<ViewMode, string> = {
    desktop: '100%', tablet: '768px', mobile: '390px',
};

// ── Form instance ─────────────────────────────────────────────────────────────
const taskVarsJson = ref('{\n  \n}');
const form$ = ref<any>(null);
const hasFields = computed(() => Object.keys(props.schema).length > 0);

/**
 * Form Variables are resolved from the task-variables editor, so pasting
 * {"countries": [...]} populates a dropdown exactly as the engine would at runtime.
 */
const previewVars = computed<Record<string, any>>(() => {
    try {
        const parsed = JSON.parse(taskVarsJson.value || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};                       // mid-typing; fall back to no variables
    }
});

const resolvedSchema = computed(() => resolveFormVariables(props.schema, previewVars.value));

/**
 * Remount only when the set of field names changes. Keying on the whole schema would
 * rebuild the form on every property tweak and throw away entered test data.
 */
const formKey = computed(() => [
    Object.keys(props.schema).join(','),
    JSON.stringify(Object.keys(previewVars.value)),
    // Steps are registered at construction time, so switching pagination on or off —
    // or reordering pages — needs a fresh instance, not a prop update.
    JSON.stringify(props.steps ?? null),
].join('|'));

watch([form$, locale], () => form$.value?.setLanguage?.(locale.value));

// ── Task variables ────────────────────────────────────────────────────────────
const varsJsonError = ref('');
const formOutputJson = ref('{}');

function readOutput() {
    // requestData is what would actually be submitted: it drops conditionally
    // unavailable elements and anything marked submit:false.
    formOutputJson.value = JSON.stringify(form$.value?.requestData ?? {}, null, 2);
}

async function applyVars() {
    varsJsonError.value = '';
    let parsed: Record<string, unknown>;
    try {
        parsed = JSON.parse(taskVarsJson.value || '{}');
    } catch (err: any) {
        varsJsonError.value = err?.message ?? 'Invalid JSON.';
        return;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        varsJsonError.value = 'Task variables must be a JSON object.';
        return;
    }

    try {
        // load() replaces wholesale and clears keys the payload omits — the same
        // semantics a task form gets when the engine hands it process variables.
        await form$.value?.load?.(parsed, true);
    } catch (err: any) {
        varsJsonError.value = err?.message ?? 'Could not apply these variables.';
        return;
    }
    await nextTick();
    readOutput();
}

async function reset() {
    varsJsonError.value = '';
    form$.value?.reset?.();
    await nextTick();
    readOutput();
}

/** Seed the editor with the field names the schema actually exposes. */
function scaffoldVars() {
    const skeleton: Record<string, unknown> = {};
    for (const [name, entry] of Object.entries(props.schema)) {
        if (entry.type === 'static') continue;      // holds no data
        skeleton[name] = '';
    }
    taskVarsJson.value = JSON.stringify(skeleton, null, 2);
}

watch(form$, readOutput);
</script>

<template>
    <Splitter
        class="flex-1 min-h-0 app-splitter"
        :gutter-size="5"
        state-key="vueform-builder-preview"
        state-storage="local"
    >

        <!-- Left: controls -->
        <SplitterPanel :size="26" :min-size="15" class="flex flex-col min-w-0 overflow-y-auto">
            <!-- Viewport selector -->
            <div class="flex items-center justify-between px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                <span class="text-xs font-semibold uppercase tracking-wide opacity-60">Viewport</span>
                <SelectButton
                    v-model="viewMode"
                    :options="viewOptions"
                    option-label="label"
                    option-value="value"
                    :allow-empty="false"
                    :pt="{ pcButton: { root: { style: 'padding: 0.25rem 0.5rem; font-size:0.75rem;' } } }"
                >
                    <template #option="{ option }">
                        <i :class="option.icon" v-tooltip.bottom="option.label" />
                    </template>
                </SelectButton>
            </div>

            <!-- Language -->
            <div class="flex items-center justify-between gap-2 px-4 py-2 border-b border-surface-200 dark:border-surface-700 shrink-0">
                <span class="text-xs font-semibold uppercase tracking-wide opacity-60">Language</span>
                <Select
                    :model-value="locale"
                    :options="locales"
                    option-label="label"
                    option-value="value"
                    size="small"
                    style="width: 130px"
                    @update:model-value="locale = $event"
                />
            </div>

            <!-- Task variables -->
            <div class="flex flex-col px-4 py-3 gap-2" style="flex: 1; min-height: 0;">
                <div class="flex items-center justify-between shrink-0">
                    <p class="text-xs font-semibold uppercase tracking-wide opacity-60">Task variables</p>
                    <div class="flex gap-1">
                        <Button label="Apply" size="small" :disabled="!hasFields" @click="applyVars" />
                        <Button label="Reset" size="small" severity="secondary" @click="reset" />
                    </div>
                </div>
                <button
                    type="button"
                    class="self-start text-[11px] underline opacity-60 hover:opacity-100 shrink-0"
                    :disabled="!hasFields"
                    @click="scaffoldVars"
                >
                    Fill from schema
                </button>
                <p v-if="varsJsonError" class="text-xs text-red-500 shrink-0">{{ varsJsonError }}</p>
                <JsonEditor
                    v-model:text="taskVarsJson"
                    mode="text"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    style="flex: 1; min-height: 180px;"
                    @update:text="taskVarsJson = $event"
                />

                <p class="text-xs font-semibold uppercase tracking-wide opacity-60 shrink-0">Form output</p>
                <JsonEditor
                    :model-value="{ text: formOutputJson }"
                    mode="text"
                    :mainMenuBar="false"
                    :navigationBar="false"
                    :read-only="true"
                    style="flex: 1; min-height: 120px;"
                />
            </div>
        </SplitterPanel>

        <!-- Right: form canvas -->
        <SplitterPanel :size="74" :min-size="30" class="overflow-y-auto p-6 flex flex-col items-center bg-surface-50 dark:bg-zinc-900">
            <div
                :style="{ width: '100%', maxWidth: canvasMaxWidth[viewMode], transition: 'max-width 0.25s ease' }"
            >
                <div v-if="!hasFields" class="text-sm opacity-60">
                    Nothing to preview yet — add an element in the designer.
                </div>

                <div v-else class="rounded bg-white p-5 shadow-sm dark:bg-zinc-950">
                    <Vueform
                        ref="form$"
                        :key="formKey"
                        :schema="resolvedSchema"
                        :steps="props.steps && Object.keys(props.steps).length ? props.steps : undefined"
                        :endpoint="false"
                        sync
                        @change="readOutput"
                    />
                </div>
            </div>
        </SplitterPanel>

    </Splitter>
</template>
