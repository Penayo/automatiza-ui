import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { clearAccess, ensureSession, getAccessInfo, getAccessToken, refreshSession, setAccess } from '../authStore';

vi.mock('axios');

const access = { access_token: 'header.eyJleHAiOjk5OTk5OTk5OTl9.sig', user: { username: 'ana' } } as any;

/**
 * authStore — auth spec §11 D6/D12: the access token lives in memory only and
 * refreshes are single-flight.
 */
describe('authStore', () => {
    beforeEach(() => {
        clearAccess();
        localStorage.clear();
        vi.mocked(axios.post).mockReset();
    });

    it('keeps the token in memory and never writes it to localStorage', () => {
        setAccess(access);
        expect(getAccessToken()).toBe(access.access_token);
        expect(JSON.stringify({ ...localStorage })).not.toContain(access.access_token);
    });

    it('shares one /auth/refresh request between concurrent callers', async () => {
        vi.mocked(axios.post).mockResolvedValue({ data: access });
        const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

        expect(results).toEqual([true, true, true]);
        expect(axios.post).toHaveBeenCalledTimes(1);
        expect(getAccessInfo()?.user.username).toBe('ana');
    });

    it('keeps the identity when refresh fails, so the re-auth dialog knows who to ask for', async () => {
        setAccess(access);
        vi.mocked(axios.post).mockRejectedValue(new Error('401'));

        expect(await refreshSession()).toBe(false);
        expect(getAccessInfo()?.user.username).toBe('ana');
    });

    it('ensureSession purges the legacy localStorage keys', async () => {
        localStorage.setItem('token', 'old');
        localStorage.setItem('accessInfo', 'old');
        vi.mocked(axios.post).mockRejectedValue(new Error('401'));

        await ensureSession();

        expect(localStorage.getItem('token')).toBeNull();
        expect(localStorage.getItem('accessInfo')).toBeNull();
    });
});
