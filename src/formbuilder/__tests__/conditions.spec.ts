import { describe, it, expect } from 'vitest';
import { conditionsToForm, conditionsFromForm, countUneditableConditions } from '../registry/common';

/**
 * The conditions tab edits Vueform's `conditions` as AND-ed {field, operator, value}
 * rows. Vueform also accepts OR groups, predicate functions and expression strings —
 * shapes this editor cannot draw. The critical property is that editing the tab never
 * destroys them.
 */
const roundTrip = (conditions: unknown) =>
    conditionsFromForm(conditionsToForm({ conditions }), { conditions }).conditions;

describe('conditions projection', () => {
    it('round-trips a 3-tuple', () => {
        expect(roundTrip([['status', '==', 'open']])).toEqual([['status', '==', 'open']]);
    });

    it('normalises the 2-tuple [path, expected] form to ==', () => {
        expect(roundTrip([['status', 'open']])).toEqual([['status', '==', 'open']]);
    });

    it('keeps a valueless operator as a 2-tuple', () => {
        expect(roundTrip([['notes', 'empty']])).toEqual([['notes', 'empty']]);
    });

    it('does not stringify numbers or booleans', () => {
        expect(roundTrip([['age', '>', 18]])).toEqual([['age', '>', 18]]);
        expect(roundTrip([['agreed', '==', true]])).toEqual([['agreed', '==', true]]);
    });

    it('keeps a list operator’s value as an array', () => {
        expect(roundTrip([['role', 'in', ['a', 'b']]])).toEqual([['role', 'in', ['a', 'b']]]);
    });

    it('preserves an OR group it cannot display', () => {
        const or = [[['a', '==', 1], ['b', '==', 2]]];
        expect(roundTrip(or)).toEqual(or);
        expect(countUneditableConditions({ conditions: or })).toBe(1);
    });

    it('preserves function and expression-string conditions', () => {
        const fn = () => true;
        const mixed = [['a', '==', 1], fn, '{x} > 2'];
        const out = conditionsFromForm(
            conditionsToForm({ conditions: mixed }),
            { conditions: mixed },
        ).conditions as unknown[];

        expect(out[0]).toEqual(['a', '==', 1]);
        expect(out[1]).toBe(fn);
        expect(out[2]).toBe('{x} > 2');
        expect(countUneditableConditions({ conditions: mixed })).toBe(2);
    });

    it('skips a row whose field has not been picked', () => {
        const rows = [{ field: '', operator: '==', value: 'x' }];
        expect(conditionsFromForm({ conditions: rows }, {}).conditions).toEqual([]);
    });

    it('defaults a missing operator to ==', () => {
        const rows = [{ field: 'a', value: '1' }];
        expect(conditionsFromForm({ conditions: rows }, {}).conditions).toEqual([['a', '==', 1]]);
    });

    it('handles empty conditions', () => {
        expect(roundTrip(undefined)).toEqual([]);
        expect(roundTrip([])).toEqual([]);
    });
});
