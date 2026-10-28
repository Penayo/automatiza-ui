/**
 * Shared building blocks for the designer Previews' example data (forms spec §5.3).
 *
 * Every designer (form, email template, report, decision) derives its own shape from
 * its own design; the values and the "is this box empty?" test are the same everywhere,
 * so a field typed `email` looks alike in all four previews.
 */

/** Lists, loops and table rows get this many items: enough to show repetition. */
export const SAMPLE_LIST_LENGTH = 2;

export const SAMPLE_NUMBER = 100;
export const SAMPLE_EMAIL = 'jane.doe@example.com';
export const SAMPLE_PHONE = '+15555550100';
export const SAMPLE_URL = 'https://example.com';

export function sampleText(name: string): string {
    return `Sample ${name}`;
}

/** `min`/`max` that are not numbers are ignored. */
export function sampleNumber(min?: unknown, max?: unknown): number {
    let value = SAMPLE_NUMBER;
    if (typeof max === 'number' && value > max) value = max;
    if (typeof min === 'number' && value < min) value = min;
    return value;
}

/** Today as `YYYY-MM-DD` in local time, the format date fields store. */
export function todayIso(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Blank or `{}` counts as empty; mid-typing (unparseable) text does not. */
export function isEmptySampleJson(text: string | null | undefined): boolean {
    const trimmed = (text ?? '').trim();
    if (!trimmed) return true;
    try {
        const value = JSON.parse(trimmed);
        return value !== null && typeof value === 'object' && !Array.isArray(value)
            && Object.keys(value).length === 0;
    } catch {
        return false;
    }
}

/**
 * Assign `value` at a dotted path, creating objects on the way. With `overwrite` off an
 * existing value wins, which is how a second, weaker source avoids clobbering the first.
 */
export function setPath(
    target: Record<string, any>,
    path: string | string[],
    value: unknown,
    overwrite = true,
): void {
    const parts = (Array.isArray(path) ? path : path.split('.')).filter(Boolean);
    if (!parts.length) return;
    let node = target;
    for (const part of parts.slice(0, -1)) {
        if (node[part] === null || typeof node[part] !== 'object' || Array.isArray(node[part])) {
            node[part] = {};
        }
        node = node[part];
    }
    const last = parts[parts.length - 1];
    if (overwrite || node[last] === undefined) node[last] = value;
}

export function toSampleJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
}
