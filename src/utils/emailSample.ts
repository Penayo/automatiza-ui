/**
 * Example `variables` for the email template Preview (email-templates spec §4a), read
 * from the Handlebars references in the compiled HTML. A light scan, not a parser:
 * enough for `{{variables.x}}`, `{{#each}}`, `{{#with}}` and `{{#if}}` as templates use them.
 */
import { SAMPLE_LIST_LENGTH, sampleText } from './sampleData';

const TAG = /{{{?~?\s*([#/^]?)\s*([^{}]*?)\s*~?}?}}/g;
const IDENT = /^(?:\.\.\/)*(?:this\.)?[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;
const RESERVED = new Set(['else', 'this']);

/** What one path is used as. A list wins over a flag, children over a plain value. */
interface Shape {
    leaf?: boolean;
    flag?: boolean;
    list?: boolean;
    children: Map<string, Shape>;
}

interface Scope {
    node: Shape;
    /** `{{#each xs as |x|}}`: references starting with `x.` mean the current item. */
    alias?: string;
}

const shape = (): Shape => ({ children: new Map() });

function at(node: Shape, path: string[]): Shape {
    let current = node;
    for (const part of path) {
        if (!current.children.has(part)) current.children.set(part, shape());
        current = current.children.get(part)!;
    }
    return current;
}

/** `n` numbers the strings inside a loop item so its rows are told apart. */
function build(node: Shape, name: string, n: number): unknown {
    if (node.list) {
        return Array.from({ length: SAMPLE_LIST_LENGTH }, (_, i) =>
            node.children.size ? buildObject(node, i + 1) : `${sampleText(name)} ${i + 1}`);
    }
    if (node.children.size) return buildObject(node, n);
    if (node.flag && !node.leaf) return true;
    return n ? `${sampleText(name)} ${n}` : sampleText(name);
}

function buildObject(node: Shape, n: number): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, child] of node.children) out[key] = build(child, key, n);
    return out;
}

export function deriveEmailSample(html: string): Record<string, unknown> {
    const root = shape();
    const scopes: Scope[] = [{ node: root }];
    // Whether each open block pushed a scope, so `{{/if}}` does not pop an `{{#each}}`.
    const opened: boolean[] = [];

    /** The shape a reference points at in the current scope; null when it is not data. */
    const resolve = (ref: string | undefined): Shape | null => {
        if (!ref || !IDENT.test(ref) || RESERVED.has(ref)) return null;
        let depth = scopes.length - 1;
        let rest = ref;
        while (rest.startsWith('../')) {
            rest = rest.slice(3);
            depth = Math.max(0, depth - 1);
        }
        rest = rest.replace(/^this\./, '');
        let parts = rest.split('.');
        const { node, alias } = scopes[depth];
        if (alias && parts[0] === alias) parts = parts.slice(1);
        if (depth === 0) {
            // Top level: only `variables.*` is data; anything else is a helper or noise.
            if (parts[0] !== 'variables' || parts.length < 2) return null;
            return at(root, parts.slice(1));
        }
        return parts.length ? at(node, parts) : node;
    };

    for (const [, kind, body] of html.matchAll(TAG)) {
        if (kind === '/') {
            if (opened.pop()) scopes.pop();
            continue;
        }

        const [head, ...args] = body.split(/\s+/);

        if (kind === '#' || kind === '^') {
            const helper = kind === '^' ? 'unless' : head;
            const node = resolve(kind === '^' ? head : args[0]);
            if ((helper === 'each' || helper === 'with') && node) {
                if (helper === 'each') node.list = true;
                const alias = body.match(/\bas\s+\|\s*([\w$]+)/)?.[1];
                scopes.push({ node, alias });
                opened.push(true);
            } else {
                if ((helper === 'if' || helper === 'unless') && node) node.flag = true;
                opened.push(false);
            }
            continue;
        }

        // `{{helper a b}}` reads its arguments; `{{x}}` is the value itself.
        for (const ref of args.length ? args : [head]) {
            const node = resolve(ref);
            if (node) node.leaf = true;
        }
    }

    return buildObject(root, 0);
}
