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
    type BuilderStep,
    type CompiledElement,
    type VueformSchema,
    type VueformSteps,
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
    steps?: VueformSteps,
): BuilderDoc {
    const nodes = isPlainObject(schema) ? decompileNodes(schema) : [];
    const doc: BuilderDoc = { builderVersion: BUILDER_VERSION, nodes, formProps };

    if (!isPlainObject(steps) || !Object.keys(steps!).length) return doc;

    // Step ids are session-local, so they are minted fresh; membership is recovered by
    // element name, which is how Vueform itself expresses it.
    const byName = new Map(nodes.map((n) => [n.name, n]));
    const builderSteps: BuilderStep[] = [];

    for (const [name, entry] of Object.entries(steps!)) {
        const step: BuilderStep = {
            id: newNodeId(),
            name,
            label: typeof entry?.label === 'string' ? entry.label : name,
            ...(Array.isArray(entry?.conditions) ? { conditions: entry.conditions } : {}),
            ...(isPlainObject(entry?.labels) ? { labels: entry!.labels } : {}),
            ...(isPlainObject(entry?.buttons) ? { buttons: entry!.buttons } : {}),
        };
        builderSteps.push(step);

        for (const elementName of Array.isArray(entry?.elements) ? entry.elements : []) {
            // A name listed but absent from the schema is simply dropped — exactly what
            // Vueform's own orderedSchema does at render time.
            const node = byName.get(elementName);
            if (node) node.stepId = step.id;
        }
    }

    doc.steps = builderSteps;
    return doc;
}
