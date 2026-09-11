<script setup lang="ts">
/**
 * Renders a stored form, whichever editor produced it.
 *
 * Replaces the per-page `!isJsonSchema && !isCustom` branching that six runtime
 * surfaces each carried a copy of. Owns three engines:
 *
 *   form-js      imperative — mount/destroy a viewer, submit via an event
 *   jsonschema   @lljj/vue3-form-element, declarative
 *   vueform      @vueform/vueform, declarative
 *
 * `type: 'custom'` is deliberately NOT handled here. Custom task views take a task-like
 * object and depend on page-level provides; folding them in would make this a task-page
 * component instead of a renderer. Pages check `isCustom` before reaching for this.
 *
 * The value of the component is `submit()`: it normalises three very different
 * submission models into one awaitable call.
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import { Form } from '@bpmn-io/form-js';
import '@bpmn-io/form-js-viewer/dist/assets/form-js.css';
import '@/forms.scss';
import { DocumentListModule } from '@/form-fields/DocumentListField';
import { LinkModule } from '@/form-fields/LinkField';

// JSON Schema renderer
import VueFormJsonSchema from '@lljj/vue3-form-element';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import { ElConfigProvider } from 'element-plus';
import en from 'element-plus/es/locale/lang/en';

import { resolveFormFiles } from '@/form-fields/form-js-submit';
import { resolveNestedFiles } from '@/utils/form-files';
import { resolveFormVariables } from '@/formbuilder/formVariables';
import type { FilesService } from '@services/FilesService';
import { useTheme } from '@/composables/useTheme';
import { useFormLocale } from '@/composables/useFormLocale';
import type { IForm } from '@services/FormsService';
import FormUnavailable from './FormUnavailable.vue';
import { formEngineOf, formProblemOf, type FormEngine, type SubmitResult } from './formEngine';

const props = withDefaults(defineProps<{
    schema: IForm | null;
    /** Seed values — process variables handed over by the engine. */
    data?: Record<string, any>;
    readOnly?: boolean;
}>(), {
    data: () => ({}),
    readOnly: false,
});

const emit = defineEmits<{ change: [data: Record<string, any>]; finish: [] }>();

const { isDark } = useTheme();
const { locale } = useFormLocale();

const engine = computed<FormEngine | null>(() => formEngineOf(props.schema));
const problem = computed(() => formProblemOf(props.schema));

// ── form-js ───────────────────────────────────────────────────────────────────
const formJsHost = ref<HTMLElement | null>(null);
const viewer = ref<any>(null);
/** Live values from form-js's `changed` event — it has no public data getter. */
const formJsData = ref<Record<string, any>>({});
/** Resolves the promise `submit()` is waiting on; form-js reports via an event. */
let pendingSubmit: ((r: { data: Record<string, any>; errors: unknown }) => void) | null = null;

function destroyFormJs() {
    viewer.value?.destroy();
    viewer.value = null;
}

async function mountFormJs() {
    destroyFormJs();
    if (engine.value !== 'formjs' || !props.schema) return;

    await nextTick();
    if (!formJsHost.value) return;

    const form = new Form({
        container: formJsHost.value,
        additionalModules: [DocumentListModule, LinkModule],
    });
    viewer.value = form;

    await form.importSchema(props.schema as any, { ...props.data });
    formJsData.value = { ...props.data };
    form.setProperty('readOnly', props.readOnly);

    form.on('changed', (event: { data: Record<string, any> }) => {
        formJsData.value = event.data;
        emit('change', event.data);
    });
    form.on('submit', (event: { data: Record<string, any>; errors: unknown }) => {
        pendingSubmit?.(event);
        pendingSubmit = null;
    });
}

// ── JSON Schema (lljj) ────────────────────────────────────────────────────────
const jsonData = ref<Record<string, any>>({});
watch(jsonData, (v) => emit('change', v), { deep: true });

// ── Vueform ───────────────────────────────────────────────────────────────────
const vueformData = ref<Record<string, any>>({});
const vueform$ = ref<any>(null);
/**
 * Form Variable markers are swapped for the resolved option lists the engine injected
 * into `data`; Vueform would otherwise read a bare-string `items` as a remote URL.
 */
const vueformSchema = computed(() =>
    resolveFormVariables(props.schema?.vueform?.schema ?? {}, props.data),
);

watch([vueform$, locale], () => vueform$.value?.setLanguage?.(locale.value));

/**
 * Push seed values into every `matrix` element after it renders.
 *
 * Every other element type derives what it renders from the model, so `v-model` +
 * `sync` is enough: a `list` renders one item per value, an `object` reads its
 * children's paths straight out of the model. A matrix does not — its row count is
 * component state (`rowsCount`, seeded from the schema's `rows` and moved only by
 * the element's own load()/update()/add()). A data-driven table is declared with
 * `rows: 0`, so under a plain v-model it renders its column headers over zero rows
 * and the values are invisible, even though they sit in the model all along.
 *
 * The designer's preview tab does not hit this because "Apply" calls `form$.load()`,
 * which reaches each matrix's own load(). Calling the form-wide load() here instead
 * would drag in its other semantics — it clears every key the payload omits and
 * unlocks all steps of a paginated form — so seed just the matrices.
 */
function seedMatrices(children: Record<string, any> | undefined) {
    for (const el$ of Object.values(children ?? {})) {
        if (!el$ || typeof el$ !== 'object') continue;

        if (el$.isMatrixType) {
            // `value` reads the element's own slice of the model; update() turns it
            // into rows. Cells hold no nested elements, so there is nothing below.
            const value = el$.value;
            if (value && typeof value === 'object' && Object.keys(value).length) {
                el$.update(value);
            }
            continue;
        }

        seedMatrices(el$.children$);
    }
}

watch(
    [vueform$, () => props.schema, () => props.data],
    async () => {
        if (engine.value !== 'vueform' || !vueform$.value) return;
        // Let the elements — including the list items the model just created — mount.
        await nextTick();
        seedMatrices(vueform$.value?.elements$);
    },
    { immediate: true },
);

/**
 * A paginated form. Vueform renders its own step bar and Previous/Next/Finish
 * controls, with Next auto-disabled while the current page has validation errors.
 */
const vueformSteps = computed(() => props.schema?.vueform?.steps ?? null);
const hasSteps = computed(() =>
    engine.value === 'vueform'
    && !!vueformSteps.value
    && Object.keys(vueformSteps.value).length > 0,
);

/**
 * Vueform's Finish button reaches us as the form's own `submit` event.
 *
 * Two things make the guard mandatory. Vueform renders a real `<form @submit.prevent>`,
 * so **Enter in any text input fires this** — without the last-step check, Enter on
 * page 1 would complete the task. And the event's payload is a `FormData`, not a plain
 * object, so the host page must still collect through `submit()` rather than read it.
 */
function onVueformSubmit() {
    if (hasSteps.value && vueform$.value?.steps$?.isAtLastStep) emit('finish');
}

/**
 * Where the user is in a paginated form, for a page that wants to show its own
 * progress chrome. Null when the form is not paginated.
 *
 * Read off Vueform's own step instance rather than tracked separately, so a
 * conditionally skipped page can never put the two counts out of step.
 */
const stepsState = computed<{ index: number; total: number; label: string } | null>(() => {
    if (!hasSteps.value) return null;
    const instance = vueform$.value?.steps$;
    const visible = instance?.visible$ ?? [];
    const current = instance?.current$;
    if (!current) return null;

    return {
        index: visible.indexOf(current) + 1,
        total: visible.length,
        label: current.label ?? '',
    };
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────
watch(
    () => [props.schema, engine.value] as const,
    () => {
        jsonData.value = { ...props.data };
        vueformData.value = { ...props.data };
        if (engine.value === 'formjs') void mountFormJs();
        else destroyFormJs();
    },
    { immediate: true },
);

watch(() => props.readOnly, (ro) => viewer.value?.setProperty('readOnly', ro));

onUnmounted(destroyFormJs);

// ── Public API ────────────────────────────────────────────────────────────────

/** Current values without validating — for draft saves. */
function getData(): Record<string, any> {
    switch (engine.value) {
        case 'formjs': return { ...formJsData.value };
        case 'jsonschema': return { ...jsonData.value };
        case 'vueform': return vueform$.value?.requestData ?? { ...vueformData.value };
        default: return {};
    }
}

async function submit(): Promise<SubmitResult> {
    switch (engine.value) {
        case 'formjs': {
            if (!viewer.value) return { ok: false, errors: 'Form is not ready.' };
            const result = await new Promise<{ data: Record<string, any>; errors: unknown }>((resolve) => {
                pendingSubmit = resolve;
                viewer.value.submit();
            });
            // NOTE: form-js reports validation errors on this event but every call site
            // has always submitted regardless, so that behaviour is preserved here
            // rather than silently tightened during a refactor.
            return { ok: true, data: result.data };
        }
        case 'vueform': {
            await vueform$.value?.validate();
            if (vueform$.value?.invalid) return { ok: false, errors: vueform$.value?.errors };
            return { ok: true, data: vueform$.value?.requestData ?? {} };
        }
        case 'jsonschema':
            // lljj exposes no programmatic validate; it validates on its own submit
            // button, which every call site hides in favour of PrimeVue actions.
            return { ok: true, data: { ...jsonData.value } };
        default:
            return { ok: false, errors: 'No renderable form.' };
    }
}

/**
 * Upload any files in the collected variables and replace them with DocumentReferences.
 *
 * Lives here because the strategy is per-engine: form-js keeps files in its own
 * fileRegistry behind "files::" strings, while Vueform holds raw File objects in the
 * model — possibly nested inside a group, object or list.
 */
async function resolveFiles(
    data: Record<string, any>,
    filesService: FilesService,
    processInstanceId?: string,
    taskId?: string,
): Promise<Record<string, any>> {
    switch (engine.value) {
        case 'formjs':
            return resolveFormFiles(data, filesService, viewer.value, processInstanceId, taskId);
        case 'vueform':
            return resolveNestedFiles(data, filesService, processInstanceId, taskId);
        default:
            return data;
    }
}

defineExpose({
    engine,
    problem,
    hasSteps,
    stepsState,
    submit,
    getData,
    resolveFiles,
    /** The raw form-js viewer — needed by resolveFormFiles(). Null for other engines. */
    formJsViewer: () => viewer.value,
});
</script>

<template>
    <FormUnavailable v-if="problem" :problem="problem" />

    <!-- form-js -->
    <div
        v-else-if="engine === 'formjs'"
        ref="formJsHost"
        :class="isDark ? 'formjs-dark' : 'formjs-light'"
    />

    <!-- JSON Schema — footer hidden; host pages drive submission with their own actions -->
    <div v-else-if="engine === 'jsonschema'" class="jsf-preview-root">
        <ElConfigProvider :locale="en">
            <VueFormJsonSchema
                v-model="jsonData"
                :schema="props.schema?.jsonSchema ?? {}"
                :ui-schema="props.schema?.uiSchema ?? {}"
                :form-footer="{ show: false }"
                :disabled="props.readOnly"
            />
        </ElConfigProvider>
    </div>

    <!-- Vueform -->
    <div v-else-if="engine === 'vueform'" class="p-1">
        <Vueform
            ref="vueform$"
            :key="hasSteps ? 'stepped' : 'flat'"
            v-model="vueformData"
            :schema="vueformSchema"
            :steps="vueformSteps || undefined"
            :endpoint="false"
            :disabled="props.readOnly"
            sync
            @submit="onVueformSubmit"
        />
    </div>
</template>
