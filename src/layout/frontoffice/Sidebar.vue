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
				:key="menu.path"
				class="cursor-pointer rounded-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-row items-center gap-4 px-4 py-2 transition-colors"
				:class="{ 'sidebar-active font-semibold': currentMenu === menu.path }"
				@click="go(menu.path)"
			>
				<span :class="menu.icon" style="font-size: 1.2rem" />
				<span class="flex-1 text-left">{{ menu.label }}</span>
				<!-- Pending task count badge -->
				<span
					v-if="menu.path === '/my-tasks' && pendingCount > 0"
					class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white"
				>
					{{ pendingCount > 99 ? '99+' : pendingCount }}
				</span>
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
	import { ref, computed, onMounted, onUnmounted } from 'vue';
	import { useRouter, useRoute } from 'vue-router';
	import { $api } from '@services/api';

	defineProps({ sidebarOpen: Boolean });
	defineEmits(['toggle-sidebar']);

	const router       = useRouter();
	const route        = useRoute();
	const pendingCount = ref(0);

	const menuItems = [
		{ label: 'Dashboard', icon: 'pi pi-chart-line', path: '/dashboard' },
		{ label: 'My Tasks',  icon: 'pi pi-list-check', path: '/my-tasks'  },
		{ label: 'Processes', icon: 'pi pi-sitemap',    path: '/processes' },
	];

	// Highlight the item whose path matches or is a prefix of the current route
	const currentMenu = computed(() =>
		menuItems.find(m => route.path === m.path || route.path.startsWith(m.path + '/'))?.path ?? ''
	);

	let pollTimer: ReturnType<typeof setInterval> | null = null;

	async function refreshPendingCount() {
		try {
			const tasks = await $api.tasks.getAvailableTasks();
			pendingCount.value = Array.isArray(tasks) ? tasks.length : 0;
		} catch {
			// informational — never break the sidebar
		}
	}

	onMounted(() => {
		refreshPendingCount();
		pollTimer = setInterval(refreshPendingCount, 60_000);
	});

	onUnmounted(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	function go(path: string) {
		router.push(path);
	}
</script>
