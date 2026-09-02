/**
 * Session continuity — see docs/specs/authentication-and-sessions.spec.md §10-§14 (D7).
 *
 * The access token expires on a fixed schedule while the user may be sitting on
 * hours of unsaved in-memory work (a BPMN diagram, a form definition). The old
 * behavior — clear the token and `router.push('/login')` straight from an axios
 * error handler — destroyed that work with no prompt: it consults no dirty flag,
 * and it is not a page unload, so `beforeunload` never fires either. A background
 * sidebar poll was enough to trigger it.
 *
 * This module replaces that eviction with an in-place re-authentication gate:
 * the page stays mounted, the user proves who they are again, and the request
 * that failed is replayed. Nothing on screen is lost.
 */

import { ref, readonly } from 'vue';

// ── Unsaved-work registry ────────────────────────────────────────────────────
// Editors register a predicate that reports whether they currently hold unsaved
// state. Used to warn before the one path that still discards work: the user
// choosing to sign out from the re-auth dialog.

type DirtyCheck = () => boolean;

const dirtySources = new Set<DirtyCheck>();

/**
 * Registers `check` as a source of unsaved work for as long as the component
 * lives. Returns the unregister function — call it in `onUnmounted`.
 */
export function registerUnsavedWork(check: DirtyCheck): () => void {
    dirtySources.add(check);
    return () => { dirtySources.delete(check); };
}

/** True when any mounted editor reports unsaved changes. */
export function hasUnsavedWork(): boolean {
    for (const check of dirtySources) {
        try {
            if (check()) return true;
        } catch {
            // A broken predicate must never be the reason we discard someone's
            // work — treat it as "might be dirty".
            return true;
        }
    }
    return false;
}

// ── Re-authentication gate ───────────────────────────────────────────────────

const open = ref(false);

/** Drives the `ReauthDialog` visibility. Read-only outside this module. */
export const reauthOpen = readonly(open);

/**
 * Everyone who hit a 401 while this dialog is open waits on the same promise, so
 * N concurrent failures produce one dialog and one login — not N stacked prompts.
 * (The request-level single-flight refresh is D6, once /auth/refresh exists.)
 */
let pending: Promise<boolean> | null = null;
let settle: ((reauthenticated: boolean) => void) | null = null;

/**
 * Asks the user to re-authenticate without leaving the page.
 * Resolves `true` once they succeed (caller may replay its request), `false` if
 * they chose to sign out instead.
 */
export function requireReauth(): Promise<boolean> {
    if (pending) return pending;

    open.value = true;
    pending = new Promise<boolean>(resolve => { settle = resolve; });
    return pending;
}

/** Called by the dialog after a successful login. */
export function completeReauth() {
    open.value = false;
    settle?.(true);
    settle  = null;
    pending = null;
}

/** Called by the dialog when the user opts to sign out instead. */
export function abandonReauth() {
    open.value = false;
    settle?.(false);
    settle  = null;
    pending = null;
}

/** True while a re-auth dialog is already on screen. */
export function isReauthPending(): boolean {
    return pending !== null;
}
