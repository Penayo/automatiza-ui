/**
 * Shared property-tab fragments.
 *
 * Every value here is a Vueform schema keyed by the prop it edits, so the properties
 * panel needs no per-element code — see BuilderProperties.vue.
 */
import { formVariableKey, toFormVariableRef, isFormVariableRef } from '../formVariables';
import type { PropTab } from './types';

/** Label / description / placeholder — the props nearly every element has. */
export const LABEL_PROPS = {
    label: { type: 'text', label: 'Label' },
    description: { type: 'text', label: 'Description', description: 'Shown under the field.' },
} as const;

export const PLACEHOLDER_PROP = {
    placeholder: { type: 'text', label: 'Placeholder' },
} as const;

/**
 * Vueform has no number/email/password element — those are a `text` element with the
 * matching `inputType`. Exposing it here is what lets a text field become any of them.
 */
export const INPUT_TYPE_PROP = {
    inputType: {
        type: 'select',
        label: 'Input type',
        items: {
            text: 'Text',
            number: 'Number',
            email: 'Email',
            password: 'Password',
            tel: 'Telephone',
            url: 'URL',
        },
        default: 'text',
    },
} as const;

/** Vueform lays elements out on a 12-column grid. */
export const COLUMNS_PROP = {
    columns: {
        type: 'select',
        label: 'Width',
        items: { 12: 'Full width', 6: 'Half', 4: 'Third', 3: 'Quarter' },
        default: 12,
    },
} as const;

export function generalTab(extra: Record<string, any> = {}): PropTab {
    return {
        key: 'general',
        label: 'General',
        schema: { ...LABEL_PROPS, ...extra, ...COLUMNS_PROP },
    };
}

/**
 * Options editor for the select-likes.
 *
 * Vueform stores `items` as an object map ({ value: label }), which is awkward to edit
 * and cannot express ordering intent. The editor uses a Vueform `list` of {value,label}
 * pairs instead — an add/remove/reorder UI for free — and projects between the two.
 */
export const ITEMS_EDITOR = {
    formVariable: {
        type: 'text',
        label: 'Form Variable key',
        placeholder: 'e.g. countries',
        description: 'Fills the options from a tenant Form Variable. Overrides the static list below.',
    },
    items: {
        type: 'list',
        label: 'Options',
        addText: 'Add option',
        element: {
            type: 'object',
            schema: {
                value: { type: 'text', placeholder: 'value', columns: 5 },
                label: { type: 'text', placeholder: 'Label', columns: 7 },
            },
        },
    },
} as const;

type ItemPair = { value?: unknown; label?: unknown };

export function itemsToForm(props: Record<string, unknown>): Record<string, unknown> {
    const items = props.items;

    // A Form Variable reference lives in `items` as a marker string; surface it in its
    // own field so the static-list editor stays a list.
    if (isFormVariableRef(items)) {
        return { ...props, formVariable: formVariableKey(items) ?? '', items: [] };
    }

    if (Array.isArray(items)) {
        return {
            ...props,
            items: items.map((i) =>
                typeof i === 'object' && i !== null ? i : { value: i, label: i },
            ),
        };
    }
    if (typeof items === 'object' && items !== null) {
        return {
            ...props,
            items: Object.entries(items as Record<string, unknown>).map(([value, label]) => ({
                value,
                label,
            })),
        };
    }
    return { ...props, items: [] };
}

export function itemsFromForm(data: Record<string, unknown>): Record<string, unknown> {
    const variable = typeof data.formVariable === 'string' ? data.formVariable.trim() : '';
    if (variable) {
        // `formVariable` is builder-only — it must not reach the compiled schema.
        const { formVariable: _drop, ...rest } = data;
        return { ...rest, items: toFormVariableRef(variable) };
    }

    const pairs = Array.isArray(data.items) ? (data.items as ItemPair[]) : [];
    const items: Record<string, unknown> = {};
    for (const pair of pairs) {
        // A pair with no value has nothing to key on; the row is still being typed.
        if (pair?.value === undefined || pair.value === null || pair.value === '') continue;
        items[String(pair.value)] = pair.label ?? String(pair.value);
    }
    const { formVariable: _unused, ...rest } = data;
    return { ...rest, items };
}

/** General tab for elements carrying an `items` map. */
export function selectionGeneralTab(extra: Record<string, any> = {}): PropTab {
    return {
        key: 'general',
        label: 'General',
        schema: { ...LABEL_PROPS, ...extra, ...ITEMS_EDITOR, ...COLUMNS_PROP },
        toForm: itemsToForm,
        fromForm: itemsFromForm,
    };
}

// ── Validation ────────────────────────────────────────────────────────────────

/**
 * The subset of Vueform's 54 built-in rules worth exposing in a form builder.
 * Value is the rule name Vueform expects; `PARAMLESS` marks the ones that take none.
 */
export const RULE_ITEMS: Record<string, string> = {
    required: 'Required',
    email: 'Email address',
    url: 'URL',
    numeric: 'Numeric',
    integer: 'Whole number',
    alpha: 'Letters only',
    alpha_num: 'Letters and digits',
    alpha_dash: 'Letters, digits, - and _',
    accepted: 'Must be accepted (checkbox)',
    min: 'Minimum (min:N)',
    max: 'Maximum (max:N)',
    size: 'Exact size (size:N)',
    between: 'Between (between:1,10)',
    digits: 'Exact digits (digits:N)',
    in: 'One of (in:a,b,c)',
    not_in: 'Not one of (not_in:a,b)',
    regex: 'Matches pattern (regex:…)',
    same: 'Same as field (same:other)',
    different: 'Different from field (different:other)',
};

const PARAMLESS = new Set([
    'required', 'email', 'url', 'numeric', 'integer',
    'alpha', 'alpha_num', 'alpha_dash', 'accepted',
]);

export const RULES_EDITOR = {
    rules: {
        type: 'list',
        label: 'Validation rules',
        addText: 'Add rule',
        element: {
            type: 'object',
            schema: {
                rule: {
                    type: 'select',
                    items: RULE_ITEMS,
                    placeholder: 'Rule',
                    columns: 6,
                },
                param: {
                    type: 'text',
                    placeholder: 'Value',
                    description: 'Only for rules that take one — see the rule name.',
                    columns: 6,
                },
            },
        },
    },
} as const;

type RuleRow = { rule?: unknown; param?: unknown };

/** Split one stored rule ("min:3") into the editor's two fields. */
function parseRule(token: string): RuleRow {
    const at = token.indexOf(':');
    return at === -1
        ? { rule: token, param: '' }
        : { rule: token.slice(0, at), param: token.slice(at + 1) };
}

export function rulesToForm(props: Record<string, unknown>): Record<string, unknown> {
    const rules = props.rules;
    let rows: RuleRow[] = [];

    if (Array.isArray(rules)) {
        rows = rules.map((r) =>
            typeof r === 'string' ? parseRule(r)
                // Vueform also accepts the tuple form ['min', 3].
                : Array.isArray(r) ? { rule: r[0], param: r.slice(1).join(',') }
                    : { rule: '', param: '' },
        );
    } else if (typeof rules === 'string' && rules.trim()) {
        rows = rules.split('|').map(parseRule);
    }

    return { ...props, rules: rows };
}

export function rulesFromForm(data: Record<string, unknown>): Record<string, unknown> {
    const rows = Array.isArray(data.rules) ? (data.rules as RuleRow[]) : [];

    // Emitted as an ARRAY, never a "|"-joined string: a regex rule can legitimately
    // contain "|", which the string form has no way to escape.
    const rules = rows.reduce<string[]>((acc, row) => {
        const name = typeof row?.rule === 'string' ? row.rule.trim() : '';
        if (!name) return acc;                      // a half-filled row, still being edited

        const param = row.param === undefined || row.param === null ? '' : String(row.param).trim();
        acc.push(!param || PARAMLESS.has(name) ? name : `${name}:${param}`);
        return acc;
    }, []);

    return { ...data, rules };
}

export function validationTab(): PropTab {
    return {
        key: 'validation',
        label: 'Validation',
        schema: { ...RULES_EDITOR },
        toForm: rulesToForm,
        fromForm: rulesFromForm,
    };
}

// ── Conditions ────────────────────────────────────────────────────────────────

/**
 * Vueform's comparison operators (src/utils/compare.js). `==` and `!=` are set-aware:
 * an array on either side is treated as membership, which is why `in` / `not_in` are
 * aliases and how "one of these values" is expressed without an OR group.
 */
export const CONDITION_OPERATORS: Record<string, string> = {
    '==': 'is',
    '!=': 'is not',
    'in': 'is one of (a,b,c)',
    'not_in': 'is none of (a,b)',
    '>': 'greater than',
    '>=': 'greater or equal',
    '<': 'less than',
    '<=': 'less or equal',
    '^': 'starts with',
    '$': 'ends with',
    '*': 'contains',
    'empty': 'is empty',
    'not_empty': 'is not empty',
    'today': 'is today',
    'before': 'is before',
    'after': 'is after',
};

/** Operators that take no value — stored as a 2-tuple [path, operator]. */
const VALUELESS_OPERATORS = new Set(['empty', 'not_empty', 'today']);
/** Operators whose value is a list. */
const LIST_OPERATORS = new Set(['in', 'not_in']);

type ConditionRow = { field?: unknown; operator?: unknown; value?: unknown };

/**
 * True for the entry shapes this editor can represent: a 2- or 3-tuple of scalars.
 * Vueform also accepts OR groups (array of arrays), predicate functions and expression
 * strings — those stay authorable through the JSON tab and are preserved untouched.
 */
function isEditableCondition(entry: unknown): entry is unknown[] {
    if (!Array.isArray(entry)) return false;
    if (entry.length < 2 || entry.length > 3) return false;
    return typeof entry[0] === 'string' && !Array.isArray(entry[1]);
}

function stringifyValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    if (Array.isArray(value)) return value.join(',');
    return typeof value === 'string' ? value : JSON.stringify(value);
}

/** "3" -> 3, "true" -> true, "a,b" -> ['a','b'] for list operators, else the raw string. */
function parseValue(raw: string, operator: string): unknown {
    const text = raw.trim();
    if (LIST_OPERATORS.has(operator)) {
        return text ? text.split(',').map((v) => v.trim()).filter(Boolean) : [];
    }
    if (text === '') return '';
    if (text === 'true') return true;
    if (text === 'false') return false;
    if (text === 'null') return null;
    const asNumber = Number(text);
    return Number.isFinite(asNumber) && text === String(asNumber) ? asNumber : text;
}

export function conditionsToForm(props: Record<string, unknown>): Record<string, unknown> {
    const raw = Array.isArray(props.conditions) ? props.conditions : [];
    const rows: ConditionRow[] = [];

    for (const entry of raw) {
        if (!isEditableCondition(entry)) continue;
        if (entry.length === 2) {
            const second = String(entry[1]);
            // A 2-tuple is [path, operator] for the valueless ops, [path, expected] otherwise.
            rows.push(VALUELESS_OPERATORS.has(second)
                ? { field: entry[0], operator: second, value: '' }
                : { field: entry[0], operator: '==', value: stringifyValue(entry[1]) });
        } else {
            rows.push({ field: entry[0], operator: String(entry[1]), value: stringifyValue(entry[2]) });
        }
    }

    return { ...props, conditions: rows };
}

export function conditionsFromForm(
    data: Record<string, unknown>,
    props: Record<string, unknown>,
): Record<string, unknown> {
    const rows = Array.isArray(data.conditions) ? (data.conditions as ConditionRow[]) : [];

    const built = rows.reduce<unknown[][]>((acc, row) => {
        const field = typeof row?.field === 'string' ? row.field.trim() : '';
        if (!field) return acc;                     // a row still being filled in

        const operator = typeof row.operator === 'string' && row.operator ? row.operator : '==';
        if (VALUELESS_OPERATORS.has(operator)) acc.push([field, operator]);
        else acc.push([field, operator, parseValue(String(row.value ?? ''), operator)]);
        return acc;
    }, []);

    // Anything the editor cannot represent (OR groups, functions, expression strings)
    // is carried through verbatim rather than dropped by an edit in this tab.
    const preserved = (Array.isArray(props.conditions) ? props.conditions : [])
        .filter((entry) => !isEditableCondition(entry));

    return { ...data, conditions: [...built, ...preserved] };
}

/** How many stored conditions this editor cannot show — surfaced as a notice. */
export function countUneditableConditions(props: Record<string, unknown>): number {
    const raw = Array.isArray(props.conditions) ? props.conditions : [];
    return raw.filter((entry) => !isEditableCondition(entry)).length;
}

export function conditionsTab(): PropTab {
    return {
        key: 'conditions',
        label: 'Conditions',
        // Built per selection so the field picker lists the current document's paths.
        schema: (ctx) => ({
            conditions: {
                type: 'list',
                label: 'Show this element when',
                description: 'All rows must be true. A hidden element is also removed from the submitted data.',
                addText: 'Add condition',
                element: {
                    type: 'object',
                    schema: {
                        field: {
                            type: 'select',
                            items: Object.fromEntries(ctx.fieldPaths.map((f) => [f.value, f.label])),
                            placeholder: 'Field',
                            search: true,
                            columns: 5,
                        },
                        operator: {
                            type: 'select',
                            items: CONDITION_OPERATORS,
                            default: '==',
                            columns: 4,
                        },
                        value: { type: 'text', placeholder: 'Value', columns: 3 },
                    },
                },
            },
        }),
        toForm: conditionsToForm,
        fromForm: conditionsFromForm,
    };
}

// ── Computed values ───────────────────────────────────────────────────────────

/**
 * Vueform's `expression` prop computes an element's value from other fields.
 * References go in {braces}; the element re-evaluates only when the fields it actually
 * names change (useValue.js `expressionDeps`). Parser is expr-eval-fork with logical,
 * comparison and `in` operators plus SUM / AVG / NOT / EMPTY / NOT_EMPTY.
 */
export const EXPRESSION_PROP = {
    expression: {
        type: 'text',
        label: 'Computed value',
        placeholder: '{qty} * {price}',
        description: 'Leave empty for a normal field. Reference other fields by name in {braces}. Functions: SUM, AVG, NOT, EMPTY, NOT_EMPTY.',
    },
} as const;

/** A computed field the user can still type into is usually a mistake. */
export const READONLY_PROP = {
    readonly: { type: 'toggle', label: 'Read-only' },
} as const;

// ── Matrix ────────────────────────────────────────────────────────────────────

/**
 * `cols` and `rows` accept the same shapes as `items` — an object map, an array of
 * scalars, or an array of {value,label} (useCells.js resolvedColumns). `rows` has one
 * extra form: a NUMBER, which means dynamic rows the user can add and remove.
 */
const MATRIX_PAIR_ELEMENT = {
    type: 'object',
    schema: {
        value: { type: 'text', placeholder: 'value', columns: 5 },
        label: { type: 'text', placeholder: 'Label', columns: 7 },
    },
} as const;

export const MATRIX_EDITOR = {
    inputType: {
        type: 'select',
        label: 'Cell input',
        items: {
            text: 'Text',
            number: 'Number',
            textarea: 'Textarea',
            select: 'Select',
            radio: 'Radio',
            checkbox: 'Checkbox',
            toggle: 'Toggle',
        },
        default: 'text',
    },
    cols: { type: 'list', label: 'Columns', addText: 'Add column', element: MATRIX_PAIR_ELEMENT },
    rows: { type: 'list', label: 'Rows', addText: 'Add row', element: MATRIX_PAIR_ELEMENT },
    dynamicRows: {
        type: 'text',
        inputType: 'number',
        label: 'Dynamic rows',
        description: 'Set a number to let people add and remove rows instead of using fixed row labels.',
    },
    items: {
        type: 'list',
        label: 'Cell choices',
        addText: 'Add choice',
        description: 'Only used when the cell input is select, radio or checkbox.',
        element: MATRIX_PAIR_ELEMENT,
    },
} as const;

/** Any of the accepted shapes -> the editor's {value,label} rows. */
function pairsToRows(value: unknown): ItemPair[] {
    if (Array.isArray(value)) {
        return value.map((v) =>
            typeof v === 'object' && v !== null ? (v as ItemPair) : { value: v, label: v },
        );
    }
    if (typeof value === 'object' && value !== null) {
        return Object.entries(value as Record<string, unknown>).map(([k, label]) => ({ value: k, label }));
    }
    return [];
}

/** Editor rows -> the object map Vueform stores. */
function rowsToMap(rows: unknown): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const row of Array.isArray(rows) ? (rows as ItemPair[]) : []) {
        if (row?.value === undefined || row.value === null || row.value === '') continue;
        out[String(row.value)] = row.label ?? String(row.value);
    }
    return out;
}

export function matrixToForm(props: Record<string, unknown>): Record<string, unknown> {
    const rowsIsCount = typeof props.rows === 'number';
    return {
        ...props,
        cols: pairsToRows(props.cols),
        rows: rowsIsCount ? [] : pairsToRows(props.rows),
        dynamicRows: rowsIsCount ? props.rows : '',
        items: pairsToRows(props.items),
    };
}

export function matrixFromForm(data: Record<string, unknown>): Record<string, unknown> {
    const { dynamicRows, ...rest } = data;
    const count = Number(dynamicRows);
    const useDynamicRows = Number.isFinite(count) && count > 0;

    return {
        ...rest,
        cols: rowsToMap(data.cols),
        // A number here is the dynamic-rows mode; a map is fixed row labels.
        rows: useDynamicRows ? count : rowsToMap(data.rows),
        items: rowsToMap(data.items),
    };
}

export function matrixGeneralTab(): PropTab {
    return {
        key: 'general',
        label: 'General',
        schema: { ...LABEL_PROPS, ...MATRIX_EDITOR, ...COLUMNS_PROP },
        toForm: matrixToForm,
        fromForm: matrixFromForm,
    };
}

/**
 * Matrix layout.
 *
 * The spreadsheet look comes from the `matrix-table` PRESET, not from props: every
 * cell-border rule in the shipped CSS is scoped under a `.vf-matrix-table` container,
 * which only that preset adds (themes/vueform/presets.js). It also forces
 * `gap: 0 !important`, so the `gap` prop cannot produce the effect on its own — which
 * is why setting it looked like nothing happened.
 */
export const MATRIX_LAYOUT = {
    tableStyle: {
        type: 'toggle',
        label: 'Spreadsheet style',
        description: 'Flush cells with borders, like a table. Off gives spaced-apart inputs.',
    },
    padding: { type: 'toggle', label: 'Cell padding', columns: 6 },
    minWidth: {
        type: 'text',
        inputType: 'number',
        label: 'Min width (px)',
        description: 'Below this the table scrolls horizontally instead of squashing.',
        columns: 6,
    },
    scrollable: { type: 'toggle', label: 'Scroll horizontally', columns: 6 },
    stickyCols: { type: 'toggle', label: 'Sticky first column', columns: 6 },
    stickyRows: { type: 'toggle', label: 'Sticky header row', columns: 6 },
    hideCols: { type: 'toggle', label: 'Hide column headers', columns: 6 },
    hideRows: { type: 'toggle', label: 'Hide row labels', columns: 6 },
    colWrap: { type: 'toggle', label: 'Wrap column headers', columns: 6 },
    rowWrap: { type: 'toggle', label: 'Wrap row labels', columns: 6 },
    canAdd: { type: 'toggle', label: 'People can add rows', columns: 6 },
    canRemove: { type: 'toggle', label: 'People can remove rows', columns: 6 },
} as const;

/** Number inputs come back as strings; gap and minWidth are compared numerically. */
function coerceNumber(value: unknown): unknown {
    if (value === '' || value === null || value === undefined) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
}

export function matrixLayoutTab(): PropTab {
    return {
        key: 'layout',
        label: 'Layout',
        schema: { ...MATRIX_LAYOUT },
        toForm: (props) => ({
            ...props,
            tableStyle: Array.isArray(props.presets) && props.presets.includes('matrix-table'),
        }),
        fromForm: (data) => {
            const { tableStyle, ...rest } = data;
            // Preserve any other presets the schema already carries.
            const others = (Array.isArray(rest.presets) ? rest.presets : [])
                .filter((p) => p !== 'matrix-table');
            return {
                ...rest,
                presets: tableStyle ? [...others, 'matrix-table'] : others,
                minWidth: coerceNumber(rest.minWidth),
            };
        },
    };
}
