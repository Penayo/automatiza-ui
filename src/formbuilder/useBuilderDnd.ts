/**
 * Drag-and-drop for the builder canvas.
 *
 * Hand-rolled HTML5 DnD, following the precedent in
 * src/pages/admin/processes/tabs/SpecTab.vue. Everything is isolated here so the
 * decision stays reversible: if nested dragging gets painful, swap the internals for a
 * library without touching a component.
 *
 * The model is a flat list of drop slots. Every node exposes an above- and below-slot,
 * every container an inner empty-slot, and a drop resolves to a single
 * `{ parentId, index }` move.
 */
import { ref, type Ref } from 'vue';
import type { DropTarget } from './useFormBuilder';

/** What is being dragged: a new element from the palette, or an existing node. */
export type DragPayload =
    | { kind: 'new'; itemId: string }
    | { kind: 'move'; id: string };

export interface BuilderDndApi {
    dragging: Ref<DragPayload | null>;
    dropTarget: Ref<DropTarget | null>;
    startPaletteDrag: (itemId: string, ev: DragEvent) => void;
    startNodeDrag: (id: string, ev: DragEvent) => void;
    overSlot: (target: DropTarget, ev: DragEvent) => void;
    /** Before/after is decided by which half of the node the pointer is in. */
    overNode: (parentId: string | null, index: number, ev: DragEvent) => void;
    drop: (ev: DragEvent) => void;
    endDrag: () => void;
    isTarget: (target: DropTarget) => boolean;
}

export interface BuilderDndOptions {
    onDropNew: (itemId: string, target: DropTarget) => void;
    onDropMove: (id: string, target: DropTarget) => void;
    canDrop: (payload: DragPayload, target: DropTarget) => boolean;
}

export function useBuilderDnd(options: BuilderDndOptions): BuilderDndApi {
    const dragging = ref<DragPayload | null>(null);
    const dropTarget = ref<DropTarget | null>(null);

    function begin(payload: DragPayload, ev: DragEvent) {
        dragging.value = payload;
        dropTarget.value = null;
        if (ev.dataTransfer) {
            ev.dataTransfer.effectAllowed = payload.kind === 'new' ? 'copy' : 'move';
            // Firefox refuses to start a drag without payload data.
            ev.dataTransfer.setData('text/plain', payload.kind === 'new' ? payload.itemId : payload.id);
        }
    }

    const startPaletteDrag = (itemId: string, ev: DragEvent) => begin({ kind: 'new', itemId }, ev);
    const startNodeDrag = (id: string, ev: DragEvent) => begin({ kind: 'move', id }, ev);

    function overSlot(target: DropTarget, ev: DragEvent) {
        const payload = dragging.value;
        if (!payload || !options.canDrop(payload, target)) return;

        ev.preventDefault();
        if (ev.dataTransfer) ev.dataTransfer.dropEffect = payload.kind === 'new' ? 'copy' : 'move';
        dropTarget.value = target;
    }

    function overNode(parentId: string | null, index: number, ev: DragEvent) {
        const el = ev.currentTarget as HTMLElement | null;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        // A narrow element shares its row with siblings, so before/after is a
        // left/right decision there and a top/bottom one for a full-width element.
        const rowWidth = el.parentElement?.clientWidth ?? rect.width;
        const sharesRow = rect.width < rowWidth * 0.75;

        const after = sharesRow
            ? ev.clientX - rect.left > rect.width / 2
            : ev.clientY - rect.top > rect.height / 2;

        overSlot({ parentId, index: after ? index + 1 : index }, ev);
    }

    function drop(ev: DragEvent) {
        ev.preventDefault();
        ev.stopPropagation();

        const payload = dragging.value;
        const target = dropTarget.value;
        if (payload && target && options.canDrop(payload, target)) {
            if (payload.kind === 'new') options.onDropNew(payload.itemId, target);
            else options.onDropMove(payload.id, target);
        }
        endDrag();
    }

    function endDrag() {
        dragging.value = null;
        dropTarget.value = null;
    }

    function isTarget(target: DropTarget): boolean {
        const current = dropTarget.value;
        return !!current && current.parentId === target.parentId && current.index === target.index;
    }

    return {
        dragging,
        dropTarget,
        startPaletteDrag,
        startNodeDrag,
        overSlot,
        overNode,
        drop,
        endDrag,
        isTarget,
    };
}
