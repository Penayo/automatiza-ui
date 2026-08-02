/**
 * A tiny in-memory hand-off between the datasource browse grid and the standalone
 * details page. When a user clicks a record, the already-loaded row (which carries
 * every mapped field) is stashed here and read by the details page — so the common
 * click-through shows all fields with no extra request.
 *
 * On a deep-link / refresh the cache is empty; the details page then re-fetches via
 * the datasource's `single` operation (when one is declared).
 */
const cache = new Map<string, Record<string, any>>();

const keyOf = (datasourceKey: string, id: string) => `${datasourceKey}::${id}`;

export function rememberRecord(datasourceKey: string, id: string, row: Record<string, any>): void {
    cache.set(keyOf(datasourceKey, id), row);
}

export function recallRecord(datasourceKey: string, id: string): Record<string, any> | null {
    return cache.get(keyOf(datasourceKey, id)) ?? null;
}
