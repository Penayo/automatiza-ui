/**
 * Display formatting for form values (forms spec §5.4–§5.6): the NUMBER / CURRENCY /
 * DATE expression functions, data table column formats and the Amount field all go
 * through here, so one value reads the same everywhere.
 *
 * Blank or non-numeric input gives an empty string, so a value still being typed shows
 * nothing instead of NaN.
 */

export function toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = typeof value === 'number' ? value : Number(String(value).trim());
    return Number.isFinite(n) ? n : null;
}

/** An empty or non-string locale means "the browser's". */
function localeOf(locale: unknown): string | undefined {
    return typeof locale === 'string' && locale.trim() ? locale.trim() : undefined;
}

function digitsOf(decimals: unknown, fallback: number): number {
    return typeof decimals === 'number' && decimals >= 0 && decimals <= 20 ? Math.floor(decimals) : fallback;
}

export function formatNumber(value: unknown, decimals?: unknown, locale?: unknown): string {
    const n = toNumber(value);
    if (n === null) return '';
    const digits = digitsOf(decimals, 2);
    const options = { minimumFractionDigits: digits, maximumFractionDigits: digits };
    try {
        return new Intl.NumberFormat(localeOf(locale), options).format(n);
    } catch {
        return new Intl.NumberFormat(undefined, options).format(n);    // bad locale tag
    }
}

export function formatCurrency(value: unknown, code?: unknown, locale?: unknown): string {
    const n = toNumber(value);
    if (n === null) return '';
    const currency = typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : 'USD';
    try {
        return new Intl.NumberFormat(localeOf(locale), { style: 'currency', currency }).format(n);
    } catch {
        return formatNumber(n, 2, locale);                              // unknown code or locale
    }
}

/** The value is already in percent: `15` → `15%`. */
export function formatPercent(value: unknown, decimals?: unknown, locale?: unknown): string {
    const n = toNumber(value);
    if (n === null) return '';
    const digits = digitsOf(decimals, 0);
    const options = { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits } as const;
    try {
        return new Intl.NumberFormat(localeOf(locale), options).format(n / 100);
    } catch {
        return `${formatNumber(n, digits)}%`;
    }
}

/** ISO dates as a localized short date; anything unparseable comes back as is. */
export function formatDate(value: unknown, locale?: unknown): string {
    if (value === null || value === undefined || value === '') return '';
    const text = String(value);
    // A bare YYYY-MM-DD is a calendar day: parse it as local midnight, not UTC, or it
    // shows as the previous day west of Greenwich.
    const day = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = day ? new Date(+day[1], +day[2] - 1, +day[3]) : new Date(text);
    if (Number.isNaN(date.getTime())) return text;
    try {
        return date.toLocaleDateString(localeOf(locale));
    } catch {
        return date.toLocaleDateString();
    }
}

/** The locale's decimal separator, e.g. `,` for es-AR. */
export function decimalSeparator(locale?: unknown): string {
    try {
        return new Intl.NumberFormat(localeOf(locale)).formatToParts(1.1)
            .find((p) => p.type === 'decimal')?.value ?? '.';
    } catch {
        return '.';
    }
}

/**
 * Text a person typed → number, or null. Grouping separators are dropped; the last
 * `.` or `,` is the decimal point when it could be one (the locale's separator, or a
 * `.`), so `1,234.50`, `1.234,50` and `1234.5` all read as 1234.5 in the right locale.
 */
export function parseNumber(text: unknown, locale?: unknown): number | null {
    if (typeof text === 'number') return Number.isFinite(text) ? text : null;
    if (typeof text !== 'string') return null;
    const cleaned = text.replace(/[^\d.,-]/g, '');
    if (!/\d/.test(cleaned)) return null;

    const negative = cleaned.trim().startsWith('-');
    const sep = decimalSeparator(locale);
    const lastDot = cleaned.lastIndexOf('.');
    const lastComma = cleaned.lastIndexOf(',');
    let decimalAt = -1;
    if (lastDot >= 0 && lastComma >= 0) decimalAt = Math.max(lastDot, lastComma);
    else if (lastComma >= 0) decimalAt = sep === ',' && cleaned.split(',').length === 2 ? lastComma : -1;
    else if (lastDot >= 0) {
        // Repeated, or (in a comma-decimal locale) followed by exactly three digits, a
        // lone `.` is grouping: `1.234.567`, es `1.234` → 1234; but `12.5` → 12.5.
        const groups = cleaned.split('.');
        const grouping = groups.length > 2 || (sep === ',' && groups[1].length === 3);
        decimalAt = grouping ? -1 : lastDot;
    }

    const whole = (decimalAt >= 0 ? cleaned.slice(0, decimalAt) : cleaned).replace(/\D/g, '');
    const fraction = decimalAt >= 0 ? cleaned.slice(decimalAt + 1).replace(/\D/g, '') : '';
    const n = Number(`${negative ? '-' : ''}${whole || '0'}${fraction ? `.${fraction}` : ''}`);
    return Number.isFinite(n) ? n : null;
}

/** For editing: no grouping, the locale's decimal separator. */
export function plainNumber(value: unknown, locale?: unknown): string {
    const n = toNumber(value);
    if (n === null) return '';
    const sep = decimalSeparator(locale);
    return sep === '.' ? String(n) : String(n).replace('.', sep);
}

export function roundTo(value: number, decimals: unknown): number {
    const factor = 10 ** digitsOf(decimals, 2);
    return Math.round(value * factor) / factor;
}

/** A dataTable column's format (§5.5); null means "no format, show as before". */
export function formatColumnValue(
    value: unknown,
    col: { format?: string; decimals?: number; currency?: string },
): string | null {
    switch (col.format) {
        case 'number':   return toNumber(value) === null ? null : formatNumber(value, col.decimals);
        case 'currency': return toNumber(value) === null ? null : formatCurrency(value, col.currency);
        case 'percent':  return toNumber(value) === null ? null : formatPercent(value, col.decimals);
        case 'date':     return formatDate(value);
        default:         return null;
    }
}

export const NUMERIC_COLUMN_FORMATS = new Set(['number', 'currency', 'percent']);
