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
			<button
				v-for="menu in menuItems"
				class="cursor-pointer rounded-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-emerald-100 flex flex-row items-center gap-4 px-4 py-2"
				:class="{ 'bg-green-200 text-emerald-600! dark:text-emerald-100! dark:bg-emerald-800! font-semibold': currentMenu == menu.path }"
				@click="go(menu.path)"
			>
				<span :class="menu.icon" style="font-size: 1.2rem"></span>
				<span>{{ menu.label }}</span>
			</button>
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
	import { ref } from 'vue';
	import { useRouter } from 'vue-router';

	defineProps({
		sidebarOpen: Boolean
	})

	const emit = defineEmits(['toggle-sidebar'])
	const router = useRouter();
	const currentMenu = ref('dashboard')

	const menuItems = [
		{ label: 'Dashboard', icon: 'pi pi-chart-line', path: '/dashboard' },
		{ label: 'Modeler', icon: 'pi pi-chart-line', path: '/modeler' },
		{ label: 'Form Builder', icon: 'pi pi-address-book', path: '/formbuilder' },
		{ label: 'Procesos', icon: 'pi pi-sitemap', path: '/processes' },
		{ label: 'Instancias de Proceso', icon: 'pi pi-server', path: '/process-instances' },
		
		{ label: 'Mis Tareas', icon: 'pi pi-list-check', path: '/my-tasks' },
		{ label: 'Todas las Tareas', icon: 'pi pi-list-check', path: '/tasks' },

		{ label: 'Users', icon: 'pi pi-users', path: '/users' },
		{ label: 'Roles', icon: 'pi pi-users', path: '/roles' },
		{ label: 'Permissions', icon: 'pi pi-shield', path: '/permissions' },
		{ label: 'Agenda', icon: 'pi pi-calendar', path: '/inspecciones' },
		{ label: 'Variables', icon: 'pi pi-wrench', path: 'variables' },
		// BPMN Engine menu items

	]

	function go(path: string) {
		currentMenu.value = path;
		router.push(path);
		console.log('CURRENT PATH', currentMenu.value, path)
	}
</script>
