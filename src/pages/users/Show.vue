<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { $api } from '../../services/api';
import type { IUser } from '../../services/api';
import { useRoute, useRouter } from 'vue-router';
import Page from '../../components/Page.vue';
import { onDelete } from '../../utils/common';
import { Button, Card, Panel, useConfirm, useToast } from 'primevue';

const confirm = useConfirm();
const $router = useRouter();
const toast = useToast();
const $route = useRoute();
const userId = ref<string>('');
const user = ref<IUser | null>(null);

async function findItem() {
	const { id } = $route.params
	userId.value = id as string;
	user.value = await $api.users.findById(userId.value);
}

const onDeleteConfirm = async (item: IUser) => {
	try {
		await $api.users.delete(item._id as string)
		toast.add({ severity: 'success', summary: 'Ok', detail: 'User deleted successfully', life: 3000 });
		setTimeout(() => { $router.go(-1) }, 500)
	} catch (error) {
		toast.add({ severity: 'error', summary: 'Error', detail: 'Error deleting user', life: 3000 });
	}
}

onMounted(() => {
	findItem()
})
</script>

<template>
	<Page :title="user?.username">
        <template #header>
			<h2 class="text-2xl md:text-4xl font-thin text-emerald-600 mb-4">
                <a href="#" @click.prevent="$router.go(-1)" class="text-gray-400 hover:text-gray-500">
                    Users
                </a>/
                {{ user?.username }}
            </h2>
		</template>

        <template #actions>
			<Button variant="text" rounded icon="pi pi-refresh" @click="findItem" />
			<Button severity="secondary" :disabled="!user" label="Edit" icon="pi pi-pen-to-square" @click="$router.push({ name: 'UsersEdit', params: { id: user?._id }})" />
			<Button
				severity="danger"
				rounded
				icon="pi pi-trash"
				@click="onDelete(confirm, user, onDeleteConfirm)"
			/>            
        </template>

		<div class="m-0" v-if="user">
            <Panel header="Personal Data" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-500">First Name</label>
                        <p class="mt-1 text-sm  font-bold">{{ user.person?.firstName }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Last Name</label>
                        <p class="mt-1 text-sm  font-bold">{{ user.person?.lastName }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Document ID</label>
                        <p class="mt-1 text-sm  font-bold">{{ user.person?.documentId }}</p>
                    </div> 
                </div>
            </Panel>

            <Panel header="User Information" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Username</label>
                        <p class="mt-1 text-sm font-bold">{{ user.username }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Email</label>
                        <p class="mt-1 text-sm  font-bold">{{ user.email }}</p>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-500">Tenant ID</label>
                        <p class="mt-1 text-sm font-bold">{{ user.tenantId }}</p>
                    </div>
                </div>
            </Panel>

            <Panel header="Roles" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="mt-1 text-sm  font-bold">{{ user.roles.join(', ') }}</p>
                    </div>
                </div>
            </Panel>

            <Panel header="Groups" class="mt-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="mt-1 text-sm  font-bold">{{ user.groups.join(', ') }}</p>
                    </div>
                </div>
            </Panel>
		</div>
	</Page>
</template>