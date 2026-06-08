import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../AuthService';

/**
 * AuthService tests focus on the crypto round-trip (saveAccessInfo / getAccessInfo)
 * since those run entirely in-process with no network calls.
 *
 * The SECRET_KEY inside AuthService falls back to 'fallback-dev-key' when
 * VITE_CRYPTO_KEY is not set, so tests are self-contained and reproducible.
 */
describe('AuthService', () => {
    let svc: AuthService;

    beforeEach(() => {
        localStorage.clear();
        svc = new AuthService();
    });

    // ── getAccessInfo ─────────────────────────────────────────────────────────

    describe('getAccessInfo', () => {
        it('returns null when localStorage is empty', () => {
            expect(svc.getAccessInfo()).toBeNull();
        });

        it('returns null and clears stale keys when accessInfo is corrupted', () => {
            localStorage.setItem('accessInfo', 'not-valid-ciphertext');
            localStorage.setItem('token', 'some-old-token');

            expect(svc.getAccessInfo()).toBeNull();
            expect(localStorage.getItem('accessInfo')).toBeNull();
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    // ── saveAccessInfo / getAccessInfo round-trip ─────────────────────────────

    describe('saveAccessInfo + getAccessInfo', () => {
        const access = {
            access_token: 'eyJhbGciOiJIUzI1NiJ9.payload.sig',
            user: {
                username: 'alice',
                roles:    ['ADMIN'],
                groups:   [],
                tenantId: 'tenant-uuid-001',
            },
        };

        it('retrieves exactly the same object that was saved', () => {
            svc.saveAccessInfo(access as any);
            expect(svc.getAccessInfo()).toEqual(access);
        });

        it('does not store the token or username in plaintext in localStorage', () => {
            svc.saveAccessInfo(access as any);
            const raw = localStorage.getItem('accessInfo')!;
            expect(raw).not.toContain('eyJhbGciOiJIUzI1NiJ9');
            expect(raw).not.toContain('alice');
        });

        it('produces different ciphertext for different payloads', () => {
            const other = { ...access, access_token: 'different-token', user: { ...access.user, username: 'bob' } };
            svc.saveAccessInfo(access as any);
            const cipher1 = localStorage.getItem('accessInfo');
            localStorage.clear();
            svc.saveAccessInfo(other as any);
            const cipher2 = localStorage.getItem('accessInfo');
            expect(cipher1).not.toBe(cipher2);
        });

        it('survives a second AuthService instance (same key)', () => {
            svc.saveAccessInfo(access as any);
            const svc2 = new AuthService();
            expect(svc2.getAccessInfo()).toEqual(access);
        });
    });
});
