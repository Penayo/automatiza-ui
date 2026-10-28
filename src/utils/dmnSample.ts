/**
 * Example variables for the decision modeler Preview (decisions-dmn spec §5a), read
 * straight from the DMN XML so unsaved edits count. Only the first decision table is
 * used, the same one the evaluator runs.
 */
import { sampleNumber, sampleText, setPath, todayIso } from './sampleData';

const PATH = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;
const NUMBER = /^-?\d+(\.\d+)?$/;
const NONE = Symbol('none');

/** Split on commas outside quotes: `"a, b", "c"` → two entries. */
function splitList(text: string): string[] {
    const parts: string[] = [];
    let current = '';
    let quoted = false;
    for (const ch of text) {
        if (ch === '"') quoted = !quoted;
        if (ch === ',' && !quoted) {
            parts.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    parts.push(current);
    return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * A value the unary test accepts, or NONE when the cell is not simple enough to read:
 * a literal, a single comparison, a range, or a list of those (first entry wins).
 */
export function valueFromCell(raw: string | null | undefined): unknown {
    const text = (raw ?? '').trim();
    if (!text || text === '-') return NONE;

    const list = splitList(text);
    if (list.length > 1) return valueFromCell(list[0]);

    if (/^".*"$/.test(text)) return text.slice(1, -1);
    if (NUMBER.test(text)) return Number(text);
    if (text === 'true' || text === 'false') return text === 'true';

    const date = text.match(/^date\(\s*"([^"]+)"\s*\)$/);
    if (date) return date[1];

    const cmp = text.match(/^(<=|>=|<|>|=)\s*(-?\d+(?:\.\d+)?)$/);
    if (cmp) {
        const n = Number(cmp[2]);
        if (cmp[1] === '<') return n - 1;
        if (cmp[1] === '>') return n + 1;
        return n;
    }

    const range = text.match(/^([[\]])\s*(-?\d+(?:\.\d+)?)\s*\.\.\s*(-?\d+(?:\.\d+)?)\s*[[\]]$/);
    if (range) {
        const lo = Number(range[2]);
        return range[1] === '[' ? lo : lo + 1;
    }

    return NONE;
}

function valueFromType(typeRef: string | null, name: string): unknown {
    switch ((typeRef ?? '').toLowerCase()) {
        case 'number':
        case 'integer':
        case 'int':
        case 'long':
        case 'double':
            return sampleNumber();
        case 'boolean':
            return true;
        case 'date':
            return todayIso();
        default:
            return sampleText(name);
    }
}

/** Direct children only; DMN nests `text` at several levels. */
function child(el: Element, localName: string): Element | undefined {
    return Array.from(el.children).find((c) => c.localName === localName);
}

export function deriveDmnSample(xml: string): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (!xml?.trim()) return out;

    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return out;

    const table = doc.getElementsByTagNameNS('*', 'decisionTable')[0];
    if (!table) return out;

    const inputs = Array.from(table.children).filter((c) => c.localName === 'input');
    const firstRule = Array.from(table.children).find((c) => c.localName === 'rule');
    const firstEntries = firstRule
        ? Array.from(firstRule.children).filter((c) => c.localName === 'inputEntry')
        : [];

    inputs.forEach((input, i) => {
        const expression = child(input, 'inputExpression');
        const path = expression ? child(expression, 'text')?.textContent?.trim() ?? '' : '';
        if (!PATH.test(path)) return;           // function calls, arithmetic: skip

        const allowed = child(input, 'inputValues');
        const ruleCell = firstEntries[i] ? child(firstEntries[i], 'text')?.textContent : undefined;
        const name = path.split('.').pop() as string;

        let value = valueFromCell(allowed ? child(allowed, 'text')?.textContent : undefined);
        if (value === NONE) value = valueFromCell(ruleCell);
        if (value === NONE) value = valueFromType(expression?.getAttribute('typeRef') ?? null, name);

        setPath(out, path, value, false);
    });

    return out;
}
