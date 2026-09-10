/**
 * Which renderer a stored form needs.
 *
 * Every runtime form surface asks this, so the "is it form-js?" test lives here once
 * instead of being spelled `!isJsonSchema && !isCustom` in six components — a shape that
 * silently treats anything unrecognised as form-js and mounts an empty viewer on it.
 */
export type FormEngine = 'formjs' | 'jsonschema' | 'vueform' | 'custom';

/** The three `type` values form-js forms have been saved under over time. */
const FORMJS_TYPES = new Set(['default', 'form', 'Form']);

export interface FormProblem {
    kind: 'unresolved' | 'unsupported';
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
    if (schema?.type === 'jsonschema') return { engine: 'jsonschema' };
    if (schema?.type === 'vueform') return { engine: 'vueform' };
    if (FORMJS_TYPES.has(schema?.type)) return { engine: 'formjs' };
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
