<template>
	<aside
		class="border-r shadow-md
		z-20 fixed inset-y-0 left-0
		transform transition-transform duration-200 ease-in-out
		md:relative md:translate-x-0
		min-w-72
		"
		style="
			background-color: var(--layout-sidebar-bg);
			border-color: var(--layout-sidebar-border);
		"
		:class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
	>
		<nav class="flex flex-col mt-4 text-base px-2 gap-2">
			<PanelMenu :model="menuItems" class="w-full md:w-80 pt-1">
				<template #item="{ item }">
					<a v-ripple class="flex items-center px-4 py-2 cursor-pointer group">
						<span :class="[item.icon, 'text-primary group-hover:text-inherit']" />
						<span :class="['ml-2', { 'font-semibold': item.items }]">{{ item.label }}</span>
						<Badge v-if="item.badge" class="ml-auto" :value="item.badge" />
						<span v-if="item.shortcut" class="ml-auto border border-surface rounded bg-emphasis text-muted-color text-xs p-1">{{ item.shortcut }}</span>
					</a>
				</template>
			</PanelMenu>
		</nav>
	</aside>

	<!-- Overlay for mobile sidebar -->
	<div
		v-if="sidebarOpen"
		class="fixed inset-0 bg-zinc-500/50 z-10 md:hidden"
		@click="$emit('toggle-sidebar', !sidebarOpen)"
	/>
</template>

<script setup lang="ts">
	import { PanelMenu } from 'primevue';
	import { ref } from 'vue';
	import { useRouter } from 'vue-router';

	defineProps({
		sidebarOpen: Boolean
	})

	const emit = defineEmits(['toggle-sidebar'])
	const router = useRouter();
	const currentMenu = ref('dashboard')

	const menuItems = ref([
		{
			label: 'Dashboards',
			icon: 'pi pi-chart-pie',
			items: [
				{ label: 'Task Dashboard', icon: 'pi pi-chart-line', path: '/admin/dashboard', command: () => { currentMenu.value = '/admin/dashboard'; router.push('/admin/dashboard'); } },
				{ label: 'Process Dashboard', icon: 'pi pi-chart-bar', path: '/admin/process-dashboard', command: () => { currentMenu.value = '/admin/process-dashboard'; router.push('/admin/process-dashboard'); } }
			]
		},
		{
			label: 'Processes',
			icon: 'pi pi-sitemap',
			items: [
				{ label: 'All Processes', icon: 'pi pi-sitemap', path: '/admin/processes', command: () => { currentMenu.value = '/admin/processes'; router.push('/admin/processes'); } },
				{ label: 'Process Instances', icon: 'pi pi-server', path: '/admin/process-instances', command: () => { currentMenu.value = '/admin/process-instances'; router.push('/admin/process-instances'); } },
			]
		},
		{
			label: 'Tasks',
			icon: 'pi pi-list',
			items: [
				{ label: 'All Tasks', icon: 'pi pi-list-check', path: '/admin/tasks', command: () => { currentMenu.value = '/admin/tasks'; router.push('/admin/tasks'); } },
			]
		},
		{
			label: 'Design',
			icon: 'pi pi-palette',
			items: [
				{ label: 'Process', icon: 'pi pi-palette', path: '/admin/modeler', command: () => { currentMenu.value = '/admin/modeler'; router.push('/admin/modeler'); } },
				{ label: 'Form', icon: 'pi pi-file-edit', path: '/admin/formbuilder', command: () => { currentMenu.value = '/admin/formbuilder'; router.push('/admin/formbuilder'); } }
			]
		},
		{
			label: 'System',
			icon: 'pi pi-cog',
			items: [
				{ label: 'Audit Logs', icon: 'pi pi-eye', path: '/admin/audit', command: () => { currentMenu.value = '/admin/audit'; router.push('/admin/audit'); } },
				{ label: 'Users', icon: 'pi pi-users', path: '/admin/users', command: () => { currentMenu.value = '/admin/users'; router.push('/admin/users'); } },
				{ label: 'Roles', icon: 'pi pi-users', path: '/admin/roles', command: () => { currentMenu.value = '/admin/roles'; router.push('/admin/roles'); } },
				{ label: 'Permissions', icon: 'pi pi-shield', path: '/admin/permissions', command: () => { currentMenu.value = '/admin/permissions'; router.push('/admin/permissions'); } },
				{ label: 'Variables', icon: 'pi pi-wrench', path: '/admin/variables', command: () => { currentMenu.value = '/admin/variables'; router.push('/admin/variables'); } },
				{ label: 'Secrets', icon: 'pi pi-wrench', path: '/admin/secrets', command: () => { currentMenu.value = '/admin/secrets'; router.push('/admin/secrets'); } },
				{ label: 'API Keys', icon: 'pi pi-key', path: '/admin/api-keys', command: () => { currentMenu.value = '/admin/api-keys'; router.push('/admin/api-keys'); } }
			]
		}
	]);
</script>
