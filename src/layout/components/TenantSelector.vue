<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Select } from 'primevue';
import { $api } from '@services/api';
import { AuthService } from '@services/AuthService';
import type { ITenant } from '@services/TenantsService';
import { getSelectedTenantId, setSelectedTenant } from '@/composables/useTenantSelection';

const accessInfo = new AuthService().getAccessInfo();

// Only SUPER_ADMIN may switch tenant. The backend ignores X-Tenant-Id for anyone else,
// so hiding the control here is purely a UX concern, not the security boundary.
const isSuperAdmin = computed(() =>
    Array.isArray(accessInfo?.user?.roles) && accessInfo!.user.roles.includes('SUPER_ADMIN')
);

const tenants = ref<ITenant[]>([]);

// Default to the current selection, falling back to the user's own (system) tenant so the
// dropdown reflects whichever tenant the backend is actually scoping to.
const selected = ref<string>(getSelectedTenantId() || accessInfo?.user?.tenantId || '');

async function loadTenants() {
    if (!isSuperAdmin.value) return;
    tenants.value = await $api.tenants.findAll();
}

function onChange() {
    if (selected.value) setSelectedTenant(selected.value);
}

onMounted(loadTenants);
</script>

<template>
    <Select
        v-if="isSuperAdmin"
        v-model="selected"
        :options="tenants"
        optionLabel="name"
        optionValue="id"
        size="small"
        placeholder="Select tenant"
        class="w-44"
        @change="onChange"
    >
        <template #dropdownicon>
            <i class="pi pi-building" />
        </template>
    </Select>
</template>
