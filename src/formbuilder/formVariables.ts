/**
 * Form Variables in a Vueform schema.
 *
 * A Form Variable is a tenant-scoped named option list (countries, branches, …) so a
 * dropdown does not hard-code its choices. form-js expresses the reference as a FEEL
 * `valuesExpression`; Vueform has no equivalent, and its `items` prop treats a bare
 * string as a *remote URL* — so the reference is stored as a prefixed marker instead
 * and swapped for the resolved list before Vueform ever sees the schema.
 *
 * The engine injects the resolved lists into formData (see
 * FormVariableService.resolveForSchema), which is what `data` here holds.
 */
import type { VueformSchema } from './types';

export const FORM_VARIABLE_PREFIX = '$formVariable:';

export function isFormVariableRef(items: unknown): items is string {
    return typeof items === 'string' && items.startsWith(FORM_VARIABLE_PREFIX);
}

export function formVariableKey(items: unknown): string | null {
    return isFormVariableRef(items) ? items.slice(FORM_VARIABLE_PREFIX.length).trim() || null : null;
}

export function toFormVariableRef(key: string): string {
    return `${FORM_VARIABLE_PREFIX}${key.trim()}`;
}

/**
 * Replace every `items: "$formVariable:key"` with the resolved option list.
 *
 * An unresolved key becomes an empty list rather than being left in place: leaving the
 * marker would make Vueform issue an HTTP request to a nonsense URL. Runs over a deep
 * copy, so the stored schema keeps its markers and round-trips unchanged.
 */
export function resolveFormVariables(
    schema: VueformSchema,
    data: Record<string, any> = {},
): VueformSchema {
    const walk = (node: any): any => {
        if (node === null || typeof node !== 'object') return node;
        if (Array.isArray(node)) return node.map(walk);

        const out: Record<string, any> = {};
        for (const [key, value] of Object.entries(node)) {
            if (key === 'items' && isFormVariableRef(value)) {
                const variable = formVariableKey(value);
                const resolved = variable ? data[variable] : undefined;
                out.items = Array.isArray(resolved) ? resolved : [];
            } else {
                out[key] = walk(value);
            }
        }
        return out;
    };

    return walk(schema ?? {}) as VueformSchema;
}
