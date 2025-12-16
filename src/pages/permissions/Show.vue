<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { $api } from '../../services/api';
import type { IPermission } from '../../services/api';
import { useRoute, useRouter } from 'vue-router';
import Page from '../../components/Page.vue';
import { onDelete } from '../../utils/common';
import { Button, Card, Panel, useConfirm, useToast } from 'primevue';

const confirm = useConfirm();
const $router = useRouter();
const toast = useToast();
const $route = useRoute();
const permissionId = ref<string>('');
const permission = ref<IPermission | null>(null);

async function findItem() {
	const { id } = $route.params
	permissionId.value = id as string;
	permission.value = await $api.permissions.findById(permissionId.value);
}

const onDeleteConfirm = async (item: IPermission) => {
	try {
		await $api.permissions.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'Permission deleted successfully', life: 3000 });
		setTimeout(() => { $router.go(-1) }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting permission', life: 3000 });
	}
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Page :title="permission?.name">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Permissions
                </a>/
                {{ permission?.name }}
            </h2>
		</template>

        <template #actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="findItem" />
			<Button severity="secondary" :disabled="!permission" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'PermissionsEdit', params: { id: permission?._id }})" />
			<Button
				severity="danger"
				rounded
				icon="pi pi-trash"
				@click="onDelete(confirm, permission, onDeleteConfirm)"
			/>
        </template>

		<div class="m-0" v-if="permission">
		          <Panel header="Permission Information" class="mt-4">
		              <div class="grid grid-cols-2 gap-4">
		                  <div>
		                      <label class="block text-sm font-medium text-gray-500">Type</label>
		                      <p class="mt-1 text-sm  font-bold">{{ permission.type }}</p>
		                  </div>
		                  <div>
		                      <label class="block text-sm font-medium text-gray-500">Name</label>
		                      <p class="mt-1 text-sm  font-bold">{{ permission.name }}</p>
		                  </div>
		                  <div class="col-span-2">
		                      <label class="block text-sm font-medium text-gray-500">Description</label>
		                      <p class="mt-1 text-sm  font-bold">{{ permission.description }}</p>
		                  </div>
		              </div>
		          </Panel>
		</div>
	</Page>
</template>