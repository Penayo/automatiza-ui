/**
 * Form pagination — Vueform's native `steps`.
 *
 * One form, one submission, split into pages. Distinct from the engine's multi-step
 * task chaining, which is a sequence of *separate* task completions with a decision
 * between them.
 *
 * Vueform models this as a form-level `steps` prop, a sibling of `schema`, that
 * partitions the flat schema **by element name**:
 *
 *     steps: { step_1: { label: 'Contact', elements: ['email', 'phone'] } }
 *
 * ── The load-bearing design rule ──────────────────────────────────────────────
 * `BuilderNode.stepId` points at a step's `id`, and element **names are derived at
 * compile time**. That is what makes renaming a field free: `renameNode` needs no step
 * awareness at all. Never store names in `doc.steps` — doing so reintroduces a whole
 * class of rename bug.
 *
 * ── The second rule ───────────────────────────────────────────────────────────
 * `stepId` is the sole source of truth for *membership*; array position is the sole
 * source of truth for *order within a step*. Contiguity of `doc.nodes` is not an
 * invariant every operation must uphold — it is re-established by
 * normalizeStepsInPlace(), which runs after every mutation.
 */
import type { BuilderDoc, BuilderNode, BuilderStep, VueformSteps } from './types';

/** Steps only ever partition the top level; these types own their children instead. */
function topLevel(doc: BuilderDoc): BuilderNode[] {
    return doc.nodes;
}

export function hasSteps(doc: BuilderDoc): boolean {
    return Array.isArray(doc.steps) && doc.steps.length > 0;
}

/** Machine-generated, unique within the doc. Never shown to the user. */
export function nextStepName(steps: BuilderStep[]): string {
    const taken = new Set(steps.map((s) => s.name));
    let i = steps.length + 1;
    while (taken.has(`step_${i}`)) i += 1;
    return `step_${i}`;
}

/**
 * Re-establish every step invariant. Mutates `doc` in place and returns whether
 * anything changed. Idempotent.
 *
 * In place, and returning a boolean rather than a new doc, because loadPayload's
 * contract is that an unchanged doc comes back as the *same object* — the round-trip
 * suite asserts identity.
 */
export function normalizeStepsInPlace(doc: BuilderDoc): boolean {
    const before = JSON.stringify(doc.nodes);

    // A stepId is meaningless below the top level: those nodes travel with their
    // container. Strip any left behind by a drag into a container.
    const stripNested = (nodes: BuilderNode[]) => {
        for (const node of nodes) {
            if (node.children) {
                for (const child of node.children) {
                    delete child.stepId;
                    stripNested([child]);
                }
            }
        }
    };
    stripNested(doc.nodes);

    if (!hasSteps(doc)) {
        // No steps at all: membership cannot mean anything.
        for (const node of topLevel(doc)) delete node.stepId;
        return JSON.stringify(doc.nodes) !== before;
    }

    const known = new Set(doc.steps!.map((s) => s.id));
    for (const node of topLevel(doc)) {
        if (node.stepId !== undefined && !known.has(node.stepId)) delete node.stepId;
    }

    // Stable partition into step order, unassigned last. Unassigned nodes go last
    // because that is exactly where Vueform's `orderedSchema` appends elements no step
    // lists — so the canvas stays faithful to the rendered order.
    const buckets = new Map<string, BuilderNode[]>();
    for (const step of doc.steps!) buckets.set(step.id, []);
    const unassigned: BuilderNode[] = [];

    for (const node of topLevel(doc)) {
        const bucket = node.stepId !== undefined ? buckets.get(node.stepId) : undefined;
        if (bucket) bucket.push(node);
        else unassigned.push(node);
    }

    doc.nodes = [...doc.steps!.flatMap((s) => buckets.get(s.id) ?? []), ...unassigned];
    return JSON.stringify(doc.nodes) !== before;
}

/**
 * Build the Vueform `steps` artifact. Returns `{}` for an unpaginated form, which
 * callers use to decide whether to store the key at all.
 *
 * A step with no elements is still emitted: an empty page is a design mistake worth
 * seeing in the preview, not something to silently drop.
 */
export function compileSteps(doc: BuilderDoc): VueformSteps {
    if (!hasSteps(doc)) return {};

    const out: VueformSteps = {};
    for (const step of doc.steps!) {
        out[step.name] = {
            label: step.label,
            elements: topLevel(doc)
                .filter((n) => n.stepId === step.id)
                .map((n) => n.name),
            // Only emitted when set, so a plain step stays a two-key object and the
            // stored artifact does not churn.
            ...(step.conditions?.length ? { conditions: step.conditions } : {}),
            ...(step.labels && Object.keys(step.labels).length ? { labels: step.labels } : {}),
            ...(step.buttons && Object.keys(step.buttons).length ? { buttons: step.buttons } : {}),
        };
    }
    return out;
}

/**
 * Order-sensitive hash of the steps artifact.
 *
 * Deliberately NOT the `stableStringify` used for schemas: that sorts object keys, and
 * a step's key order *is* its position — sorting would make reordering steps invisible
 * to the drift guard.
 */
export function hashSteps(steps: VueformSteps): string {
    const trace = JSON.stringify(
        Object.entries(steps ?? {}).map(([name, step]) => [
            name,
            step?.label ?? '',
            step?.elements ?? [],
            step?.conditions ?? null,
            step?.labels ?? null,
            step?.buttons ?? null,
        ]),
    );

    let hash = 0x811c9dc5;
    for (let i = 0; i < trace.length; i++) {
        hash ^= trace.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

/**
 * Snapshot of which step each top-level field belongs to, keyed by field NAME.
 *
 * The one place names are used as step keys, and only in memory: it lets a JSON-tab
 * import carry membership across a wholesale node replacement, where ids cannot
 * survive because decompile mints new ones.
 */
export function stepMembershipByName(doc: BuilderDoc): Map<string, string> {
    const out = new Map<string, string>();
    for (const node of topLevel(doc)) {
        if (node.stepId !== undefined) out.set(node.name, node.stepId);
    }
    return out;
}

/** Re-apply a name-keyed membership snapshot to a fresh set of top-level nodes. */
export function applyStepMembershipByName(nodes: BuilderNode[], membership: Map<string, string>): void {
    for (const node of nodes) {
        const stepId = membership.get(node.name);
        if (stepId !== undefined) node.stepId = stepId;
    }
}
