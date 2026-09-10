/**
 * Builder document model.
 *
 * Vueform's own schema is an insertion-ordered object keyed by field name, which is
 * hostile to editing: reordering means rebuilding the object, renaming means
 * delete-and-reinsert (losing position), and `FormElements.vue` does `v-bind="element"`
 * — so any builder-only key would leak into the DOM as an attribute.
 *
 * So the builder tree below is the source of truth and the Vueform schema is a derived
 * artifact. Both are persisted; see `VueformPayload`.
 */

/** Container elements and how Vueform nests their children. */
export const CONTAINER_CHILD_PROP = {
    /** ObjectElement/GroupElement hold a nested keyed object under `schema`. */
    object: 'schema',
    group: 'schema',
    /** ListElement holds exactly one child template under `element`. */
    list: 'element',
} as const;

export type ContainerType = keyof typeof CONTAINER_CHILD_PROP;

export function isContainerType(type: string): type is ContainerType {
    return type in CONTAINER_CHILD_PROP;
}

/** `list` holds a single child template, not a collection. */
export function isSingleChildContainer(type: string): boolean {
    return type === 'list';
}

export interface BuilderNode {
    /** Stable identity for drag-and-drop and selection. Never compiled into the schema. */
    id: string;
    /** Becomes the Vueform schema key, and therefore a segment of the data path. */
    name: string;
    /** Vueform element type, e.g. 'text'. Resolved as `${upperFirst(camelCase(type))}Element`. */
    type: string;
    /** Everything that compiles into the element's schema entry. */
    props: Record<string, unknown>;
    /** object/group: any number of children. list: exactly one. Leaves: undefined. */
    children?: BuilderNode[];
    /** Builder-only state. Never compiled into the schema. */
    meta?: { collapsed?: boolean; note?: string };
}

export interface BuilderDoc {
    builderVersion: 1;
    nodes: BuilderNode[];
    /** Form-level Vueform props: size, columns, displayErrors, floatPlaceholders… */
    formProps: Record<string, unknown>;
}

/**
 * One compiled element entry. `type` is always present — compile() sets it from the
 * node — which is what makes the result assignable to Vueform's own schema prop type.
 */
export interface CompiledElement {
    type: string;
    [key: string]: unknown;
}

/** A compiled Vueform schema: `{ [name]: { type, ...props } }`, insertion-ordered. */
export type VueformSchema = Record<string, CompiledElement>;

/**
 * What gets stored on `IForm.vueform`. The server treats this as an opaque object
 * (`@IsOptional() @IsObject()`), exactly as it does `jsonSchema`.
 */
export interface VueformPayload {
    builderVersion: 1;
    /** Source of truth. */
    doc: BuilderDoc;
    /** Derived from `doc` via compile(). Stored so runtime renderers never import the builder. */
    schema: VueformSchema;
    /** Guards against `doc` and `schema` drifting apart. See loadPayload(). */
    schemaHash: string;
}

export const BUILDER_VERSION = 1 as const;

/** Vueform field names become data-path segments, so they must be identifier-shaped. */
export const NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function emptyDoc(): BuilderDoc {
    return { builderVersion: BUILDER_VERSION, nodes: [], formProps: {} };
}
