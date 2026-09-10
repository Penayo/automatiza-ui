/**
 * Persistence boundary for the builder: BuilderDoc <-> IForm.vueform.
 */
import { compile, hashSchema } from './compile';
import { decompile } from './decompile';
import { BUILDER_VERSION, emptyDoc, type BuilderDoc, type VueformPayload } from './types';

export function buildPayload(doc: BuilderDoc): VueformPayload {
    const schema = compile(doc);
    return { builderVersion: BUILDER_VERSION, doc, schema, schemaHash: hashSchema(schema) };
}

export interface LoadResult {
    doc: BuilderDoc;
    /**
     * True when the stored `doc` did not match the stored `schema` and was rebuilt from
     * the schema. Builder-only metadata (node ids, collapsed state, notes) was reset,
     * which the caller must tell the user about rather than silently absorbing.
     */
    rebuilt: boolean;
}

/**
 * Load a stored payload back into an editable doc.
 *
 * The doc is authoritative only when it still compiles to the stored schema. If they
 * disagree — the JSON tab was edited, an AI rewrote the schema, a server-side migration
 * touched it — the *schema* wins and the doc is rebuilt from it. Never reconcile the two
 * silently; a half-merged tree is worse than a reset one.
 *
 * The comparison is against the stored `schema`, not the stored `schemaHash`. Anything
 * that edits the schema directly leaves `schemaHash` stale, so checking the doc against
 * that hash would agree with itself and miss precisely the drift this guard exists for.
 */
export function loadPayload(payload: VueformPayload | null | undefined): LoadResult {
    if (!payload) return { doc: emptyDoc(), rebuilt: false };

    const { doc, schema } = payload;

    if (doc && Array.isArray(doc.nodes) && hashSchema(compile(doc)) === hashSchema(schema ?? {})) {
        return { doc, rebuilt: false };
    }

    return { doc: decompile(schema ?? {}, doc?.formProps ?? {}), rebuilt: true };
}
