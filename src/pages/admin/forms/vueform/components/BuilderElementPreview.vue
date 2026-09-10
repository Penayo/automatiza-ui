<script setup lang="ts">
/**
 * Renders one leaf node as the real Vueform element.
 *
 * Each node gets its own small <Vueform> instance rather than the canvas sharing one
 * form. Vueform elements must live inside a form, and a single canvas-wide instance
 * would put element nesting under Vueform's control instead of the builder's — which is
 * exactly what the drag-and-drop and selection chrome need to own. The Preview tab
 * renders the whole schema in one real form, so true layout is never guessed at here.
 */
import { computed, ref, watch } from 'vue';
import { useFormLocale } from '@/composables/useFormLocale';
import { resolveFormVariables } from '@/formbuilder/formVariables';
import type { CompiledElement } from '@/formbuilder/types';

const props = defineProps<{ name: string; entry: CompiledElement }>();

const { locale } = useFormLocale();

/**
 * Two props have to be neutralised before this reaches Vueform.
 *
 * `items` markers, because a bare-string items is a remote URL to Vueform and there is
 * no task data on the canvas to resolve against — they render as an empty list.
 *
 * `expression` / `expressions`, because each node is its own single-element form here:
 * an expression naming a sibling would resolve against a form that does not contain it.
 * The Preview tab renders the whole schema in one instance, so computed values are
 * shown truthfully there instead of guessed at here.
 */
const entry = computed(() => {
    const resolved = resolveFormVariables({ [props.name]: props.entry })[props.name];
    const { expression: _expr, columns: _cols, ...rest } = resolved as Record<string, unknown>;
    // `columns` is applied by the canvas wrapper, which lays siblings out on the same
    // 12-column grid Vueform uses. Leaving it here too would halve the width twice.
    return { ...rest, ...(rest.expressions !== undefined ? { expressions: false } : {}) } as CompiledElement;
});
const form$ = ref<any>(null);

function quiet(instance: any) {
    if (!instance) return;
    // Conditions hide *and* remove from data, which would make a conditional field
    // impossible to select on the canvas. Validation noise is equally unwanted here.
    instance.disableConditions?.();
    instance.disableValidation?.();
    instance.setLanguage?.(locale.value);
}

watch(form$, quiet);
watch(locale, () => quiet(form$.value));
</script>

<template>
    <Vueform
        ref="form$"
        :schema="{ [props.name]: entry }"
        :display-errors="false"
        :endpoint="false"
        sync
        class="builder-preview"
    />
</template>

<style>
/* Clicks must select the node, not focus the control underneath it. */
.builder-preview,
.builder-preview * {
    pointer-events: none;
}
.builder-preview .vf-form-errors,
.builder-preview .vf-form-messages {
    display: none;
}
</style>
