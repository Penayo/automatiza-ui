/**
 * Builder state and tree operations.
 *
 * Provided via an InjectionKey at the editor root rather than a store or a singleton —
 * state is page-local and two editors could reasonably coexist.
 */
import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import { clonePlain } from './clone';
import { compile } from './compile';
import { newNodeId } from './decompile';
import { getElementDef, getPaletteItem } from './registry';
import {
    NAME_PATTERN,
    emptyDoc,
    isContainerType,
    isSingleChildContainer,
    type BuilderDoc,
    type BuilderNode,
    type VueformSchema,
} from './types';

export interface DropTarget {
    /** null = the root list. */
    parentId: string | null;
    index: number;
}

export interface BuilderApi {
    doc: Ref<BuilderDoc>;
    selectedId: Ref<string | null>;
    selectedNode: ComputedRef<BuilderNode | null>;
    schema: ComputedRef<VueformSchema>;
    dirty: Ref<boolean>;
    select: (id: string | null) => void;
    addNode: (paletteItemId: string, target: DropTarget) => BuilderNode | null;
    moveNode: (id: string, target: DropTarget) => boolean;
    removeNode: (id: string) => void;
    duplicateNode: (id: string) => void;
    renameNode: (id: string, name: string) => string | null;
    patchProps: (id: string, props: Record<string, unknown>) => void;
    canDrop: (draggedId: string, target: DropTarget) => boolean;
    pathOf: (id: string) => string;
    /** Data paths of every data-bearing field, optionally excluding one node. */
    fieldPaths: (excludeId?: string) => { value: string; label: string }[];
    reset: (doc: BuilderDoc) => void;
    /** Swap the whole tree in one undoable step — used by the JSON tab's import. */
    replaceNodes: (nodes: BuilderNode[]) => void;
    undo: () => void;
    redo: () => void;
    canUndo: ComputedRef<boolean>;
    canRedo: ComputedRef<boolean>;
}

/** Snapshots are whole-document JSON. Forms are small; structural sharing is not worth it. */
const HISTORY_LIMIT = 50;

export const BUILDER_KEY: InjectionKey<BuilderApi> = Symbol('formbuilder');

// ── Tree helpers ──────────────────────────────────────────────────────────────────

/** Children of `parentId`, or the root list when null. Returns null if not a container. */
function childListOf(doc: BuilderDoc, parentId: string | null): BuilderNode[] | null {
    if (parentId === null) return doc.nodes;
    const parent = findNode(doc.nodes, parentId);
    if (!parent || !isContainerType(parent.type)) return null;
    if (!parent.children) parent.children = [];
    return parent.children;
}

function findNode(nodes: BuilderNode[], id: string): BuilderNode | null {
    for (const node of nodes) {
        if (node.id === id) return node;
        if (node.children) {
            const hit = findNode(node.children, id);
            if (hit) return hit;
        }
    }
    return null;
}

function findParent(
    nodes: BuilderNode[],
    id: string,
    parent: BuilderNode | null = null,
): { parent: BuilderNode | null; list: BuilderNode[]; index: number } | null {
    for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) return { parent, list: nodes, index: i };
        const children = nodes[i].children;
        if (children) {
            const hit = findParent(children, id, nodes[i]);
            if (hit) return hit;
        }
    }
    return null;
}

function containsNode(node: BuilderNode, id: string): boolean {
    if (node.id === id) return true;
    return (node.children ?? []).some((c) => containsNode(c, id));
}

/** `group` is presentational — it does not add a data-path segment; `object` and `list` do. */
function contributesPathSegment(type: string): boolean {
    return type !== 'group';
}

// ── Naming ────────────────────────────────────────────────────────────────────────

function uniqueName(siblings: BuilderNode[], base: string, exceptId?: string): string {
    const taken = new Set(siblings.filter((n) => n.id !== exceptId).map((n) => n.name));
    if (!taken.has(base)) return base;
    let i = 2;
    while (taken.has(`${base}_${i}`)) i += 1;
    return `${base}_${i}`;
}

// ── Factory ───────────────────────────────────────────────────────────────────────

export function createFormBuilder(initial?: BuilderDoc): BuilderApi {
    const doc = ref<BuilderDoc>(initial ?? emptyDoc());
    const selectedId = ref<string | null>(null);
    const dirty = ref(false);

    const selectedNode = computed(() =>
        selectedId.value ? findNode(doc.value.nodes, selectedId.value) : null,
    );

    const schema = computed(() => compile(doc.value));

    // ── History ───────────────────────────────────────────────────────────────
    const past = ref<string[]>([]);
    const future = ref<string[]>([]);
    /**
     * Consecutive edits sharing a key collapse into one undo entry, so typing a label
     * is one Ctrl+Z rather than one per keystroke. Cleared by any other kind of edit.
     */
    let lastCoalesceKey: string | null = null;

    const canUndo = computed(() => past.value.length > 0);
    const canRedo = computed(() => future.value.length > 0);

    /**
     * Runs a mutation and records it. Snapshots before and after so a no-op (a drop
     * that changed nothing, a rename to the same value) never lands in the history.
     */
    function mutate<T>(fn: () => T, coalesceKey?: string): T {
        const before = JSON.stringify(doc.value);
        const result = fn();
        const after = JSON.stringify(doc.value);
        if (before === after) return result;

        if (coalesceKey === undefined || coalesceKey !== lastCoalesceKey) {
            past.value.push(before);
            if (past.value.length > HISTORY_LIMIT) past.value.shift();
        }
        lastCoalesceKey = coalesceKey ?? null;
        future.value = [];
        dirty.value = true;
        return result;
    }

    /** Selection may point at a node the restored document no longer contains. */
    function reconcileSelection() {
        if (selectedId.value && !findNode(doc.value.nodes, selectedId.value)) {
            selectedId.value = null;
        }
    }

    function undo() {
        const previous = past.value.pop();
        if (previous === undefined) return;
        future.value.push(JSON.stringify(doc.value));
        doc.value = JSON.parse(previous);
        lastCoalesceKey = null;
        dirty.value = true;
        reconcileSelection();
    }

    function redo() {
        const next = future.value.pop();
        if (next === undefined) return;
        past.value.push(JSON.stringify(doc.value));
        doc.value = JSON.parse(next);
        lastCoalesceKey = null;
        dirty.value = true;
        reconcileSelection();
    }

    function select(id: string | null) {
        // Ends any run of coalesced property edits on the previous selection.
        lastCoalesceKey = null;
        selectedId.value = id;
    }

    function canDrop(draggedId: string, target: DropTarget): boolean {
        // A node cannot be dropped inside its own subtree.
        if (target.parentId !== null) {
            const dragged = findNode(doc.value.nodes, draggedId);
            if (dragged && containsNode(dragged, target.parentId)) return false;

            const parent = findNode(doc.value.nodes, target.parentId);
            if (!parent || !isContainerType(parent.type)) return false;
            // A list holds exactly one child template.
            if (isSingleChildContainer(parent.type)) {
                const children = parent.children ?? [];
                if (children.length > 0 && !children.some((c) => c.id === draggedId)) return false;
            }
        }
        return true;
    }

    function addNodeImpl(paletteItemId: string, target: DropTarget): BuilderNode | null {
        // A palette entry may be a preset of an element type (Number -> text with
        // inputType number), so resolve the item first, then its element definition.
        const item = getPaletteItem(paletteItemId);
        if (!item) return null;
        const def = getElementDef(item.type);
        if (!def) return null;

        const list = childListOf(doc.value, target.parentId);
        if (!list) return null;

        if (target.parentId !== null) {
            const parent = findNode(doc.value.nodes, target.parentId)!;
            if (isSingleChildContainer(parent.type) && list.length > 0) return null;
        }

        const node: BuilderNode = {
            id: newNodeId(),
            name: uniqueName(list, item.namePrefix ?? def.namePrefix),
            type: item.type,
            props: { ...clonePlain(def.defaults), ...clonePlain(item.defaults ?? {}) },
            ...(def.container ? { children: [] } : {}),
        };

        list.splice(Math.min(target.index, list.length), 0, node);
        selectedId.value = node.id;
        return node;
    }

    function moveNodeImpl(id: string, target: DropTarget): boolean {
        if (!canDrop(id, target)) return false;

        const found = findParent(doc.value.nodes, id);
        if (!found) return false;

        const destination = childListOf(doc.value, target.parentId);
        if (!destination) return false;

        const [node] = found.list.splice(found.index, 1);

        // Removing from the same list shifts everything after it down by one.
        let index = target.index;
        if (found.list === destination && found.index < index) index -= 1;

        node.name = uniqueName(destination, node.name, node.id);
        destination.splice(Math.min(index, destination.length), 0, node);
        return true;
    }

    function removeNodeImpl(id: string) {
        const found = findParent(doc.value.nodes, id);
        if (!found) return;
        found.list.splice(found.index, 1);
        if (selectedId.value === id) selectedId.value = null;
    }

    function duplicateNodeImpl(id: string) {
        const found = findParent(doc.value.nodes, id);
        if (!found) return;

        const source = found.list[found.index];
        const clone = clonePlain(source) as BuilderNode;

        const refreshIds = (n: BuilderNode) => {
            n.id = newNodeId();
            (n.children ?? []).forEach(refreshIds);
        };
        refreshIds(clone);
        clone.name = uniqueName(found.list, source.name);

        found.list.splice(found.index + 1, 0, clone);
        selectedId.value = clone.id;
    }

    /** Returns an error message, or null on success. */
    function renameNodeImpl(id: string, name: string): string | null {
        const trimmed = name.trim();
        if (!NAME_PATTERN.test(trimmed)) {
            return 'Use letters, digits and underscores, starting with a letter or underscore.';
        }

        const found = findParent(doc.value.nodes, id);
        if (!found) return 'Field no longer exists.';

        // Uniqueness is per sibling scope — nested containers create separate data paths.
        const clash = found.list.some((n) => n.id !== id && n.name === trimmed);
        if (clash) return `Another field here is already called "${trimmed}".`;

        found.list[found.index].name = trimmed;
        return null;
    }

    function patchPropsImpl(id: string, props: Record<string, unknown>) {
        const node = findNode(doc.value.nodes, id);
        if (!node) return;
        node.props = { ...node.props, ...props };
    }

    // Structural edits each get their own history entry; property and name edits
    // coalesce per node so a typing session is a single undo.
    const addNode = (itemId: string, target: DropTarget) => mutate(() => addNodeImpl(itemId, target));
    const moveNode = (id: string, target: DropTarget) => mutate(() => moveNodeImpl(id, target));
    const removeNode = (id: string) => mutate(() => removeNodeImpl(id));
    const duplicateNode = (id: string) => mutate(() => duplicateNodeImpl(id));
    const renameNode = (id: string, name: string) => mutate(() => renameNodeImpl(id, name), `name:${id}`);
    const patchProps = (id: string, props: Record<string, unknown>) =>
        mutate(() => patchPropsImpl(id, props), `props:${id}`);

    /** The data path a field's value lands on, which is what BPMN expressions read. */
    function pathOf(id: string): string {
        const segments: string[] = [];
        let current: string | null = id;

        while (current) {
            const found: ReturnType<typeof findParent> = findParent(doc.value.nodes, current);
            if (!found) break;
            const node = found.list[found.index];
            const isAncestor = node.id !== id;

            if (contributesPathSegment(node.type) || !isAncestor) {
                // A list's children repeat, so an ancestor list contributes an index slot.
                segments.unshift(isAncestor && node.type === 'list' ? `${node.name}[]` : node.name);
            }
            current = found.parent?.id ?? null;
        }

        return segments.join('.');
    }

    const replaceNodes = (nodes: BuilderNode[]) => mutate(() => {
        doc.value = { ...doc.value, nodes };
        reconcileSelection();
    });

    /** `static` holds no data and containers are addressed through their children. */
    const NON_DATA_TYPES = new Set(['static', 'group', 'object', 'list']);

    function fieldPaths(excludeId?: string): { value: string; label: string }[] {
        const out: { value: string; label: string }[] = [];
        const walk = (nodes: BuilderNode[]) => {
            for (const node of nodes) {
                if (node.id !== excludeId && !NON_DATA_TYPES.has(node.type)) {
                    const path = pathOf(node.id);
                    if (path) out.push({ value: path, label: path });
                }
                if (node.children) walk(node.children);
            }
        };
        walk(doc.value.nodes);
        return out;
    }

    function reset(next: BuilderDoc) {
        doc.value = next;
        selectedId.value = null;
        dirty.value = false;
        past.value = [];
        future.value = [];
        lastCoalesceKey = null;
    }

    const api: BuilderApi = {
        doc,
        selectedId,
        selectedNode,
        schema,
        dirty,
        select,
        addNode,
        moveNode,
        removeNode,
        duplicateNode,
        renameNode,
        patchProps,
        canDrop,
        pathOf,
        fieldPaths,
        reset,
        replaceNodes,
        undo,
        redo,
        canUndo,
        canRedo,
    };

    return api;
}

export function provideFormBuilder(initial?: BuilderDoc): BuilderApi {
    const api = createFormBuilder(initial);
    provide(BUILDER_KEY, api);
    return api;
}

export function useFormBuilder(): BuilderApi {
    const api = inject(BUILDER_KEY);
    if (!api) throw new Error('useFormBuilder() called outside a builder root.');
    return api;
}
