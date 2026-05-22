<template>
	<aside
		class="bg-white dark:bg-zinc-900 border-r border-gray-400 dark:border-emerald-900 shadow-md 
		z-20 fixed inset-y-0 left-0 
		transform transition-transform duration-200 ease-in-out 
		md:relative md:translate-x-0
		min-w-72
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
				{ label: 'Task Dashboard', icon: 'pi pi-chart-line', path: '/dashboard', command: () => { currentMenu.value = '/dashboard'; router.push('/dashboard'); } },
				{ label: 'Process Dashboard', icon: 'pi pi-chart-bar', path: '/process-dashboard', command: () => { currentMenu.value = '/process-dashboard'; router.push('/process-dashboard'); } }
			]
		},
		{
			label: 'Processes',
			icon: 'pi pi-sitemap',
			items: [
				{ label: 'All Processes', icon: 'pi pi-sitemap', path: '/processes', command: () => { currentMenu.value = '/processes'; router.push('/processes'); } },
				{ label: 'Instancias de Proceso', icon: 'pi pi-server', path: '/process-instances', command: () => { currentMenu.value = '/process-instances'; router.push('/process-instances'); } },
			]
		},
		{
			label: 'Tasks',
			icon: 'pi pi-list',
			items: [
				{ label: 'My Tasks', icon: 'pi pi-list-check', path: '/my-tasks', command: () => { currentMenu.value = '/my-tasks'; router.push('/my-tasks'); } },
				{ label: 'All Tasks', icon: 'pi pi-list-check', path: '/my-tasks', command: () => { currentMenu.value = '/my-tasks'; router.push('/my-tasks'); } },
			]
		},
		{
			label: 'Design',
			icon: 'pi pi-palette',
			items: [
				{ label: 'Process', icon: 'pi pi-palette', path: '/modeler', command: () => { currentMenu.value = '/modeler'; router.push('/modeler'); } },
				{ label: 'Form', icon: 'pi pi-file-edit', path: '/formbuilder', command: () => { currentMenu.value = '/formbuilder'; router.push('/formbuilder'); } }
			]
		},
		{
			label: 'System',
			icon: 'pi pi-cog',
			items: [
				{ label: 'Audit Logs', icon: 'pi pi-eye', path: '/audit', command: () => { currentMenu.value = '/audit'; router.push('/audit'); } },				
				{ label: 'Users', icon: 'pi pi-users', path: '/users', command: () => { currentMenu.value = '/users'; router.push('/users'); } },
				{ label: 'Roles', icon: 'pi pi-users', path: '/roles', command: () => { currentMenu.value = '/roles'; router.push('/roles'); } },
				{ label: 'Permissions', icon: 'pi pi-shield', path: '/permissions', command: () => { currentMenu.value = '/permissions'; router.push('/permissions'); } },
				{ label: 'Agenda', icon: 'pi pi-calendar', path: '/inspecciones', command: () => { currentMenu.value = '/inspecciones'; router.push('/inspecciones'); } },
				{ label: 'Variables', icon: 'pi pi-wrench', path: '/variables', command: () => { currentMenu.value = '/variables'; router.push('/variables'); } },
				{ label: 'Secrets', icon: 'pi pi-wrench', path: '/secrets', command: () => { currentMenu.value = '/secrets'; router.push('/secrets'); } },
				{ label: 'API Keys', icon: 'pi pi-key', path: '/api-keys', command: () => { currentMenu.value = '/api-keys'; router.push('/api-keys'); } }
			]
		}
	]);
</script>
