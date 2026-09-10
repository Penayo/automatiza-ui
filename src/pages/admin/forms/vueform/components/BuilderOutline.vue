<script setup lang="ts">
/**
 * Tree outline.
 *
 * Secondary navigation, but primarily the accessible reorder path: HTML5 drag-and-drop
 * is not keyboard-operable, so move up/down/in/out live here rather than being
 * drag-only.
 */
import { computed } from 'vue';
import { getElementDef } from '@/formbuilder/registry';
import { isContainerType, type BuilderNode } from '@/formbuilder/types';
import type { BuilderApi } from '@/formbuilder/useFormBuilder';

const props = defineProps<{ builder: BuilderApi }>();

interface Row {
    node: BuilderNode;
    depth: number;
    parentId: string | null;
    index: number;
    siblings: BuilderNode[];
}

const rows = computed<Row[]>(() => {
    const out: Row[] = [];
    const walk = (nodes: BuilderNode[], depth: number, parentId: string | null) => {
        nodes.forEach((node, index) => {
            out.push({ node, depth, parentId, index, siblings: nodes });
            if (node.children) walk(node.children, depth + 1, node.id);
        });
    };
    walk(props.builder.doc.value.nodes, 0, null);
    return out;
});

/**
 * moveNode() removes before inserting and compensates for the shift when the source and
 * destination lists are the same. So moving *down* one place means asking for index + 2:
 * the removal pulls it back to index + 1.
 */
function move(row: Row, direction: 'up' | 'down') {
    if (direction === 'up') {
        if (row.index === 0) return;
        props.builder.moveNode(row.node.id, { parentId: row.parentId, index: row.index - 1 });
    } else {
        if (row.index >= row.siblings.length - 1) return;
        props.builder.moveNode(row.node.id, { parentId: row.parentId, index: row.index + 2 });
    }
}

/** Nest into the container immediately above, when there is one. */
function indent(row: Row) {
    const previous = row.siblings[row.index - 1];
    if (!previous || !isContainerType(previous.type)) return;
    props.builder.moveNode(row.node.id, {
        parentId: previous.id,
        index: previous.children?.length ?? 0,
    });
}

/** Lift out to just after the current parent. */
function outdent(row: Row) {
    if (row.parentId === null) return;
    const parentRow = rows.value.find((r) => r.node.id === row.parentId);
    if (!parentRow) return;
    props.builder.moveNode(row.node.id, {
        parentId: parentRow.parentId,
        index: parentRow.index + 1,
    });
}
</script>

<template>
    <div class="flex h-full flex-col overflow-y-auto">
        <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wide opacity-60">
            Outline
        </div>

        <p v-if="!rows.length" class="px-3 text-[11px] opacity-50">No elements yet.</p>

        <div
            v-for="row in rows"
            :key="row.node.id"
            class="group flex items-center gap-1.5 py-0.5 pr-1 text-xs"
            :class="props.builder.selectedId.value === row.node.id
                ? 'bg-surface-200 dark:bg-surface-700'
                : 'hover:bg-surface-100 dark:hover:bg-surface-800'"
            :style="{ paddingLeft: `${8 + row.depth * 14}px` }"
        >
            <button
                type="button"
                class="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                @click="props.builder.select(row.node.id)"
            >
                <i :class="['pi', getElementDef(row.node.type)?.icon ?? 'pi-question', 'text-[10px] opacity-50']" />
                <span class="truncate font-mono">{{ row.node.name }}</span>
            </button>

            <div class="flex shrink-0 items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" class="px-0.5 disabled:opacity-25" title="Move up"
                        :disabled="row.index === 0" @click="move(row, 'up')">
                    <i class="pi pi-chevron-up text-[10px]" />
                </button>
                <button type="button" class="px-0.5 disabled:opacity-25" title="Move down"
                        :disabled="row.index >= row.siblings.length - 1" @click="move(row, 'down')">
                    <i class="pi pi-chevron-down text-[10px]" />
                </button>
                <button type="button" class="px-0.5 disabled:opacity-25" title="Nest into element above"
                        :disabled="!row.siblings[row.index - 1] || !isContainerType(row.siblings[row.index - 1].type)"
                        @click="indent(row)">
                    <i class="pi pi-chevron-right text-[10px]" />
                </button>
                <button type="button" class="px-0.5 disabled:opacity-25" title="Move out of container"
                        :disabled="row.parentId === null" @click="outdent(row)">
                    <i class="pi pi-chevron-left text-[10px]" />
                </button>
            </div>
        </div>
    </div>
</template>
