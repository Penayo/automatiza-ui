<script setup lang="ts">
import type { BuilderApi } from '@/formbuilder/useFormBuilder';
import type { BuilderDndApi } from '@/formbuilder/useBuilderDnd';
import BuilderNodeList from './BuilderNodeList.vue';
import BuilderStepSections from './BuilderStepSections.vue';

const props = defineProps<{ builder: BuilderApi; dnd: BuilderDndApi }>();
</script>

<template>
    <div
        class="h-full overflow-y-auto p-4"
        @click="props.builder.select(null)"
        @dragend="props.dnd.endDrag()"
        @dragleave.self="props.dnd.dropTarget.value = null"
    >
        <div class="mx-auto max-w-3xl">
            <!-- Paginated: one section per step, each rendering a slice of the flat list. -->
            <BuilderStepSections
                v-if="props.builder.hasSteps.value"
                :builder="props.builder"
                :dnd="props.dnd"
            />

            <div
                v-else-if="!props.builder.doc.value.nodes.length"
                class="rounded border border-dashed border-surface-300 px-4 py-16 text-center text-sm opacity-60 dark:border-surface-600"
                @dragover="props.dnd.overSlot({ parentId: null, index: 0 }, $event)"
                @drop="props.dnd.drop($event)"
            >
                Drag an element from the left to start building.
            </div>

            <BuilderNodeList
                v-else
                :nodes="props.builder.doc.value.nodes"
                :parent-id="null"
                :builder="props.builder"
                :dnd="props.dnd"
            />
        </div>
    </div>
</template>
