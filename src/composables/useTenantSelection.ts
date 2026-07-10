import { ref } from 'vue';

/**
 * SUPER_ADMIN tenant switcher (switch-only model).
 *
 * The selected tenant id is persisted in localStorage and sent on every request
 * as `X-Tenant-Id` (see BaseService.getTenantHeader). The backend honors it only
 * for SUPER_ADMIN; every other user is pinned to their JWT tenant. When nothing is
 * selected the backend falls back to the JWT tenant (the system tenant).
 */
const STORAGE_KEY = 'selectedTenantId';

export const selectedTenantId = ref<string>(localStorage.getItem(STORAGE_KEY) ?? '');

export function getSelectedTenantId(): string {
    return localStorage.getItem(STORAGE_KEY) ?? '';
}

export function setSelectedTenant(tenantId: string): void {
    if (tenantId) {
        localStorage.setItem(STORAGE_KEY, tenantId);
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
    selectedTenantId.value = tenantId;

    // Full reload so every page re-fetches its data under the newly scoped tenant.
    window.location.reload();
}
