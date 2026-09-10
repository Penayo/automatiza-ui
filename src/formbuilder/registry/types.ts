import type { BuilderNode } from '../types';

export type PropTabKey = 'general' | 'validation' | 'layout' | 'conditions' | 'data';

/** What a tab schema can see about the rest of the form when it is built. */
export interface PropTabContext {
    /** Every other field's data path, for pickers like the conditions editor. */
    fieldPaths: { value: string; label: string }[];
}

export interface PropTab {
    key: PropTabKey;
    label: string;
    /**
     * A Vueform schema, keyed by the prop it edits. The properties panel renders this
     * with a real <Vueform>, so property editors get validation, conditions and columns
     * for free and the builder dogfoods the renderer it targets.
     *
     * The function form is for tabs that must reference the rest of the document — the
     * conditions editor needs a live list of the other fields' paths.
     */
    schema: Record<string, any> | ((ctx: PropTabContext) => Record<string, any>);
    /**
     * Optional projection for props whose stored shape differs from what is comfortable
     * to edit — e.g. `items` is an object map on the element but a list of
     * {value,label} pairs in the editor.
     */
    toForm?: (props: Record<string, unknown>) => Record<string, unknown>;
    /** `props` is the node's stored props, so entries the editor cannot represent survive. */
    fromForm?: (data: Record<string, unknown>, props: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * How one Vueform element type is edited. Keyed by `type`, so a node found in the tree
 * resolves to exactly one of these.
 */
export interface ElementDef {
    /** Vueform element type; resolved at render as `${upperFirst(camelCase(type))}Element`. */
    type: string;
    label: string;
    /** primeicons class, e.g. 'pi-align-left'. */
    icon: string;
    /** Absent for leaves. `object`/`group` nest under `schema`; `list` under `element`. */
    container?: 'object' | 'list';
    /** Seeds auto-generated names: 'text' -> text_1, text_2. */
    namePrefix: string;
    /** Props applied when the element is first dropped. */
    defaults: Record<string, unknown>;
    tabs: PropTab[];
    /** 'proxy' renders a placeholder instead of the real element (grid/matrix). */
    canvas?: 'live' | 'proxy';
    /** Escape hatch for element types whose schema entry is not a plain prop spread. */
    compile?: (node: BuilderNode) => Record<string, unknown>;
}

/**
 * One draggable entry in the palette.
 *
 * Deliberately NOT one-to-one with ElementDef: several palette entries can be presets of
 * the same Vueform type. Vueform has no NumberElement — a number field is a `text`
 * element with `inputType: 'number'` — and the same holds for email, password and tel.
 * Modelling those as presets keeps the compiled schema honest instead of emitting an
 * element type Vueform cannot resolve.
 */
export interface PaletteItem {
    /** Palette identity, and what the drag payload carries. */
    id: string;
    /** The Vueform element type this drops. */
    type: string;
    label: string;
    icon: string;
    category: string;
    description: string;
    /** Merged over the ElementDef's own defaults. */
    defaults?: Record<string, unknown>;
    /** Overrides the ElementDef's prefix so presets get their own naming. */
    namePrefix?: string;
}
