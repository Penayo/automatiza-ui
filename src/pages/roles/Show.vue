<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { $api } from '../../services/api';
import type { IPermission, IRole } from '../../services/api';
import { useRoute, useRouter } from 'vue-router';
import Page from '../../components/Page.vue';
import { onApprove, onDelete } from '../../utils/common';
import { Button, Column, DataTable, Tab, TabList, TabPanel, TabPanels, Tabs, useConfirm, useToast } from 'primevue';

const confirm = useConfirm();
const $router = useRouter();
const toast = useToast();
const $route = useRoute();
const pageRef = ref<InstanceType<typeof Page>>();
const roleId = ref<string>('');
const role = ref<IRole | null>(null);
const permissionsList = ref<IPermission[]>([]);
const selectedPermission = ref<IPermission | null>(null);

async function findItem() {
	const { id } = $route.params
	roleId.value = id as string;
	role.value = await $api.roles.findById(roleId.value);
    permissionsList.value = role.value.permissions as IPermission[];
}

const onAddPermissions = async (permissions: IPermission[]) => {
    if (!role.value) return;

    try {
        await $api.roles.update(roleId.value, {
            ...role.value,
            permissions: [ ...permissionsList.value.map(p => p._id), ...permissions.map((permission) => permission._id)] as string[]
        });
        findItem();
        toast.add({ severity: 'success', summary: 'Ok', detail: 'Permissions added successfully!', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Error adding permissions!', life: 3000 });
    }
}

const onDeleteConfirm = async () => {
    if (!role.value) return;

	try {
        role.value = {
            ...role.value,
            permissions: permissionsList.value.filter((permission) => permission._id !== selectedPermission.value?._id)
        }

		await $api.roles.update(role.value?._id as string, role.value);
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Permission removed successfully', life: 3000 });
        findItem();
	} catch (error) {
        console.log(error)
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error removing permission', life: 3000 });
	}
}

const removePermission = async () => {
    onApprove(confirm, 'Are you sure you want to remove this permission?', onDeleteConfirm)
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Page :title="role?.key" ref="pageRef">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Roles
                </a>/
                {{ role?.key }}
            </h2>
		</template>

        <template #actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="findItem" />
			<Button severity="secondary" :disabled="!role" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'RolesEdit', params: { id: role?._id }})" />
			<Button
				severity="danger"
				rounded
				icon="pi pi-trash"
				@click="onDelete(confirm, role, onDeleteConfirm)"
			/>
        </template>

		<div class="m-0" v-if="role">
            <Tabs value="data">
                <TabList>
                    <Tab value="data">Datos del Rol</Tab>
                    <Tab value="1">Permisos</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel value="data">
                        <div class="grid grid-cols-2 gap-4 p-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-500">Key</label>
                                <p class="mt-1 text-sm  font-bold">{{ role.key }}</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-500">Description</label>
                                <p class="mt-1 text-sm  font-bold">{{ role.description }}</p>
                            </div>
                        </div>
                    </TabPanel>

                    <TabPanel value="1" class="-m-3">
                        <DataTable
                            v-model:selection="selectedPermission"
                            selectionMode="single"
                            dataKey="_id"
                            :value="permissionsList"
                            scrollable
                            :scrollHeight="(pageRef?.$el.clientHeight - 210) + 'px'"
                        >

                            <template #header>
                                <div class="flex flex-wrap mb-2 justify-between gap-2">
                                    <h3 class=""></h3>
                                    <div class="flex flex-wrap gap-2">
                                        <Button label="Add" size="small" icon="pi pi-plus" @click="$router.push({ name: 'AddRolesPermissions' })" />
                                        <Button label="Remove" size="small" icon="pi pi-trash" severity="danger" :disabled="!selectedPermission" @click="removePermission" />
                                    </div>
                                </div>
                            </template>

                            <Column field="name" header="Name"></Column>
                            <Column field="type" header="Type"></Column>
                            <Column field="description" header="Description"></Column>
                        </DataTable>
                    </TabPanel>
                </TabPanels>
            </Tabs>
		</div>

        <router-view @add-permissions="onAddPermissions" />
	</Page>
</template>