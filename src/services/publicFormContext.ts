/**
 * What the anonymous form pages know about themselves, for the services they call.
 *
 * A public task form has no session, so the engine authorizes its file reads with
 * the share token instead: `POST /bpmn/files/refresh-urls` signs only the keys
 * reachable from the instance that token addresses (files-and-documents.spec.md §7).
 *
 * The token lives here rather than in a prop because the caller is a Vueform custom
 * element (`DocumentListElement`), reached through Vueform's own render path — it
 * has no route access and no component chain to thread a prop down. The two public
 * pages set this on mount and clear it on unmount; everywhere else it is null and
 * the service falls back to the bearer token.
 */
export interface PublicFormContext {
    token?:               string;
    processDefinitionId?: string;
}

let current: PublicFormContext | null = null;

export function setPublicFormContext(context: PublicFormContext): void {
    current = context;
}

export function clearPublicFormContext(): void {
    current = null;
}

export function getPublicFormContext(): PublicFormContext | null {
    return current;
}
