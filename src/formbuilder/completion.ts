/**
 * Per-form completion text: the title and message shown after a task is submitted.
 * See docs/specs/frontend-forms-editor-and-renderer.spec.md §5.2.
 */
import { getPath } from './seededSources';
import type { FormCompletion } from './types';

/** `{path}`, with the same identifier rules as a field name plus dots. */
const PLACEHOLDER = /\{\s*([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*)\s*\}/g;

function display(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.map(display).filter(Boolean).join(', ');
    if (typeof value === 'object') return '';
    return String(value);
}

/** Replaces `{path}` with the value at that path. The result is plain text. */
export function interpolate(text: string, vars: Record<string, unknown>): string {
    return text.replace(PLACEHOLDER, (_, path: string) => display(getPath(vars, path)));
}

/** Trimmed, and `undefined` when both values are empty, so the payload omits it. */
export function normalizeCompletion(completion: FormCompletion | null | undefined): FormCompletion | undefined {
    const title = completion?.title?.trim();
    const message = completion?.message?.trim();
    if (!title && !message) return undefined;
    return { ...(title ? { title } : {}), ...(message ? { message } : {}) };
}

/**
 * The completion text a submitted form should show, placeholders resolved.
 * Each value is null when the form does not set it, so the caller keeps its default.
 */
export function resolveCompletion(
    form: { vueform?: { completion?: FormCompletion } } | null | undefined,
    vars: Record<string, unknown>,
): { title: string | null; message: string | null } {
    const completion = normalizeCompletion(form?.vueform?.completion);
    return {
        title: completion?.title ? interpolate(completion.title, vars) : null,
        message: completion?.message ? interpolate(completion.message, vars) : null,
    };
}
