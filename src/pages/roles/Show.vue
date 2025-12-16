<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { $api } from '../../services/api';
import type { IRole } from '../../services/api';
import { useRoute, useRouter } from 'vue-router';
import Page from '../../components/Page.vue';
import { onDelete } from '../../utils/common';
import { Button, Card, Panel, useConfirm, useToast } from 'primevue';

const confirm = useConfirm();
const $router = useRouter();
const toast = useToast();
const $route = useRoute();
const roleId = ref<string>('');
const role = ref<IRole | null>(null);

async function findItem() {
	const { id } = $route.params
	roleId.value = id as string;
	role.value = await $api.roles.findById(roleId.value);
}

const onDeleteConfirm = async (item: IRole) => {
	try {
		await $api.roles.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Role deleted successfully', life: 3000 });
		setTimeout(() => { $router.go(-1) }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting role', life: 3000 });
	}
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Page :title="role?.key">
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
            <Panel header="Role Information" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Key</label>
                        <p class="mt-1 text-sm  font-bold">{{ role.key }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Description</label>
                        <p class="mt-1 text-sm  font-bold">{{ role.description }}</p>
                    </div>
                </div>
            </Panel>

            <Panel header="Permissions" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="mt-1 text-sm  font-bold">{{ role.permissions.join(', ') }}</p>
                    </div>
                </div>
            </Panel>
		</div>
	</Page>
</template>