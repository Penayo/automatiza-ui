<script setup lang="ts">
/**
 * One level of the builder tree: drop slots interleaved with node chrome.
 *
 * Self-recursive — a container renders this component again for its children, so the
 * slot/drop logic exists once regardless of nesting depth.
 */
import { compile } from '@/formbuilder/compile';
import { getElementDef } from '@/formbuilder/registry';
import { isContainerType, isSingleChildContainer, type BuilderNode, type CompiledElement } from '@/formbuilder/types';
import type { BuilderApi } from '@/formbuilder/useFormBuilder';
import type { BuilderDndApi } from '@/formbuilder/useBuilderDnd';
import BuilderElementPreview from './BuilderElementPreview.vue';

const props = defineProps<{
    nodes: BuilderNode[];
    parentId: string | null;
    builder: BuilderApi;
    dnd: BuilderDndApi;
}>();

/** A container's own entry minus its children, so the preview never re-renders the tree. */
function leafEntry(node: BuilderNode): CompiledElement {
    return compile({ builderVersion: 1, nodes: [node], formProps: {} })[node.name] ?? { type: node.type };
}

function isFull(node: BuilderNode): boolean {
    return isSingleChildContainer(node.type) && (node.children?.length ?? 0) > 0;
}
</script>

<template>
    <div class="flex flex-col">
        <template v-for="(node, index) in props.nodes" :key="node.id">
            <!-- Drop slot above this node -->
            <div
                class="h-1.5 -my-0.5 rounded transition-colors"
                :class="props.dnd.isTarget({ parentId: props.parentId, index })
                    ? 'bg-(--layout-accent-color)'
                    : 'bg-transparent'"
                @dragover="props.dnd.overSlot({ parentId: props.parentId, index }, $event)"
                @drop="props.dnd.drop($event)"
            />

            <div
                class="group relative rounded border transition-colors"
                :class="[
                    props.builder.selectedId.value === node.id
                        ? 'border-(--layout-accent-color) ring-1 ring-(--layout-accent-color)'
                        : 'border-surface-200 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-500',
                    props.dnd.dragging.value?.kind === 'move'
                        && props.dnd.dragging.value.id === node.id ? 'opacity-40' : '',
                ]"
                @click.stop="props.builder.select(node.id)"
                @dragover.stop="props.dnd.overNode(props.parentId, index, $event)"
                @drop.stop="props.dnd.drop($event)"
            >
                <!-- Chrome: drag handle, path hint, actions -->
                <div class="flex items-center gap-2 px-2 py-1 text-[11px]">
                    <i
                        class="pi pi-bars cursor-grab opacity-40 group-hover:opacity-80 active:cursor-grabbing"
                        draggable="true"
                        @dragstart.stop="props.dnd.startNodeDrag(node.id, $event)"
                        @dragend="props.dnd.endDrag()"
                    />
                    <i :class="['pi', getElementDef(node.type)?.icon ?? 'pi-question', 'opacity-40']" />
                    <code class="font-mono opacity-60">{{ props.builder.pathOf(node.id) }}</code>

                    <div class="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                            type="button"
                            class="rounded px-1 hover:bg-surface-200 dark:hover:bg-surface-700"
                            title="Duplicate"
                            @click.stop="props.builder.duplicateNode(node.id)"
                        >
                            <i class="pi pi-copy text-[11px]" />
                        </button>
                        <button
                            type="button"
                            class="rounded px-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            title="Delete"
                            @click.stop="props.builder.removeNode(node.id)"
                        >
                            <i class="pi pi-trash text-[11px]" />
                        </button>
                    </div>
                </div>

                <!-- Body -->
                <div class="px-2 pb-2">
                    <template v-if="isContainerType(node.type)">
                        <div
                            class="rounded border border-dashed border-surface-300 p-2 dark:border-surface-600"
                        >
                            <div class="mb-1 text-[11px] font-medium opacity-60">
                                {{ (node.props.label as string) || getElementDef(node.type)?.label }}
                                <span v-if="node.type === 'object'" class="opacity-60">— nests data</span>
                                <span v-else-if="node.type === 'list'" class="opacity-60">— repeats</span>
                            </div>

                            <BuilderNodeList
                                :nodes="node.children ?? []"
                                :parent-id="node.id"
                                :builder="props.builder"
                                :dnd="props.dnd"
                            />

                            <div
                                v-if="!(node.children?.length) && !isFull(node)"
                                class="rounded border border-dashed border-surface-300 px-2 py-3 text-center text-[11px] opacity-50 dark:border-surface-600"
                                @dragover.stop="props.dnd.overSlot({ parentId: node.id, index: 0 }, $event)"
                                @drop.stop="props.dnd.drop($event)"
                            >
                                {{ node.type === 'list' ? 'Drop one element to repeat' : 'Drop elements here' }}
                            </div>
                        </div>
                    </template>

                    <BuilderElementPreview v-else :name="node.name" :entry="leafEntry(node)" />
                </div>
            </div>
        </template>

        <!-- Trailing drop slot -->
        <div
            class="rounded transition-colors"
            :class="[
                props.nodes.length ? 'h-1.5 -mt-0.5' : 'h-2',
                props.dnd.isTarget({ parentId: props.parentId, index: props.nodes.length })
                    ? 'bg-(--layout-accent-color)'
                    : 'bg-transparent',
            ]"
            @dragover="props.dnd.overSlot({ parentId: props.parentId, index: props.nodes.length }, $event)"
            @drop="props.dnd.drop($event)"
        />
    </div>
</template>
