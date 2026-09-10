import { describe, it, expect } from 'vitest';
import { compile, hashSchema } from '../compile';
import { decompile } from '../decompile';
import { buildPayload, loadPayload } from '../payload';
import {
    compileSteps,
    normalizeStepsInPlace,
    hashSteps,
    stepMembershipByName,
    applyStepMembershipByName,
} from '../steps';
import type { BuilderDoc, BuilderNode, BuilderStep } from '../types';

const node = (id: string, name: string, extra: Partial<BuilderNode> = {}): BuilderNode =>
    ({ id, name, type: 'text', props: { label: name }, ...extra });

const docWith = (nodes: BuilderNode[], steps?: BuilderStep[]): BuilderDoc =>
    ({ builderVersion: 1, nodes, formProps: {}, ...(steps ? { steps } : {}) });

const S1: BuilderStep = { id: 's1', name: 'step_1', label: 'One' };
const S2: BuilderStep = { id: 's2', name: 'step_2', label: 'Two' };

describe('normalizeStepsInPlace', () => {
    it('mutates in place and returns the same object', () => {
        // loadPayload's contract is that an unchanged doc comes back as the same
        // reference, so normalization must never return a fresh object.
        const doc = docWith([node('a', 'a', { stepId: 's2' }), node('b', 'b', { stepId: 's1' })], [S1, S2]);
        const ref = doc;
        normalizeStepsInPlace(doc);
        expect(doc).toBe(ref);
        expect(doc.nodes.map((n) => n.name)).toEqual(['b', 'a']);
    });

    it('is idempotent', () => {
        const doc = docWith([node('a', 'a', { stepId: 's2' }), node('b', 'b', { stepId: 's1' })], [S1, S2]);
        expect(normalizeStepsInPlace(doc)).toBe(true);
        expect(normalizeStepsInPlace(doc)).toBe(false);
    });

    it('sorts unassigned nodes last, where orderedSchema appends them', () => {
        const doc = docWith([node('x', 'x'), node('a', 'a', { stepId: 's1' })], [S1]);
        normalizeStepsInPlace(doc);
        expect(doc.nodes.map((n) => n.name)).toEqual(['a', 'x']);
    });

    it('strips stepId from nested nodes, which travel with their container', () => {
        const doc = docWith([{
            id: 'g', name: 'g', type: 'group', props: {}, stepId: 's1',
            children: [node('c', 'c', { stepId: 's2' })],
        }], [S1, S2]);
        normalizeStepsInPlace(doc);
        expect(doc.nodes[0].children![0].stepId).toBeUndefined();
        expect(doc.nodes[0].stepId).toBe('s1');
    });

    it('clears a stepId pointing at a deleted step', () => {
        const doc = docWith([node('a', 'a', { stepId: 'gone' })], [S1]);
        normalizeStepsInPlace(doc);
        expect(doc.nodes[0].stepId).toBeUndefined();
    });

    it('drops every stepId when the form is unpaginated', () => {
        const doc = docWith([node('a', 'a', { stepId: 's1' })]);
        normalizeStepsInPlace(doc);
        expect(doc.nodes[0].stepId).toBeUndefined();
    });
});

describe('compileSteps', () => {
    it('emits element names in step order', () => {
        const doc = docWith([node('a', 'email', { stepId: 's1' }), node('b', 'street', { stepId: 's2' })], [S1, S2]);
        expect(compileSteps(doc)).toEqual({
            step_1: { label: 'One', elements: ['email'] },
            step_2: { label: 'Two', elements: ['street'] },
        });
    });

    it('still emits an empty step', () => {
        expect(compileSteps(docWith([], [S1]))).toEqual({ step_1: { label: 'One', elements: [] } });
    });

    it('compiles an unpaginated form to {}', () => {
        expect(compileSteps(docWith([node('a', 'a')]))).toEqual({});
    });

    it('needs no bookkeeping when a field is renamed', () => {
        // Steps reference nodes by id and derive names at compile time — the property
        // that keeps renameNode free of step awareness.
        const doc = docWith([node('a', 'old', { stepId: 's1' })], [S1]);
        doc.nodes[0].name = 'renamed';
        expect(compileSteps(doc).step_1.elements).toEqual(['renamed']);
    });
});

describe('compile', () => {
    it('never emits stepId', () => {
        const doc = docWith([
            node('a', 'a', { stepId: 's1' }),
            { id: 'g', name: 'g', type: 'group', props: {}, stepId: 's1', children: [node('c', 'c')] },
        ], [S1]);

        const scan = (o: unknown): void => {
            if (!o || typeof o !== 'object') return;
            if (Array.isArray(o)) return o.forEach(scan);
            expect(o).not.toHaveProperty('stepId');
            Object.values(o).forEach(scan);
        };
        scan(compile(doc));
    });
});

describe('hashing', () => {
    it('detects reordered steps', () => {
        // Step order is the key order of the steps object, so a key-sorting hash would
        // make reordering invisible.
        const a = { step_1: { label: 'A', elements: ['x'] }, step_2: { label: 'B', elements: ['y'] } };
        const b = { step_2: { label: 'B', elements: ['y'] }, step_1: { label: 'A', elements: ['x'] } };
        expect(hashSteps(a)).not.toBe(hashSteps(b));
    });

    it('detects changed membership', () => {
        expect(hashSteps({ s: { label: 'A', elements: ['x'] } }))
            .not.toBe(hashSteps({ s: { label: 'A', elements: ['x', 'y'] } }));
    });

    it('detects a reordered schema — key order is render order', () => {
        expect(hashSchema({ one: { type: 'text' }, two: { type: 'text' } }))
            .not.toBe(hashSchema({ two: { type: 'text' }, one: { type: 'text' } }));
    });

    it('still ignores a reordering of an element’s own props', () => {
        expect(hashSchema({ x: { type: 'text', label: 'X' } }))
            .toBe(hashSchema({ x: { label: 'X', type: 'text' } }));
    });

    it('detects a reordering inside a container', () => {
        const a = { g: { type: 'group', schema: { a: { type: 'text' }, b: { type: 'text' } } } };
        const b = { g: { type: 'group', schema: { b: { type: 'text' }, a: { type: 'text' } } } };
        expect(hashSchema(a)).not.toBe(hashSchema(b));
    });
});

describe('decompile with steps', () => {
    it('restores membership by name', () => {
        const schema = { email: { type: 'text' }, street: { type: 'text' } };
        const steps = { step_1: { label: 'One', elements: ['email'] }, step_2: { label: 'Two', elements: ['street'] } };
        const doc = decompile(schema, {}, steps);

        expect(doc.steps!.map((s) => s.label)).toEqual(['One', 'Two']);
        const byName = Object.fromEntries(doc.nodes.map((n) => [n.name, n.stepId]));
        expect(byName.email).toBe(doc.steps![0].id);
        expect(byName.street).toBe(doc.steps![1].id);
    });

    it('drops names the schema does not contain', () => {
        const doc = decompile({ a: { type: 'text' } }, {}, { s: { label: 'S', elements: ['a', 'ghost'] } });
        expect(compileSteps(doc).s.elements).toEqual(['a']);
    });

    it('leaves unlisted fields unassigned', () => {
        const doc = decompile({ a: { type: 'text' }, b: { type: 'text' } }, {}, { s: { label: 'S', elements: ['a'] } });
        expect(doc.nodes.find((n) => n.name === 'b')!.stepId).toBeUndefined();
    });

    it('produces an unpaginated doc when given no steps', () => {
        expect(decompile({ a: { type: 'text' } }).steps).toBeUndefined();
    });
});

describe('membership snapshot (JSON tab apply)', () => {
    it('carries membership across a wholesale node replacement', () => {
        const doc = docWith([node('a', 'email', { stepId: 's1' }), node('b', 'street', { stepId: 's2' })], [S1, S2]);
        const fresh = [node('n1', 'email'), node('n2', 'street'), node('n3', 'brand_new')];

        applyStepMembershipByName(fresh, stepMembershipByName(doc));

        expect(fresh[0].stepId).toBe('s1');
        expect(fresh[1].stepId).toBe('s2');
        expect(fresh[2].stepId).toBeUndefined();
    });
});

describe('payload', () => {
    it('omits the steps key entirely for an unpaginated form', () => {
        // Keeps a step-less payload byte-identical to what earlier versions stored.
        expect(buildPayload(docWith([node('a', 'a')]))).not.toHaveProperty('steps');
    });

    it('carries steps for a paginated form', () => {
        const payload = buildPayload(docWith([node('a', 'a', { stepId: 's1' })], [S1]));
        expect(payload.steps).toEqual({ step_1: { label: 'One', elements: ['a'] } });
    });

    it('keeps the doc when both artifacts match', () => {
        const doc = docWith([node('a', 'a', { stepId: 's1' })], [S1]);
        const result = loadPayload(buildPayload(doc));
        expect(result.rebuilt).toBe(false);
        expect(result.doc).toBe(doc);
    });

    it('rebuilds when only the steps artifact drifted', () => {
        const doc = docWith([node('a', 'a', { stepId: 's1' })], [S1]);
        const payload = buildPayload(doc);
        payload.steps = { step_1: { label: 'RENAMED', elements: ['a'] } };

        const result = loadPayload(payload);
        expect(result.rebuilt).toBe(true);
        expect(result.doc.steps![0].label).toBe('RENAMED');
    });

    it('keeps steps when the schema drifted', () => {
        const doc = docWith([node('a', 'a', { stepId: 's1' })], [S1]);
        const payload = buildPayload(doc);
        payload.schema = { ...payload.schema, injected: { type: 'text' } };

        const result = loadPayload(payload);
        expect(result.rebuilt).toBe(true);
        expect(result.doc.nodes.some((n) => n.name === 'injected')).toBe(true);
        expect(result.doc.steps).toHaveLength(1);
    });
});

describe('step settings (conditions, labels, buttons)', () => {
    const withStep = (step: BuilderStep, nodes: BuilderNode[] = []) =>
        ({ builderVersion: 1, nodes, formProps: {}, steps: [step] }) as BuilderDoc;

    it('keeps a plain step at exactly two compiled keys', () => {
        // Settings are omitted when unset so the stored artifact does not churn.
        const doc = withStep({ id: 's1', name: 'step_1', label: 'One' }, [node('a', 'a', { stepId: 's1' })]);
        expect(Object.keys(compileSteps(doc).step_1).sort()).toEqual(['elements', 'label']);
    });

    it('emits conditions, labels and buttons when set', () => {
        const doc = withStep({
            id: 's1', name: 'step_1', label: 'One',
            conditions: [['agree', '==', true]],
            labels: { next: 'Continue' },
            buttons: { previous: false },
        }, [node('a', 'a', { stepId: 's1' })]);

        const out = compileSteps(doc).step_1;
        expect(out.conditions).toEqual([['agree', '==', true]]);
        expect(out.labels).toEqual({ next: 'Continue' });
        expect(out.buttons).toEqual({ previous: false });
    });

    it('does not emit empty settings', () => {
        const doc = withStep({ id: 's1', name: 'step_1', label: 'One', conditions: [], labels: {}, buttons: {} });
        expect(Object.keys(compileSteps(doc).step_1).sort()).toEqual(['elements', 'label']);
    });

    it('hashes settings, so a settings-only edit counts as drift', () => {
        expect(hashSteps({ s: { label: 'A', elements: ['x'] } }))
            .not.toBe(hashSteps({ s: { label: 'A', elements: ['x'], conditions: [['y', '==', 1]] } }));
        expect(hashSteps({ s: { label: 'A', elements: [], labels: { next: 'Go' } } }))
            .not.toBe(hashSteps({ s: { label: 'A', elements: [], labels: { next: 'Next' } } }));
        expect(hashSteps({ s: { label: 'A', elements: [], buttons: { previous: false } } }))
            .not.toBe(hashSteps({ s: { label: 'A', elements: [] } }));
    });

    it('restores settings on decompile', () => {
        const steps = {
            step_1: {
                label: 'One', elements: ['a'],
                conditions: [['agree', '==', true]],
                labels: { finish: 'Send' },
                buttons: { previous: false },
            },
        };
        const doc = decompile({ a: { type: 'text' } }, {}, steps);
        expect(doc.steps![0].conditions).toEqual([['agree', '==', true]]);
        expect(doc.steps![0].labels).toEqual({ finish: 'Send' });
        expect(doc.steps![0].buttons).toEqual({ previous: false });
    });

    it('round-trips settings through the payload without looking like drift', () => {
        const doc = withStep({
            id: 's1', name: 'step_1', label: 'One',
            conditions: [['agree', '==', true]], labels: { next: 'Go' }, buttons: { finish: false },
        }, [node('a', 'a', { stepId: 's1' })]);

        const result = loadPayload(buildPayload(doc));
        expect(result.rebuilt).toBe(false);
        expect(result.doc).toBe(doc);
    });

    it('detects a tampered settings artifact', () => {
        const doc = withStep({ id: 's1', name: 'step_1', label: 'One' }, [node('a', 'a', { stepId: 's1' })]);
        const payload = buildPayload(doc);
        payload.steps!.step_1.labels = { next: 'Tampered' };
        expect(loadPayload(payload).rebuilt).toBe(true);
    });
});
