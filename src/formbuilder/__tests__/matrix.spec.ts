import { describe, it, expect } from 'vitest';
import { matrixToForm, matrixFromForm, matrixLayoutTab } from '../registry/common';
import { compile } from '../compile';
import { decompile } from '../decompile';

/**
 * Matrix `cols`/`rows` accept an object map, an array of scalars, or an array of
 * {value,label} (useCells.js resolvedColumns). `rows` has one extra form — a NUMBER,
 * meaning dynamic rows the user can add — which the editor surfaces as its own field.
 */
const roundTrip = (props: Record<string, unknown>) => matrixFromForm(matrixToForm(props));

describe('matrix cols/rows projection', () => {
    it('round-trips an object map', () => {
        const out = roundTrip({ inputType: 'text', cols: { a: 'A', b: 'B' }, rows: { x: 'X' }, items: {} });
        expect(out.cols).toEqual({ a: 'A', b: 'B' });
        expect(out.rows).toEqual({ x: 'X' });
    });

    it('normalises an array of scalars', () => {
        const out = roundTrip({ cols: ['A', 'B'], rows: ['X'] });
        expect(out.cols).toEqual({ A: 'A', B: 'B' });
        expect(out.rows).toEqual({ X: 'X' });
    });

    it('normalises an array of {value,label}', () => {
        expect(roundTrip({ cols: [{ value: 'a', label: 'A' }] }).cols).toEqual({ a: 'A' });
    });

    it('keeps numeric rows as the dynamic-row count', () => {
        const form = matrixToForm({ cols: { a: 'A' }, rows: 3 });
        expect(form.dynamicRows).toBe(3);
        expect(form.rows).toEqual([]);
        expect(matrixFromForm(form).rows).toBe(3);
    });

    it('lets the dynamic count win over fixed row labels', () => {
        const data = { cols: [], rows: [{ value: 'x', label: 'X' }], dynamicRows: '5', items: [] };
        expect(matrixFromForm(data).rows).toBe(5);
    });

    it('falls back to fixed rows when the count is empty or zero', () => {
        const rows = [{ value: 'x', label: 'X' }];
        expect(matrixFromForm({ cols: [], rows, dynamicRows: '', items: [] }).rows).toEqual({ x: 'X' });
        expect(matrixFromForm({ cols: [], rows, dynamicRows: '0', items: [] }).rows).toEqual({ x: 'X' });
    });

    it('never leaks dynamicRows into the compiled schema', () => {
        // It is a builder-only field; Vueform would render it onto the DOM.
        expect(roundTrip({ cols: { a: 'A' }, rows: 3 })).not.toHaveProperty('dynamicRows');
    });

    it('skips a half-typed column', () => {
        const data = { cols: [{ value: '', label: 'nope' }, { value: 'a', label: 'A' }], rows: [], items: [] };
        expect(matrixFromForm(data).cols).toEqual({ a: 'A' });
    });

    it('preserves the other props', () => {
        const out = roundTrip({
            label: 'Scores', inputType: 'radio',
            cols: { a: 'A' }, rows: { r: 'R' }, items: { y: 'Yes' },
        });
        expect(out.label).toBe('Scores');
        expect(out.inputType).toBe('radio');
        expect(out.items).toEqual({ y: 'Yes' });
    });
});

/**
 * The spreadsheet look is the `matrix-table` preset, not the gap/padding props: every
 * cell-border rule in the shipped CSS is scoped under a `.vf-matrix-table` container
 * that only the preset adds, and it forces `gap: 0 !important` itself.
 */
describe('matrix table preset', () => {
    const tab = matrixLayoutTab();

    it('compiles the preset into the schema', () => {
        const doc = {
            builderVersion: 1 as const,
            formProps: {},
            nodes: [{
                id: 'x', name: 'm', type: 'matrix',
                props: { label: 'M', inputType: 'text', presets: ['matrix-table'] },
            }],
        };
        expect(compile(doc).m.presets).toEqual(['matrix-table']);
    });

    it('survives a JSON round trip', () => {
        const schema = { m: { type: 'matrix', presets: ['matrix-table'], inputType: 'text' } };
        expect(compile(decompile(schema))).toEqual(schema);
    });

    it('reads the toggle from an existing preset', () => {
        expect(tab.toForm!({ presets: ['matrix-table'] }).tableStyle).toBe(true);
        expect(tab.toForm!({ presets: [] }).tableStyle).toBe(false);
        expect(tab.toForm!({}).tableStyle).toBe(false);
    });

    it('adds and removes the preset with the toggle', () => {
        expect(tab.fromForm!({ tableStyle: true, presets: [] }, {}).presets).toEqual(['matrix-table']);
        expect(tab.fromForm!({ tableStyle: false, presets: ['matrix-table'] }, {}).presets).toEqual([]);
    });

    it('preserves other presets in both directions', () => {
        expect(tab.fromForm!({ tableStyle: true, presets: ['custom'] }, {}).presets)
            .toEqual(['custom', 'matrix-table']);
        expect(tab.fromForm!({ tableStyle: false, presets: ['custom', 'matrix-table'] }, {}).presets)
            .toEqual(['custom']);
    });

    it('does not duplicate an already-present preset', () => {
        expect(tab.fromForm!({ tableStyle: true, presets: ['matrix-table'] }, {}).presets)
            .toEqual(['matrix-table']);
    });

    it('never leaks the tableStyle toggle into the schema', () => {
        expect(tab.fromForm!({ tableStyle: true, presets: [] }, {})).not.toHaveProperty('tableStyle');
    });
});
