import { describe, it, expect } from 'vitest';
import { deriveFormSample, SAMPLE_OPTIONS } from '../sampleData';

describe('form preview example data (forms spec §5.3)', () => {
    it('gives each keyed element a typed example', () => {
        const out = deriveFormSample({
            name: { type: 'text', label: 'Full name' },
            age: { type: 'text', inputType: 'number' },
            mail: { type: 'text', inputType: 'email' },
            color: { type: 'select', items: { red: 'Red', blue: 'Blue' } },
            tags: { type: 'checkboxgroup', items: [{ value: 'a', label: 'A' }] },
            agree: { type: 'checkbox' },
        });
        expect(out).toEqual({
            name: 'Sample Full name',
            age: 100,
            mail: 'jane.doe@example.com',
            color: 'red',
            tags: ['a'],
            agree: true,
        });
    });

    it('skips elements that hold no value', () => {
        const out = deriveFormSample({
            intro: { type: 'static', content: 'x' },
            upload: { type: 'file' },
            go: { type: 'button' },
        });
        expect(out).toEqual({});
    });

    it('prefers a configured default', () => {
        expect(deriveFormSample({ h: { type: 'hidden', default: 'fixed' } })).toEqual({ h: 'fixed' });
    });

    it('nests objects, flattens groups and repeats lists twice', () => {
        const out = deriveFormSample({
            grp: { type: 'group', schema: { city: { type: 'text', label: 'City' } } },
            addr: { type: 'object', schema: { street: { type: 'text' } } },
            people: { type: 'list', element: { type: 'object', schema: { first: { type: 'text' } } } },
        });
        expect(out.city).toBe('Sample City');
        expect(out.addr).toEqual({ street: 'Sample street' });
        expect(out.people).toHaveLength(2);
    });

    it('gives a Form Variable reference 2 sample options and picks the first', () => {
        const out = deriveFormSample({ country: { type: 'select', items: '$formVariable:countries' } });
        expect(out.countries).toEqual(SAMPLE_OPTIONS);
        expect(out.country).toBe('option1');
    });

    it('seeds a dataTable rowsFrom variable with 2 rows from its columns', () => {
        const out = deriveFormSample({
            matches: {
                type: 'dataTable',
                rowsFrom: 'screening.matches',
                cols: [{ key: 'name', label: 'Name' }, { key: 'score.value', label: 'Score' }],
            },
        });
        expect(out).toEqual({
            screening: {
                matches: [
                    { name: 'Sample Name 1', score: { value: 'Sample Score 1' } },
                    { name: 'Sample Name 2', score: { value: 'Sample Score 2' } },
                ],
            },
        });
    });

    it('replaces the hidden carrier field of a rowsFrom variable with rows', () => {
        const out = deriveFormSample({
            quote_items: { type: 'hidden' },
            table: { type: 'dataTable', rowsFrom: 'quote_items', cols: [{ key: 'name', label: 'Item' }] },
        });
        expect(out.quote_items).toEqual([{ name: 'Sample Item 1' }, { name: 'Sample Item 2' }]);
    });

    it('lets a list field named by rowsFrom keep its own example', () => {
        const out = deriveFormSample({
            people: { type: 'list', element: { type: 'object', schema: { first: { type: 'text' } } } },
            table: { type: 'dataTable', rowsFrom: 'people', cols: ['first'] },
        });
        expect(out.people).toEqual([{ first: 'Sample first' }, { first: 'Sample first' }]);
    });
});
