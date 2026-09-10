/**
 * Deep clone for builder data.
 *
 * `structuredClone` throws DataCloneError on Vue's reactive Proxy, and `toRaw` only
 * unwraps the outermost level — nested props read back through the tree are proxies
 * too. A JSON round trip unwraps every level at once and, because the whole builder doc
 * is persisted as JSON, it also guarantees nothing unserialisable can enter the tree in
 * the first place: a function or a Date would be silently dropped here rather than
 * surviving in memory and vanishing on save.
 */
export function clonePlain<T>(value: T): T {
    return JSON.parse(JSON.stringify(value ?? null)) as T;
}
