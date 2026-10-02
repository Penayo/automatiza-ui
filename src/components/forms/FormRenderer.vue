<script setup lang="ts">
/**
 * Renders a stored form.
 *
 * Replaces the per-page branching that six runtime surfaces each carried a copy of.
 * Vueform is the only authoring surface now — the form-js designer and the JSON-Schema
 * editor were removed along with their renderers, so a form stored under one of their
 * types resolves to a problem (see formEngine.ts) and this shows FormUnavailable.
 *
 * `type: 'custom'` is deliberately NOT handled here. Custom task views take a task-like
 * object and depend on page-level provides; folding them in would make this a task-page
 * component instead of a renderer. Pages check `isCustom` before reaching for this.
 *
 * The value of the component is `submit()`: one awaitable call that validates first and
 * refuses when the form is invalid.
 */
import { computed, nextTick, ref, watch } from 'vue';

import { resolveNestedFiles, type UploadContext } from '@/utils/form-files';
import { resolveFormVariables } from '@/formbuilder/formVariables';
import { resolveSeededSources } from '@/formbuilder/seededSources';
import type { FilesService } from '@services/FilesService';
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

const { locale } = useFormLocale();

const engine = computed<FormEngine | null>(() => formEngineOf(props.schema));
const problem = computed(() => formProblemOf(props.schema));

// ── Vueform ───────────────────────────────────────────────────────────────────
const vueformData = ref<Record<string, any>>({});
const vueform$ = ref<any>(null);

watch(vueformData, (v) => emit('change', v), { deep: true });

/**
 * Two schema references are resolved against the seeded variables before Vueform sees
 * the schema, because neither survives the trip otherwise:
 *
 *   items         a Form Variable marker — Vueform reads a bare-string `items` as a
 *                 remote URL and would issue an HTTP request to a nonsense one.
 *   documents /   a documentList's checklist or a dataTable's rows, when either names
 *   rows          a process variable. Vueform's `data` only holds keys that have an
 *                 element, so a variable the form does not also ask for never reaches
 *                 the element on its own.
 */
const vueformSchema = computed(() => {
    const resolved = resolveSeededSources(
        resolveFormVariables(props.schema?.vueform?.schema ?? {}, props.data),
        props.data,
    );
    return props.readOnly ? disableAll(resolved) : resolved;
});

/**
 * Read-only has to be stamped onto every element. Vueform's root `:disabled` only
 * gates submit (`form$.isDisabled`); each element resolves its own disabled state
 * from its own `disabled` prop, so without this the inputs stay editable.
 *
 * Descends the three places a schema nests elements: a container's `schema`, a
 * list's `element`, and a matrix's cell definition in `items`.
 */
function disableAll(schema: Record<string, any>): Record<string, any> {
    const disableNode = (node: any): any => {
        if (!node || typeof node !== 'object' || Array.isArray(node)) return node;
        const out: Record<string, any> = { ...node, disabled: true };
        if (out.schema && typeof out.schema === 'object') out.schema = disableAll(out.schema);
        if (out.element) out.element = disableNode(out.element);
        if (out.items && !Array.isArray(out.items) && typeof out.items === 'object' && out.items.type) {
            out.items = disableNode(out.items);
        }
        return out;
    };
    return Object.fromEntries(Object.entries(schema).map(([key, node]) => [key, disableNode(node)]));
}

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
    () => { vueformData.value = { ...props.data }; },
    { immediate: true },
);

// ── Public API ────────────────────────────────────────────────────────────────

/** Current values without validating — for draft saves. */
function getData(): Record<string, any> {
    if (engine.value !== 'vueform') return {};
    return vueform$.value?.requestData ?? { ...vueformData.value };
}

async function submit(): Promise<SubmitResult> {
    if (engine.value !== 'vueform') return { ok: false, errors: 'No renderable form.' };

    await vueform$.value?.validate();
    if (vueform$.value?.invalid) return { ok: false, errors: vueform$.value?.errors };
    return { ok: true, data: vueform$.value?.requestData ?? {} };
}

/**
 * Upload any files in the collected variables and replace them with DocumentReferences.
 *
 * Vueform holds raw File objects in the model — possibly nested inside a group, object
 * or list — so the walk has to descend rather than scan the top level.
 */
async function resolveFiles(
    data: Record<string, any>,
    filesService: FilesService,
    processInstanceId?: string,
    taskId?: string,
    context?: UploadContext,
): Promise<Record<string, any>> {
    if (engine.value !== 'vueform') return data;
    return resolveNestedFiles(data, filesService, processInstanceId, taskId, context);
}

defineExpose({
    engine,
    problem,
    hasSteps,
    stepsState,
    submit,
    getData,
    resolveFiles,
});
</script>

<template>
    <FormUnavailable v-if="problem" :problem="problem" />

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
