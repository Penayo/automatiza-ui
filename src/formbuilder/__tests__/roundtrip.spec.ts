import { describe, it, expect } from 'vitest';
import { compile, hashSchema } from '../compile';
import { decompile } from '../decompile';
import { buildPayload, loadPayload } from '../payload';
import { BUILDER_VERSION, type BuilderDoc, type VueformSchema } from '../types';

/** Every element type M1 ships, plus all three containers. */
const FIXTURE: VueformSchema = {
    full_name: { type: 'text', label: 'Full name', placeholder: 'Jane Doe' },
    bio: { type: 'textarea', label: 'Bio', rows: 4 },
    // Vueform has no number element — a numeric field is `text` with inputType number.
    age: { type: 'text', inputType: 'number', label: 'Age' },
    country: {
        type: 'select',
        label: 'Country',
        items: { ar: 'Argentina', py: 'Paraguay' },
    },
    subscribe: { type: 'checkbox', text: 'Subscribe' },
    plan: { type: 'radiogroup', label: 'Plan', items: { free: 'Free', pro: 'Pro' } },
    starts_on: { type: 'date', label: 'Start date' },
    notice: { type: 'static', content: '<p>Read carefully.</p>' },
    contact: {
        type: 'group',
        label: 'Contact',
        schema: {
            email: { type: 'text', label: 'Email', rules: 'required|email' },
            phone: { type: 'text', label: 'Phone' },
        },
    },
    billing: {
        type: 'object',
        label: 'Billing',
        schema: {
            street: { type: 'text', label: 'Street' },
            city: { type: 'text', label: 'City' },
            meta: {
                type: 'group',
                schema: { note: { type: 'textarea', label: 'Note' } },
            },
        },
    },
    roles: {
        type: 'list',
        label: 'Roles',
        element: { type: 'text', label: 'Role' },
    },
};

function walk(nodes: BuilderDoc['nodes'], fn: (n: BuilderDoc['nodes'][number]) => void): void {
    for (const node of nodes) {
        fn(node);
        if (node.children) walk(node.children, fn);
    }
}

/** Recursively assert a predicate over every object in a compiled schema. */
function everyEntry(schema: unknown, fn: (entry: Record<string, unknown>) => void): void {
    if (typeof schema !== 'object' || schema === null) return;
    if (Array.isArray(schema)) {
        schema.forEach((v) => everyEntry(v, fn));
        return;
    }
    const obj = schema as Record<string, unknown>;
    if (typeof obj.type === 'string') fn(obj);
    Object.values(obj).forEach((v) => everyEntry(v, fn));
}

describe('compile / decompile round trip', () => {
    it('compile(decompile(schema)) deep-equals the original schema', () => {
        expect(compile(decompile(FIXTURE))).toEqual(FIXTURE);
    });

    it('preserves key order, which is Vueform render order', () => {
        expect(Object.keys(compile(decompile(FIXTURE)))).toEqual(Object.keys(FIXTURE));
    });

    it('never emits id or meta at any depth', () => {
        const doc = decompile(FIXTURE);
        walk(doc.nodes, (n) => {
            n.meta = { collapsed: true, note: 'builder-only' };
        });

        everyEntry(compile(doc), (entry) => {
            expect(entry).not.toHaveProperty('id');
            expect(entry).not.toHaveProperty('meta');
        });
    });

    it('nests object/group children under `schema` and list under `element`', () => {
        const out = compile(decompile(FIXTURE));

        expect(out.contact).toHaveProperty('schema');
        expect(out.billing).toHaveProperty('schema');
        expect(out.roles).toHaveProperty('element');
        expect(out.roles).not.toHaveProperty('schema');
        // The list's single child is an unkeyed template, not a keyed map.
        expect(out.roles.element).toMatchObject({ type: 'text', label: 'Role' });
    });

    it('does not duplicate the container child payload into props', () => {
        const doc = decompile(FIXTURE);
        const contact = doc.nodes.find((n) => n.name === 'contact')!;
        const roles = doc.nodes.find((n) => n.name === 'roles')!;

        expect(contact.props).not.toHaveProperty('schema');
        expect(roles.props).not.toHaveProperty('element');
        expect(contact.children).toHaveLength(2);
        expect(roles.children).toHaveLength(1);
    });

    it('keeps unknown props the panel cannot edit', () => {
        const exotic: VueformSchema = {
            weird: { type: 'text', label: 'Weird', someFutureProp: { deep: [1, 2, 3] } },
        };
        expect(compile(decompile(exotic))).toEqual(exotic);
    });

    it('allows the same name in different sibling scopes', () => {
        const shadowed: VueformSchema = {
            name: { type: 'text' },
            billing: { type: 'object', schema: { name: { type: 'text' } } },
        };
        expect(compile(decompile(shadowed))).toEqual(shadowed);
    });

    it('mints a distinct id per node', () => {
        const doc = decompile(FIXTURE);
        const ids: string[] = [];
        walk(doc.nodes, (n) => ids.push(n.id));
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('tolerates an empty and a malformed schema', () => {
        expect(compile(decompile({}))).toEqual({});
        expect(decompile(null as unknown as VueformSchema).nodes).toEqual([]);
    });
});

describe('hashSchema', () => {
    it('is stable across key insertion order', () => {
        const a: VueformSchema = { x: { type: 'text', label: 'X', placeholder: 'p' } };
        const b: VueformSchema = { x: { placeholder: 'p', label: 'X', type: 'text' } };
        expect(hashSchema(a)).toBe(hashSchema(b));
    });

    it('changes when the schema changes', () => {
        const before = compile(decompile(FIXTURE));
        const after = { ...before, extra: { type: 'text' } };
        expect(hashSchema(before)).not.toBe(hashSchema(after));
    });
});

describe('payload load guard', () => {
    it('keeps the doc when it still compiles to the stored schema', () => {
        const doc = decompile(FIXTURE);
        const result = loadPayload(buildPayload(doc));

        expect(result.rebuilt).toBe(false);
        expect(result.doc).toBe(doc);
    });

    it('rebuilds from the schema when the two have drifted', () => {
        const payload = buildPayload(decompile(FIXTURE));
        // Simulates the JSON tab being edited without the doc following.
        payload.schema = { ...payload.schema, injected: { type: 'text', label: 'Injected' } };

        const result = loadPayload(payload);

        expect(result.rebuilt).toBe(true);
        expect(result.doc.nodes.map((n) => n.name)).toContain('injected');
        expect(compile(result.doc)).toEqual(payload.schema);
    });

    it('returns an empty doc for a missing payload', () => {
        const result = loadPayload(null);
        expect(result).toEqual({
            doc: { builderVersion: BUILDER_VERSION, nodes: [], formProps: {} },
            rebuilt: false,
        });
    });
});
