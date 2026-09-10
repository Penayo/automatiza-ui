import { describe, it, expect } from 'vitest';
import { resolveFormVariables, toFormVariableRef, formVariableKey } from '../formVariables';
import { itemsToForm, itemsFromForm } from '../registry/common';

const COUNTRIES = [
    { label: 'Argentina', value: 'AR' },
    { label: 'Paraguay', value: 'PY' },
];

describe('form variable resolution', () => {
    it('replaces a marker with the resolved option list', () => {
        const out = resolveFormVariables(
            { c: { type: 'select', items: '$formVariable:countries' } },
            { countries: COUNTRIES },
        );
        expect(out.c.items).toEqual(COUNTRIES);
    });

    it('turns an unresolved key into an empty list', () => {
        // Leaving the marker in place would make Vueform treat it as a remote URL and
        // fire an HTTP request at a nonsense address.
        const out = resolveFormVariables({ c: { type: 'select', items: '$formVariable:missing' } }, {});
        expect(out.c.items).toEqual([]);
    });

    it('resolves inside object, group and list nesting', () => {
        const schema = {
            billing: {
                type: 'object',
                schema: { country: { type: 'select', items: '$formVariable:countries' } },
            },
            rows: {
                type: 'list',
                element: {
                    type: 'object',
                    schema: { c: { type: 'select', items: '$formVariable:countries' } },
                },
            },
        };
        const out = resolveFormVariables(schema as any, { countries: COUNTRIES });
        expect((out.billing as any).schema.country.items).toEqual(COUNTRIES);
        expect((out.rows as any).element.schema.c.items).toEqual(COUNTRIES);
    });

    it('leaves a genuine remote-URL items string alone', () => {
        const out = resolveFormVariables({ c: { type: 'select', items: '/api/countries' } }, {});
        expect(out.c.items).toBe('/api/countries');
    });

    it('leaves a static items map alone', () => {
        const out = resolveFormVariables({ c: { type: 'select', items: { a: 'A' } } }, {});
        expect(out.c.items).toEqual({ a: 'A' });
    });

    it('does not mutate the stored schema', () => {
        const schema = { c: { type: 'select', items: '$formVariable:countries' } };
        resolveFormVariables(schema, { countries: COUNTRIES });
        expect(schema.c.items).toBe('$formVariable:countries');
    });

    it('parses a key, and rejects non-markers', () => {
        expect(formVariableKey('$formVariable:countries')).toBe('countries');
        expect(formVariableKey('/api/x')).toBeNull();
        expect(formVariableKey('$formVariable:')).toBeNull();
    });
});

describe('options editor / form variable projection', () => {
    it('round-trips a reference through the editor', () => {
        const form = itemsToForm({ label: 'Country', items: toFormVariableRef('countries') });
        expect(form.formVariable).toBe('countries');
        expect(form.items).toEqual([]);

        const back = itemsFromForm(form);
        expect(back.items).toBe('$formVariable:countries');
        // `formVariable` is builder-only — Vueform would render it onto the DOM.
        expect(back).not.toHaveProperty('formVariable');
    });

    it('falls back to the static list when the key is cleared', () => {
        const back = itemsFromForm({ formVariable: '', items: [{ value: 'a', label: 'A' }] });
        expect(back.items).toEqual({ a: 'A' });
        expect(back).not.toHaveProperty('formVariable');
    });

    it('lets the key win over a static list', () => {
        const back = itemsFromForm({ formVariable: 'countries', items: [{ value: 'a', label: 'A' }] });
        expect(back.items).toBe('$formVariable:countries');
    });
});
