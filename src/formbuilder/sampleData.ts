/**
 * Example task variables for the builder Preview (forms spec §5.3): the payload a
 * process would plausibly hand this form, so every field shows a value on open.
 */
import type { VueformSchema } from './types';
import { formVariableKey, isFormVariableRef } from './formVariables';
import { DATA_TABLE_TYPE, getPath, normalizeColumns } from './seededSources';
import {
    SAMPLE_EMAIL, SAMPLE_LIST_LENGTH, SAMPLE_NUMBER, SAMPLE_PHONE, SAMPLE_URL,
    sampleNumber, sampleText, setPath, todayIso,
} from '@/utils/sampleData';

/** Elements that hold no value, or one a JSON box cannot fake (uploads, drawings). */
const NO_VALUE = new Set([
    'static', 'button', 'file', 'multifile', 'signature', 'documentList', 'matrix', DATA_TABLE_TYPE,
]);

const MULTI_CHOICE = new Set(['multiselect', 'checkboxgroup', 'tags']);
const SINGLE_CHOICE = new Set(['select', 'radiogroup']);

export const SAMPLE_OPTIONS = [
    { label: 'Option 1', value: 'option1' },
    { label: 'Option 2', value: 'option2' },
];

const NONE = Symbol('none');

function labelOf(el: Record<string, any>, name: string): string {
    return typeof el.label === 'string' && el.label.trim() ? el.label.trim() : name;
}

/** First option's value, whatever shape `items` was stored in. */
function firstOption(items: unknown): unknown {
    if (isFormVariableRef(items)) return SAMPLE_OPTIONS[0].value;
    if (Array.isArray(items)) {
        const first = items[0];
        return first !== null && typeof first === 'object' ? (first as any).value : first;
    }
    if (items && typeof items === 'object') return Object.keys(items)[0];
    return undefined;
}

/** Formatted columns get values their format can show (forms spec §5.5). */
function columnExample(col: ReturnType<typeof normalizeColumns>[number], n: number): unknown {
    switch (col.format) {
        case 'number':
        case 'currency': return SAMPLE_NUMBER * n + 0.5;
        case 'percent':  return 10 * n;
        case 'date':     return todayIso();
        default:         return `${sampleText(col.label)} ${n}`;
    }
}

export function deriveFormSample(schema: VueformSchema): Record<string, unknown> {
    const root: Record<string, unknown> = {};
    const tables: { path: string; cols: ReturnType<typeof normalizeColumns> }[] = [];

    const valueOf = (el: Record<string, any>, name: string): unknown => {
        if (el.default !== undefined && el.default !== null && el.default !== '') return el.default;

        if (isFormVariableRef(el.items)) {
            const key = formVariableKey(el.items);
            if (key) root[key] = SAMPLE_OPTIONS;
        }

        switch (el.type) {
            case 'object':
                return walk(el.schema ?? {}, {});
            case 'list': {
                const item = el.element && typeof el.element === 'object'
                    ? valueOf(el.element, name)
                    : sampleText(labelOf(el, name));
                if (item === NONE) return NONE;
                return Array.from({ length: SAMPLE_LIST_LENGTH }, () => structuredClone(item));
            }
            case 'text':
                switch (el.inputType) {
                    case 'number': return sampleNumber(el.min, el.max);
                    case 'email': return SAMPLE_EMAIL;
                    case 'tel': return SAMPLE_PHONE;
                    case 'url': return SAMPLE_URL;
                    default: return sampleText(labelOf(el, name));
                }
            case 'phone':
                return SAMPLE_PHONE;
            case 'amount':
                return SAMPLE_NUMBER;
            case 'slider':
                return sampleNumber(el.min ?? 0, el.max ?? 100);
            case 'checkbox':
            case 'toggle':
                return el.trueValue ?? true;
            case 'date':
                return todayIso();
            case 'dates':
                return [todayIso()];
        }

        if (SINGLE_CHOICE.has(el.type)) {
            const first = firstOption(el.items);
            return first === undefined ? NONE : first;
        }
        if (MULTI_CHOICE.has(el.type)) {
            const first = firstOption(el.items);
            return first === undefined ? NONE : [first];
        }
        return sampleText(labelOf(el, name));
    };

    function walk(nodes: Record<string, any>, target: Record<string, unknown>) {
        for (const [name, el] of Object.entries(nodes)) {
            if (!el || typeof el !== 'object') continue;

            if (el.type === DATA_TABLE_TYPE && typeof el.rowsFrom === 'string' && el.rowsFrom.trim()) {
                tables.push({ path: el.rowsFrom.trim(), cols: normalizeColumns(el.cols) });
            }
            if (NO_VALUE.has(el.type)) continue;

            // A group only lays its children out; their data sits at the group's level.
            if (el.type === 'group') {
                walk(el.schema ?? {}, target);
                continue;
            }

            const value = valueOf(el, name);
            if (value !== NONE) target[name] = value;
        }
        return target;
    }

    walk(schema ?? {}, root);

    // `rowsFrom` may name another field on this form. A list's own rows are kept; any
    // other example there (typically the `hidden` field carrying the variable) is a
    // string the table cannot show, so the rows replace it.
    for (const { path, cols } of tables) {
        if (!cols.length || Array.isArray(getPath(root, path))) continue;
        const rows = Array.from({ length: SAMPLE_LIST_LENGTH }, (_, i) => {
            const row: Record<string, any> = {};
            for (const col of cols) setPath(row, col.key, columnExample(col, i + 1));
            return row;
        });
        setPath(root, path, rows);
    }

    return root;
}
