<script setup lang="ts">
import { Dialog, DataTable, Column, Button, Toolbar, useToast } from 'primevue';
import { onMounted, ref, watch } from 'vue' ;
import { useConfirm } from "primevue/useconfirm";
import { $api, type IPermission, type IRole, type PageResponse } from '../../services/api' ;
import { onDelete, onApprove } from '../../utils/common';
import { useRoute, useRouter } from 'vue-router';
import type { PermissionQuery } from '../../services/PermissionService';

const $emit = defineEmits(['addPermissions']);

const $router = useRouter();
const confirm = useConfirm();
const toast = useToast();
const $route = useRoute();

const roleId = ref<string>();

const permissions = ref<PageResponse<IPermission>>();
const selectedItems = ref<IPermission[] | null>(null);
const loading = ref(false);
const visible = ref(false);
const search = ref('');
const rowsPerPage = ref(15);

const fetchData = async () => {
	loading.value = true;

	try {
		const data = await $api.permissions.fetchPermissions();
		permissions.value = data as PageResponse<IPermission>;
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error fetching permissions', life: 3000 });
	} finally {
		loading.value = false;
	}
}

const onAdd = () => {
    onApprove(confirm, 'Are you sure you want to add these permissions?', () => {
        try {
            $emit('addPermissions', selectedItems.value);
            selectedItems.value = null;
            $router.go(-1);
        } catch(error) {
            toast.add({ severity: 'error', summary: 'Error', detail: 'Error creating permission', life: 3000 });
        }
    })
}

onMounted(() => {
    visible.value = true;
	const { id } = $route.params
	roleId.value = id as string;
    fetchData()
});
</script>

<template>
    <Dialog
        v-model:visible="visible"
        maximizable
        modal
        header="Add Permission"
        :style="{ width: '60rem', 'height': '40rem' }"
        :breakpoints="{ '1199px': '75vw', '575px': '90vw' }"
        @after-hide="$router.go(-1)"
    >
        <div ref="pageRef" style="height: 100%;">
            <DataTable
                v-model:selection="selectedItems"
                selectionMode="multiple"
                dataKey="_id"
                :value="permissions?.rows"
                :totalRecords="permissions?.totalRecords"
                :loading="loading"
                :paginator="(permissions?.totalRecords || 0) / rowsPerPage > 1"
                :rows="rowsPerPage"
                :rowsPerPageOptions="[5, 10, 20, 40]"
                scrollable
                scrollHeight="26rem"
            >
                <Column field="name" header="Name"></Column>
                <Column field="type" header="Type"></Column>
                <Column field="description" header="Description"></Column>
            </DataTable>
        </div>
        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="$router.go(-1)" />
            <Button label="Add" icon="pi pi-plus" :disabled="!selectedItems" @click="onAdd" />
        </template>
    </Dialog>
</template>