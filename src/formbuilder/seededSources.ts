/**
 * Schema props that name a variable instead of hard-coding their content: a
 * documentList's checklist (`documentsFrom`) and a dataTable's rows (`rowsFrom`).
 *
 * "Somewhere else" is two places, and neither can cover the other:
 *
 *   - Another field on the same form. The element reads `form$.data` itself, so it
 *     re-renders as the user answers. Nothing here is involved.
 *   - A process variable seeded into the form. Vueform's `data` only ever holds keys
 *     that have an element, so a variable the form does not also *ask* for is invisible
 *     to the element — it has to be folded into the schema before render, which is what
 *     this does. Same reason resolveFormVariables() exists.
 *
 * Runs over a deep copy: the stored schema keeps its `*From` props and round-trips
 * unchanged through the builder.
 */
import type { VueformSchema } from './types';

export const DOCUMENT_LIST_TYPE = 'documentList';
export const DATA_TABLE_TYPE = 'dataTable';

/** The checklist shape the element renders. Bare strings are their own label. */
export interface DocumentSpec {
    key: string;
    label: string;
}

export function normalizeDocuments(list: unknown): DocumentSpec[] {
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry) => {
        if (typeof entry === 'string') return [{ key: entry, label: entry }];
        if (entry && typeof entry === 'object' && 'key' in entry) {
            const { key, label } = entry as { key: unknown; label?: unknown };
            if (key === undefined || key === null || key === '') return [];
            return [{ key: String(key), label: String(label ?? key) }];
        }
        return [];
    });
}

/** A dataTable column. `align` is passed straight to the cell's text-align. */
export interface ColumnSpec {
    key: string;
    label: string;
    align?: 'left' | 'center' | 'right';
}

/** Same leniency as normalizeDocuments: a bare string is its own label. */
export function normalizeColumns(list: unknown): ColumnSpec[] {
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry) => {
        if (typeof entry === 'string') return [{ key: entry, label: entry }];
        if (entry && typeof entry === 'object' && 'key' in entry) {
            const { key, label, align } = entry as Record<string, unknown>;
            if (key === undefined || key === null || key === '') return [];
            return [{
                key: String(key),
                label: String(label ?? key),
                ...(align ? { align: align as ColumnSpec['align'] } : {}),
            }];
        }
        return [];
    });
}

/**
 * Columns derived from the rows themselves, for a table nobody has configured yet.
 *
 * Every row is scanned, not just the first: rows from a REST or datasource task are
 * routinely ragged, and keying off row 0 would hide a column the rest of them have.
 * Insertion order is first-seen order, which is the closest thing to the author's
 * intent available here.
 */
export function columnsFromRows(rows: unknown): ColumnSpec[] {
    if (!Array.isArray(rows)) return [];
    const keys = new Set<string>();
    for (const row of rows) {
        if (row === null || typeof row !== 'object' || Array.isArray(row)) continue;
        for (const key of Object.keys(row)) keys.add(key);
    }
    return [...keys].map((key) => ({ key, label: key }));
}

export function resolveSeededSources(
    schema: VueformSchema,
    data: Record<string, any> = {},
): VueformSchema {
    const walk = (node: any): any => {
        if (node === null || typeof node !== 'object') return node;
        if (Array.isArray(node)) return node.map(walk);

        const out: Record<string, any> = {};
        for (const [key, value] of Object.entries(node)) out[key] = walk(value);

        // Only a real array wins in either case. An unset variable leaves the static
        // list alone, so a form authored with both still renders its fallback.
        if (out.type === DOCUMENT_LIST_TYPE && typeof out.documentsFrom === 'string') {
            const seeded = data[out.documentsFrom.trim()];
            if (Array.isArray(seeded)) out.documents = normalizeDocuments(seeded);
        }

        if (out.type === DATA_TABLE_TYPE && typeof out.rowsFrom === 'string') {
            const seeded = data[out.rowsFrom.trim()];
            // Rows are handed over as-is: the element normalises scalars and derives
            // columns, and doing it here would bake that guess into the render path.
            if (Array.isArray(seeded)) out.rows = seeded;
        }

        return out;
    };

    return walk(schema ?? {}) as VueformSchema;
}
