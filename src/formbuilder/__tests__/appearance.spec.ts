import { describe, it, expect } from 'vitest';
import { appearanceToForm, appearanceFromForm } from '../registry/common';

/**
 * The Appearance tab stores nothing of its own: it projects `addClass` into editor
 * fields and back (spec §5.1). These cover the round trip, legacy classes, and that a
 * hand-typed class survives an edit.
 */
const listFields = (props: Record<string, unknown>) => {
    const { itemStyle, numbered, sectionHeading } = appearanceToForm(props);
    return { itemStyle, numbered, sectionHeading };
};
const containerFields = (props: Record<string, unknown>) => {
    const { cardStyle, sectionHeading } = appearanceToForm(props);
    return { cardStyle, sectionHeading };
};

describe('container appearance projection', () => {
    it('reads a plain element as all-off', () => {
        expect(appearanceToForm({})).toEqual({
            itemStyle: 'none', numbered: false, sectionHeading: false, cardStyle: 'none',
        });
    });

    it('opens a legacy "form-section form-items" list as Divider + section heading', () => {
        expect(listFields({ addClass: 'form-section form-items' }))
            .toEqual({ itemStyle: 'divider', numbered: false, sectionHeading: true });
    });

    it('writes Card + Numbered on a list', () => {
        expect(appearanceFromForm({ itemStyle: 'card', numbered: true, sectionHeading: true }, {}))
            .toEqual({ addClass: 'form-section form-items--card form-items--numbered' });
    });

    it('drops Numbered when the item style is not Card', () => {
        expect(appearanceFromForm({ itemStyle: 'striped', numbered: true, sectionHeading: false }, {}))
            .toEqual({ addClass: 'form-items--striped' });
    });

    it('round-trips every list setting', () => {
        for (const itemStyle of ['none', 'divider', 'card', 'striped']) {
            const data = { itemStyle, numbered: itemStyle === 'card', sectionHeading: true };
            expect(listFields(appearanceFromForm(data, {}))).toEqual(data);
        }
    });

    it('round-trips the object/group card', () => {
        const data = { cardStyle: 'card', sectionHeading: false };
        expect(containerFields(appearanceFromForm(data, {}))).toEqual(data);
    });

    it('keeps a hand-typed class across an edit', () => {
        const props = { addClass: 'my-class form-items' };
        expect(appearanceFromForm({ itemStyle: 'card', sectionHeading: false }, props))
            .toEqual({ addClass: 'my-class form-items--card' });
    });

    it('leaves classes owned by fields the tab does not render', () => {
        // An object's tab has no item style, so a stray list class is not its to remove.
        const props = { addClass: 'form-items' };
        expect(appearanceFromForm({ cardStyle: 'card', sectionHeading: false }, props))
            .toEqual({ addClass: 'form-items form-card' });
    });

    it('removes addClass entirely when everything is off', () => {
        expect(appearanceFromForm({ itemStyle: 'none', sectionHeading: false }, { addClass: 'form-items' }))
            .toEqual({ addClass: undefined });
    });

    it('reads the array form of addClass', () => {
        expect(listFields({ addClass: ['form-items--card', 'form-items--numbered'] }))
            .toEqual({ itemStyle: 'card', numbered: true, sectionHeading: false });
    });

    it('does not touch the { class: bool } map form', () => {
        expect(appearanceFromForm({ itemStyle: 'card' }, { addClass: { 'form-items': true } })).toEqual({});
    });
});
