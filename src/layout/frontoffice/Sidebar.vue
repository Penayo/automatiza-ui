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
			<button
				v-for="menu in menuItems"
				class="cursor-pointer rounded-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-row items-center gap-4 px-4 py-2 transition-colors"
				:class="{ 'sidebar-active font-semibold': currentMenu == menu.path }"
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
	const currentMenu = ref('/my-tasks')

	const menuItems = [
		{ label: 'Dashboard', icon: 'pi pi-chart-line', path: '/dashboard' },
		{ label: 'Mis Tareas', icon: 'pi pi-list-check', path: '/my-tasks' },
	]

	function go(path: string) {
		currentMenu.value = path;
		router.push(path);
	}
</script>
