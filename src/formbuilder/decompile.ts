/**
 * decompile: VueformSchema -> BuilderDoc.
 *
 * The import path, used when there is no trustworthy builder doc: a hand-edited JSON
 * tab, an AI-generated schema, a schema pasted from elsewhere. Lossy by nature — it
 * mints fresh node ids and cannot recover `meta` — but it preserves every prop it does
 * not understand verbatim, so unknown props survive a decompile → compile round trip
 * even when the properties panel has no editor for them.
 */
import {
    BUILDER_VERSION,
    CONTAINER_CHILD_PROP,
    isContainerType,
    isSingleChildContainer,
    type BuilderDoc,
    type BuilderNode,
    type CompiledElement,
    type VueformSchema,
} from './types';

let idCounter = 0;

/** Node ids only need to be unique within a session — they are never persisted. */
export function newNodeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    idCounter += 1;
    return `node_${Date.now().toString(36)}_${idCounter}`;
}

function decompileNode(name: string, entry: Record<string, unknown>): BuilderNode {
    const { type, ...rest } = entry;
    const nodeType = typeof type === 'string' ? type : 'text';

    const node: BuilderNode = {
        id: newNodeId(),
        name,
        type: nodeType,
        props: rest,
    };

    if (isContainerType(nodeType)) {
        const childProp = CONTAINER_CHILD_PROP[nodeType];
        const raw = rest[childProp];
        // The child payload lives in `children`, not `props`, or compile() would emit it twice.
        delete (node.props as Record<string, unknown>)[childProp];

        if (isSingleChildContainer(nodeType)) {
            node.children = isPlainObject(raw)
                // A list's `element` is one unkeyed template; name it after its parent.
                ? [decompileNode(name, raw as CompiledElement)]
                : [];
        } else {
            node.children = isPlainObject(raw) ? decompileNodes(raw as VueformSchema) : [];
        }
    }

    return node;
}

function isPlainObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decompileNodes(schema: VueformSchema): BuilderNode[] {
    return Object.entries(schema)
        .filter(([, entry]) => isPlainObject(entry))
        .map(([name, entry]) => decompileNode(name, entry as CompiledElement));
}

export function decompile(
    schema: VueformSchema,
    formProps: Record<string, unknown> = {},
): BuilderDoc {
    return {
        builderVersion: BUILDER_VERSION,
        nodes: isPlainObject(schema) ? decompileNodes(schema) : [],
        formProps,
    };
}
