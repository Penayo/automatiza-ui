<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Page from '../../components/Page.vue';
import { DataTable, Column, Button, Tag, useToast } from 'primevue';
import { useConfirm } from 'primevue/useconfirm';
import { $api, type IApiKey } from '../../services/api';
import { onDelete } from '../../utils/common';
import { useRouter } from 'vue-router';

const $router = useRouter();
const confirm = useConfirm();
const toast = useToast();

const pageRef = ref<InstanceType<typeof Page>>();
const items = ref<IApiKey[]>([]);
const selectedItem = ref<IApiKey | null>(null);
const loading = ref(false);

const fetchData = async () => {
    loading.value = true;
    try {
        items.value = await $api.apiKeys.fetchApiKeys();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to fetch API keys', life: 3000 });
    } finally {
        loading.value = false;
    }
};

const onDeleteConfirm = async (item: IApiKey) => {
    try {
        await $api.apiKeys.deleteApiKey(item._id!);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'API key deleted', life: 3000 });
        setTimeout(() => fetchData(), 400);
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete API key', life: 3000 });
    }
};

const toggleActive = async (item: IApiKey) => {
    try {
        await $api.apiKeys.updateApiKey(item._id!, { isActive: !item.isActive });
        toast.add({
            severity: 'success',
            summary: 'Updated',
            detail: `Key "${item.name}" ${item.isActive ? 'deactivated' : 'activated'}`,
            life: 3000,
        });
        fetchData();
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update key status', life: 3000 });
    }
};

const formatDate = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString() : 'Never';

onMounted(() => fetchData());
</script>

<template>
    <Page title="API Keys" ref="pageRef">
        <template v-slot:actions>
            <Button variant="text" rounded icon="pi pi-refresh" @click="fetchData" />
            <Button label="New Key" icon="pi pi-plus" @click="$router.push({ name: 'ApiKeysNew' })" />
            <Button
                severity="secondary"
                :disabled="!selectedItem"
                label="Edit"
                icon="pi pi-pen-to-square"
                @click="$router.push({ name: 'ApiKeysEdit', params: { id: selectedItem?._id } })"
            />
            <Button
                :severity="selectedItem?.isActive ? 'warn' : 'success'"
                :disabled="!selectedItem"
                :label="selectedItem?.isActive ? 'Deactivate' : 'Activate'"
                :icon="selectedItem?.isActive ? 'pi pi-eye-slash' : 'pi pi-eye'"
                @click="toggleActive(selectedItem!)"
            />
            <Button
                severity="danger"
                :disabled="!selectedItem"
                rounded
                icon="pi pi-trash"
                @click="onDelete(confirm, selectedItem, onDeleteConfirm)"
            />
        </template>

        <DataTable
            v-model:selection="selectedItem"
            selectionMode="single"
            dataKey="_id"
            class="rounded-2xl!"
            :loading="loading"
            :value="items"
            scrollable
            :scrollHeight="(pageRef?.$el.clientHeight - 143) + 'px'"
        >
            <Column field="name" header="Name" />

            <Column field="roles" header="Roles">
                <template #body="{ data }">
                    <div class="flex flex-wrap gap-1">
                        <Tag
                            v-for="role in data.roles"
                            :key="role"
                            :value="role"
                            severity="secondary"
                        />
                        <span v-if="!data.roles?.length" class="text-gray-400 text-sm">—</span>
                    </div>
                </template>
            </Column>

            <Column field="isActive" header="Status">
                <template #body="{ data }">
                    <Tag
                        :severity="data.isActive ? 'success' : 'danger'"
                        :value="data.isActive ? 'Active' : 'Inactive'"
                    />
                </template>
            </Column>

            <Column field="lastUsedAt" header="Last Used">
                <template #body="{ data }">
                    {{ formatDate(data.lastUsedAt) }}
                </template>
            </Column>

            <Column field="expiresAt" header="Expires">
                <template #body="{ data }">
                    <span :class="{ 'text-red-500': data.expiresAt && new Date(data.expiresAt) < new Date() }">
                        {{ formatDate(data.expiresAt) }}
                    </span>
                </template>
            </Column>

            <Column field="createdAt" header="Created">
                <template #body="{ data }">
                    {{ formatDate(data.createdAt) }}
                </template>
            </Column>
        </DataTable>
    </Page>
</template>
