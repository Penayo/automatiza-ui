/**
 * Which renderer a stored form needs.
 *
 * Every runtime form surface asks this, so the "can anything render this?" test lives
 * here once instead of being spelled out in six components — a shape that silently
 * treated anything unrecognised as form-js and mounted an empty viewer on it.
 *
 * Only Vueform builds forms now. The form-js designer and the JSON-Schema editor were
 * removed, so a form stored under one of their types is *unsupported*: it resolves to a
 * problem and the surface shows FormUnavailable rather than a blank frame.
 */
export type FormEngine = 'vueform' | 'custom';

/** Legacy `type` values — forms the removed editors produced. Nothing renders these. */
const RETIRED_TYPES = new Set(['default', 'form', 'Form', 'jsonschema']);

export interface FormProblem {
    kind: 'unresolved' | 'unsupported' | 'retired';
    /** The form key from the BPMN diagram, when the backend could name it. */
    ref?: string;
    type?: string;
}

/**
 * Returns the engine, or a problem describing why nothing can render this.
 * `null` schema means no form is configured at all, which is legitimate — callers
 * handle that before asking.
 */
export function resolveFormEngine(schema: any): { engine: FormEngine } | { problem: FormProblem } {
    if (schema?.type === 'unresolved') {
        return { problem: { kind: 'unresolved', ref: schema.ref } };
    }
    if (schema?.type === 'custom') return { engine: 'custom' };
    if (schema?.type === 'vueform') return { engine: 'vueform' };
    if (RETIRED_TYPES.has(schema?.type)) {
        return { problem: { kind: 'retired', type: schema?.type } };
    }
    return { problem: { kind: 'unsupported', type: schema?.type } };
}

export function formEngineOf(schema: any): FormEngine | null {
    const result = resolveFormEngine(schema);
    return 'engine' in result ? result.engine : null;
}

export function formProblemOf(schema: any): FormProblem | null {
    if (!schema) return null;
    const result = resolveFormEngine(schema);
    return 'problem' in result ? result.problem : null;
}

/**
 * The outcome of a submit attempt. `ok: false` means the engine refused — the form is
 * already showing its own validation messages and the caller must not proceed.
 */
export type SubmitResult =
    | { ok: true; data: Record<string, any> }
    | { ok: false; errors: unknown };
