/**
 * Example inputs for the report designer Preview (reports spec §3a): one page's worth,
 * keyed by the template's field names.
 */
import { SAMPLE_LIST_LENGTH, sampleText, todayIso } from './sampleData';

/** Fields pdfme cannot fill from a plain sample string, or that hold no input. */
const OMIT = new Set([
    'image', 'svg', 'signature', 'line', 'rectangle', 'ellipse',
    'qrcode', 'japanpost', 'ean13', 'ean8', 'code39', 'code128', 'nw7', 'itf14',
    'upca', 'upce', 'gs1datamatrix', 'pdf417',
]);

function today(format: unknown, withTime: boolean): string {
    const date = todayIso();
    if (typeof format === 'string' && format.includes('/')) {
        const [y, m, d] = date.split('-');
        // pdfme formats are date-fns style; the common day-first form gets day-first.
        return format.toLowerCase().startsWith('dd') ? `${d}/${m}/${y}` : `${m}/${d}/${y}`;
    }
    return withTime ? `${date} 09:00` : date;
}

function tableRows(schema: Record<string, any>): string {
    const head: unknown[] = Array.isArray(schema.head) ? schema.head : ['Column'];
    const rows = Array.from({ length: SAMPLE_LIST_LENGTH }, (_, i) =>
        head.map((h) => `${sampleText(String(h))} ${i + 1}`));
    // pdfme's table input is the body rows as a JSON string.
    return JSON.stringify(rows);
}

export function deriveReportSample(template: Record<string, any> | null): Record<string, string> {
    const out: Record<string, string> = {};
    const pages: any[] = Array.isArray(template?.schemas) ? template!.schemas : [];

    for (const page of pages) {
        for (const schema of Array.isArray(page) ? page : []) {
            if (!schema?.name || schema.readOnly) continue;
            const type = String(schema.type ?? 'text');

            // Its `content` is the text with `{var}` holes; the input is the holes' values.
            if (type === 'multiVariableText') {
                const vars: string[] = Array.isArray(schema.variables) ? schema.variables : [];
                out[schema.name] = JSON.stringify(Object.fromEntries(vars.map((v) => [v, sampleText(v)])));
                continue;
            }
            if (typeof schema.content === 'string' && schema.content !== '') {
                out[schema.name] = schema.content;
                continue;
            }
            if (OMIT.has(type)) continue;

            switch (type) {
                case 'date':     out[schema.name] = today(schema.format, false); break;
                case 'dateTime': out[schema.name] = today(schema.format, true); break;
                case 'time':     out[schema.name] = '09:00'; break;
                case 'checkbox':
                case 'radioGroup': out[schema.name] = 'true'; break;
                case 'select':   out[schema.name] = String(schema.options?.[0] ?? sampleText(schema.name)); break;
                case 'table':    out[schema.name] = tableRows(schema); break;
                default:         out[schema.name] = sampleText(schema.name);
            }
        }
    }
    return out;
}
