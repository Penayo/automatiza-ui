<script setup lang="ts">
/**
 * One level of the builder tree, laid out on the same 12-column grid Vueform uses.
 *
 * Self-recursive — a container renders this component again for its children, so the
 * drop logic exists once regardless of nesting depth.
 *
 * The grid matters: Vueform's `.vf-row` is `display:grid; repeat(12, …)` and an
 * element's `columns` prop becomes `grid-column: span N`. Mirroring that here is what
 * lets a half-width field sit beside its neighbour on the canvas — each node still
 * renders in its own single-element form, so the layout could not come from Vueform.
 *
 * Drop position is shown as a coloured edge on the node itself rather than as separate
 * slot elements: a full-width slot between two half-width nodes would force a row break
 * and make side-by-side layout impossible to see.
 */
import { compile } from '@/formbuilder/compile';
import { getElementDef } from '@/formbuilder/registry';
import { isContainerType, isSingleChildContainer, type BuilderNode, type CompiledElement } from '@/formbuilder/types';
import type { BuilderApi } from '@/formbuilder/useFormBuilder';
import type { BuilderDndApi } from '@/formbuilder/useBuilderDnd';
import BuilderElementPreview from './BuilderElementPreview.vue';

const props = withDefaults(defineProps<{
    nodes: BuilderNode[];
    parentId: string | null;
    builder: BuilderApi;
    dnd: BuilderDndApi;
    /**
     * Where `nodes` starts inside its owning array. A step section renders a slice of
     * the flat root list, so a local index has to be shifted to a global one before it
     * can be a drop target. Nested children always own their whole array, hence 0.
     */
    offset?: number;
    /** The step this list belongs to; only meaningful at the root. */
    stepId?: string | null;
}>(), {
    offset: 0,
    stepId: null,
});

/** Local list position -> position in the array the drop target addresses. */
function globalIndex(index: number): number {
    return props.offset + index;
}

/** A container's own entry minus its children, so the preview never re-renders the tree. */
function leafEntry(node: BuilderNode): CompiledElement {
    return compile({ builderVersion: 1, nodes: [node], formProps: {} })[node.name] ?? { type: node.type };
}

function isFull(node: BuilderNode): boolean {
    return isSingleChildContainer(node.type) && (node.children?.length ?? 0) > 0;
}

/**
 * How many of the 12 columns this node occupies. Vueform also accepts a per-breakpoint
 * object; the canvas shows those full width rather than guessing a breakpoint.
 */
function spanOf(node: BuilderNode): number {
    const columns = node.props.columns;
    const n = typeof columns === 'number' || typeof columns === 'string' ? Number(columns) : NaN;
    return Number.isFinite(n) ? Math.min(Math.max(Math.round(n), 1), 12) : 12;
}

/** 'before' | 'after' | null — which edge of this node the pending drop would land on. */
function dropEdge(index: number): 'before' | 'after' | null {
    const at = globalIndex(index);
    const scope = { parentId: props.parentId, stepId: props.stepId };
    if (props.dnd.isTarget({ ...scope, index: at })) return 'before';
    if (props.dnd.isTarget({ ...scope, index: at + 1 })) return 'after';
    return null;
}

/** A node sharing its row takes a left/right marker; a full-width one takes top/bottom. */
function edgeClass(node: BuilderNode, index: number): string {
    const edge = dropEdge(index);
    if (!edge) return '';
    const horizontal = spanOf(node) < 9;
    if (horizontal) return edge === 'before' ? 'builder-drop-left' : 'builder-drop-right';
    return edge === 'before' ? 'builder-drop-top' : 'builder-drop-bottom';
}
</script>

<template>
    <div class="grid grid-cols-12 gap-x-2 gap-y-1 items-start">
        <template v-for="(node, index) in props.nodes" :key="node.id">
            <div
                class="group relative rounded border transition-colors"
                :style="{ gridColumn: `span ${spanOf(node)} / span 12` }"
                :class="[
                    props.builder.selectedId.value === node.id
                        ? 'border-(--layout-accent-color) ring-1 ring-(--layout-accent-color)'
                        : 'border-surface-200 hover:border-surface-400 dark:border-surface-700 dark:hover:border-surface-500',
                    props.dnd.dragging.value?.kind === 'move'
                        && props.dnd.dragging.value.id === node.id ? 'opacity-40' : '',
                    edgeClass(node, index),
                ]"
                @click.stop="props.builder.select(node.id)"
                @dragover.stop="props.dnd.overNode(props.parentId, globalIndex(index), $event, props.stepId)"
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
                    <code class="truncate font-mono opacity-60">{{ props.builder.pathOf(node.id) }}</code>
                    <span v-if="spanOf(node) < 12" class="shrink-0 opacity-40">{{ spanOf(node) }}/12</span>

                    <div class="ml-auto flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
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
                        <div class="rounded border border-dashed border-surface-300 p-2 dark:border-surface-600">
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

        <!-- Trailing drop target, always its own full-width row -->
        <div
            class="col-span-12 rounded transition-colors"
            :class="[
                props.nodes.length ? 'h-2' : 'h-3',
                props.dnd.isTarget({
                    parentId: props.parentId,
                    index: globalIndex(props.nodes.length),
                    stepId: props.stepId,
                })
                    ? 'bg-(--layout-accent-color)'
                    : 'bg-transparent',
            ]"
            @dragover="props.dnd.overSlot({
                parentId: props.parentId,
                index: globalIndex(props.nodes.length),
                stepId: props.stepId,
            }, $event)"
            @drop="props.dnd.drop($event)"
        />
    </div>
</template>

<style>
/* Drop-position markers. Un-scoped so the recursive instances share one definition. */
.builder-drop-top    { box-shadow: inset 0  3px 0 0 var(--layout-accent-color); }
.builder-drop-bottom { box-shadow: inset 0 -3px 0 0 var(--layout-accent-color); }
.builder-drop-left   { box-shadow: inset  3px 0 0 0 var(--layout-accent-color); }
.builder-drop-right  { box-shadow: inset -3px 0 0 0 var(--layout-accent-color); }
</style>
