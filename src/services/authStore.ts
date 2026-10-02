/**
 * Client auth state — docs/specs/authentication-and-sessions.spec.md §11 D6/D12.
 *
 * The access token lives in memory only. Nothing credential-like is written to
 * localStorage: the long-lived credential is the httpOnly refresh cookie, which
 * JS cannot read. A reload loses the in-memory token, so the app calls
 * `/auth/refresh` once at boot (`ensureSession`) to get a new one.
 */

import axios from 'axios';
import { shallowRef, readonly } from 'vue';
import type { IAccess } from '@services/AuthService';

const API = import.meta.env.VITE_API_HOST;

/** Refresh this long before the access token expires, so raw `fetch` callers never send a dead one. */
const REFRESH_AHEAD_MS = 60_000;

const access = shallowRef<IAccess | null>(null);

/** Reactive view of the current session, for components that want to watch it. */
export const currentAccess = readonly(access);

export function getAccessInfo(): IAccess | null {
    return access.value;
}

export function getAccessToken(): string | null {
    return access.value?.access_token ?? null;
}

export function setAccess(next: IAccess): void {
    access.value = next;
    scheduleRefresh(next.access_token);
}

export function clearAccess(): void {
    access.value = null;
    if (timer) clearTimeout(timer);
    timer = null;
}

// ── Refresh (single-flight, D6) ──────────────────────────────────────────────
// Concurrent 401s, the proactive timer and the boot call all share one request.
// With rotation (D3) a second parallel refresh would present an already-rotated
// cookie — the server tolerates that briefly, but there is no reason to rely on it.

let inflight: Promise<boolean> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Resolves `true` on
 * success. On failure the current identity is kept (the re-auth dialog needs
 * the username) but the token is known dead.
 */
export function refreshSession(): Promise<boolean> {
    if (inflight) return inflight;

    inflight = axios
        .post<IAccess>(`${API}/auth/refresh`, {}, { withCredentials: true })
        .then(({ data }) => { setAccess(data); return true; })
        .catch(() => false)
        .finally(() => { inflight = null; });

    return inflight;
}

let boot: Promise<void> | null = null;

/** Restores the session after a page load. Runs the refresh at most once per page. */
export function ensureSession(): Promise<void> {
    if (!boot) {
        purgeLegacyStorage();
        boot = access.value ? Promise.resolve() : refreshSession().then(() => undefined);
    }
    return boot;
}

// ── Proactive refresh ────────────────────────────────────────────────────────
// Permitted by §12 alongside (never instead of) the reactive 401 path. It keeps
// the token fresh for the few raw `fetch`/axios callers that bypass BaseService
// (SSE form chain, AI chat stream, public start form).

let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(token: string): void {
    if (timer) clearTimeout(timer);
    timer = null;

    const exp = expiryOf(token);
    if (!exp) return;

    const delay = Math.max(exp - Date.now() - REFRESH_AHEAD_MS, 0);
    timer = setTimeout(() => { void refreshSession(); }, delay);
}

// Background tabs throttle timers; catch up as soon as the tab is visible again.
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        const exp = access.value && expiryOf(access.value.access_token);
        if (exp && exp - Date.now() < REFRESH_AHEAD_MS) void refreshSession();
    });
}

/** `exp` claim in ms. The token is not verified here — only the server does that. */
function expiryOf(token: string): number | null {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
        return null;
    }
}

/** Earlier builds kept the token and an AES-"encrypted" copy in localStorage (FINDINGS C16). */
function purgeLegacyStorage(): void {
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('accessInfo');
    } catch { /* storage unavailable */ }
}
