/**
 * compile: BuilderDoc -> VueformSchema.
 *
 * Pure and total — no Vue imports, no throwing. Kept free of framework code so the
 * round-trip suite can cover it under the existing Vitest setup.
 */
import {
    CONTAINER_CHILD_PROP,
    isContainerType,
    isSingleChildContainer,
    type BuilderDoc,
    type BuilderNode,
    type CompiledElement,
    type VueformSchema,
} from './types';

/**
 * Compile one node into its schema entry.
 *
 * Dropping `id` and `meta` is a correctness requirement, not tidiness: Vueform's
 * `FormElements.vue` renders `v-bind="element"`, so any key it does not recognise
 * falls through onto the DOM node as an attribute.
 */
function compileNode(node: BuilderNode): CompiledElement {
    const entry: CompiledElement = { ...node.props, type: node.type };

    if (isContainerType(node.type)) {
        const childProp = CONTAINER_CHILD_PROP[node.type];
        const children = node.children ?? [];

        if (isSingleChildContainer(node.type)) {
            // ListElement carries a single child template under `element`, unkeyed.
            const [first] = children;
            if (first) entry[childProp] = compileNode(first);
        } else {
            entry[childProp] = compileNodes(children);
        }
    }

    return entry;
}

function compileNodes(nodes: BuilderNode[]): VueformSchema {
    const schema: VueformSchema = {};
    // Insertion order is render order in Vueform, so this loop is the ordering contract.
    for (const node of nodes) {
        schema[node.name] = compileNode(node);
    }
    return schema;
}

export function compile(doc: BuilderDoc): VueformSchema {
    return compileNodes(doc.nodes);
}

/**
 * Stable stringify — key order must not depend on object construction order, or the
 * hash would change without the schema changing.
 */
function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

    const entries = Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`);
    return `{${entries.join(',')}}`;
}

/**
 * FNV-1a over the stable serialisation. Not cryptographic — this only has to detect
 * that `doc` and `schema` drifted apart (JSON tab edited, AI rewrite, server migration).
 */
export function hashSchema(schema: VueformSchema): string {
    const input = stableStringify(schema);
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
