import { describe, it, expect } from 'vitest';
import { rulesToForm, rulesFromForm } from '../registry/common';

/**
 * The validation tab edits Vueform's `rules` as a list of {rule, param} rows and
 * projects back. These cover the shapes Vueform accepts on the way in, and the one
 * that matters on the way out — an array, never a "|"-joined string.
 */
const roundTrip = (rules: unknown) => rulesFromForm(rulesToForm({ rules })).rules;

describe('validation rules projection', () => {
    it('round-trips an array of rule strings', () => {
        expect(roundTrip(['required', 'min:3', 'max:10'])).toEqual(['required', 'min:3', 'max:10']);
    });

    it('parses the pipe-separated string form into rows', () => {
        expect(roundTrip('required|email')).toEqual(['required', 'email']);
    });

    it("normalises Vueform's tuple form ['min', 3]", () => {
        expect(roundTrip([['min', 3]])).toEqual(['min:3']);
    });

    it('drops a param on a rule that takes none', () => {
        expect(rulesFromForm({ rules: [{ rule: 'required', param: '7' }] }).rules).toEqual(['required']);
    });

    it('skips a row whose rule has not been picked yet', () => {
        const rows = [{ rule: '', param: 'x' }, { rule: 'email' }];
        expect(rulesFromForm({ rules: rows }).rules).toEqual(['email']);
    });

    it('preserves a regex containing a pipe', () => {
        // The reason rules are emitted as an array: "|" is legal inside a pattern and
        // the string form has no way to escape it.
        const out = rulesFromForm({ rules: [{ rule: 'regex', param: '/^(a|b)$/' }] }).rules as string[];
        expect(out).toEqual(['regex:/^(a|b)$/']);

        const back = rulesToForm({ rules: out }).rules as unknown[];
        expect(back).toHaveLength(1);
        expect(back[0]).toEqual({ rule: 'regex', param: '/^(a|b)$/' });
    });

    it('preserves a multi-argument param', () => {
        expect(roundTrip(['between:1,10'])).toEqual(['between:1,10']);
    });

    it('handles empty and missing rules', () => {
        expect(roundTrip(undefined)).toEqual([]);
        expect(roundTrip('')).toEqual([]);
        expect(roundTrip([])).toEqual([]);
    });

    it('leaves the other props untouched', () => {
        expect(rulesFromForm(rulesToForm({ label: 'X', rules: ['required'] })).label).toBe('X');
    });
});
