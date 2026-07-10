<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { DataTable, Column, Tag, Button } from 'primevue';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from 'primevue/useconfirm';
import { $api } from '@services/api';
import type { ITenant } from '@services/TenantsService';
import CreateTenantDialog from './components/CreateTenantDialog.vue';

const router  = useRouter();
const toast   = useToast();
const confirm = useConfirm();

const tenants        = ref<ITenant[]>([]);
const loading        = ref(false);
const showCreateDialog = ref(false);

async function load() {
    loading.value = true;
    try {
        tenants.value = await $api.tenants.findAll();
    } finally {
        loading.value = false;
    }
}

async function toggleStatus(tenant: ITenant) {
    const action = tenant.status === 'active' ? 'suspend' : 'activate';
    confirm.require({
        message: `${action === 'suspend' ? 'Suspend' : 'Activate'} tenant "${tenant.name}"?`,
        header:  'Confirm',
        icon:    'pi pi-exclamation-triangle',
        accept: async () => {
            try {
                if (action === 'suspend') {
                    await $api.tenants.suspend(tenant.id);
                } else {
                    await $api.tenants.activate(tenant.id);
                }
                toast.add({ severity: 'success', summary: 'Done', detail: `Tenant ${action}d`, life: 3000 });
                await load();
            } catch {
                toast.add({ severity: 'error', summary: 'Error', detail: `Failed to ${action} tenant`, life: 3000 });
            }
        },
    });
}

function onCreated() {
    showCreateDialog.value = false;
    load();
}

onMounted(load);
</script>

<template>
    <div class="flex flex-col h-full gap-4 p-6">

        <!-- Header -->
        <div class="flex items-center justify-between">
            <h1 class="text-xl font-semibold text-surface-800 dark:text-surface-100">Tenants</h1>
            <Button label="New Tenant" icon="pi pi-plus" size="small" @click="showCreateDialog = true" />
        </div>

        <!-- Table -->
        <DataTable :value="tenants" :loading="loading" size="small" striped-rows empty-message="No tenants found.">

            <Column header="Name" style="min-width: 180px">
                <template #body="{ data }">
                    <span class="font-medium text-sm">{{ data.name }}</span>
                </template>
            </Column>

            <Column header="Slug" style="width: 160px">
                <template #body="{ data }">
                    <code class="text-xs bg-surface-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">{{ data.slug }}</code>
                </template>
            </Column>

            <Column header="Theme" style="width: 110px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400 capitalize">{{ data.branding?.theme ?? '—' }}</span>
                </template>
            </Column>

            <Column header="Status" style="width: 100px">
                <template #body="{ data }">
                    <Tag
                        :value="data.status"
                        :severity="data.status === 'active' ? 'success' : 'danger'"
                        style="font-size: 0.7rem; text-transform: capitalize;"
                    />
                </template>
            </Column>

            <Column header="Created" style="width: 140px">
                <template #body="{ data }">
                    <span class="text-xs text-surface-400">
                        {{ new Date(data.createdAt).toLocaleDateString() }}
                    </span>
                </template>
            </Column>

            <Column style="width: 120px">
                <template #body="{ data }">
                    <div class="flex items-center gap-2">
                        <Button
                            icon="pi pi-pencil"
                            size="small"
                            text
                            v-tooltip.top="'Edit'"
                            @click="router.push(`/admin/tenants/${data.id}`)"
                        />
                        <Button
                            :icon="data.status === 'active' ? 'pi pi-ban' : 'pi pi-check-circle'"
                            size="small"
                            text
                            :severity="data.status === 'active' ? 'warn' : 'success'"
                            :v-tooltip.top="data.status === 'active' ? 'Suspend' : 'Activate'"
                            @click="toggleStatus(data)"
                        />
                    </div>
                </template>
            </Column>

        </DataTable>
    </div>

    <CreateTenantDialog :visible="showCreateDialog" @update:visible="showCreateDialog = $event" @created="onCreated" />
</template>
