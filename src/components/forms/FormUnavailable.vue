<script setup lang="ts">
/**
 * Shown instead of a blank area when a form reference cannot be rendered.
 *
 * The two cases are worth distinguishing: an unresolved key is a diagram
 * misconfiguration the designer can fix, while an unsupported type means the form was
 * built with an authoring surface this screen has not been wired for yet.
 */
import type { FormProblem } from './formEngine';

const props = defineProps<{ problem: FormProblem }>();
</script>

<template>
    <div class="flex flex-col items-center gap-2 p-8 text-center">
        <i class="pi pi-exclamation-triangle text-2xl text-amber-500" />

        <template v-if="props.problem.kind === 'unresolved'">
            <p class="text-sm font-medium">This task's form could not be found.</p>
            <p class="max-w-md text-xs opacity-70">
                The BPMN diagram references
                <code class="font-mono">{{ props.problem.ref }}</code>, but no form has that
                code or id. In the modeler, the Custom Form Key should be the form's
                <strong>code</strong> with no prefix.
            </p>
        </template>

        <template v-else>
            <p class="text-sm font-medium">This form can't be displayed here.</p>
            <p class="max-w-md text-xs opacity-70">
                It was built with an editor this screen does not support yet<span
                    v-if="props.problem.type"
                > (<code class="font-mono">{{ props.problem.type }}</code>)</span>.
            </p>
        </template>
    </div>
</template>
