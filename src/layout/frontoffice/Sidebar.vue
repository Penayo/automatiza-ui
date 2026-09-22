<template>
	<aside
		class="border-r shadow-md
		z-20 fixed inset-y-0 left-0
		transform transition-all duration-200 ease-in-out
		md:relative
		w-72
		overflow-y-auto
		"
		style="
			background-color: var(--layout-sidebar-bg);
			border-color: var(--layout-sidebar-border);
		"
		:class="sidebarOpen
			? 'translate-x-0 md:w-72'
			: '-translate-x-full md:translate-x-0 md:w-16 overflow-x-hidden'"
	>
		<nav class="flex flex-col mt-4 text-base gap-2" :class="collapsed ? 'px-2 items-center' : 'px-2'">
			<button
				v-for="menu in menuItems"
				:key="menu.path"
				v-tooltip.right="collapsed ? menu.label : undefined"
				class="cursor-pointer rounded-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-row items-center transition-colors relative"
				:class="[
					{ 'sidebar-active font-semibold': currentMenu === menu.path },
					collapsed ? 'w-10 h-10 justify-center' : 'gap-4 px-4 py-2',
				]"
				:aria-label="menu.label"
				@click="go(menu.path)"
			>
				<span :class="menu.icon" style="font-size: 1.2rem" />
				<span v-if="!collapsed" class="flex-1 text-left">{{ menu.label }}</span>
				<!-- Pending task count — a full badge when expanded, a dot on the rail -->
				<template v-if="menu.path === '/my-tasks' && pendingCount > 0">
					<span
						v-if="collapsed"
						class="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500"
					/>
					<span
						v-else
						class="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-red-500 text-white"
					>
						{{ pendingCount > 99 ? '99+' : pendingCount }}
					</span>
				</template>
			</button>

			<!-- Data — browsable datasources, one section per group (§3) -->
			<template v-for="section in dataSections" :key="section.label">
				<!-- On the rail the group heading has no room; a divider keeps the grouping legible -->
				<hr v-if="collapsed" class="w-6 my-1 border-zinc-200 dark:border-zinc-700" />
				<p v-else class="px-4 pt-4 pb-1 text-xs uppercase tracking-wide text-zinc-400">{{ section.label }}</p>
				<button
					v-for="ds in section.items"
					:key="ds.key"
					v-tooltip.right="collapsed ? `${section.label} — ${ds.name}` : undefined"
					class="cursor-pointer rounded-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-row items-center transition-colors"
					:class="[
						{ 'sidebar-active font-semibold': route.path.startsWith('/data/' + ds.key) },
						collapsed ? 'w-10 h-10 justify-center' : 'gap-4 px-4 py-2',
					]"
					:aria-label="ds.name"
					@click="go('/data/' + ds.key)"
				>
					<span :class="ds.icon?.trim() || 'pi pi-table'" style="font-size: 1.2rem" />
					<span v-if="!collapsed" class="flex-1 text-left">{{ ds.name }}</span>
				</button>
			</template>
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
	import { DatasourcesService, type BrowsableDatasource } from '@services/DatasourcesService';
	import { useSidebar } from '@/composables/useSidebar';

	const props = defineProps({ sidebarOpen: Boolean });
	defineEmits(['toggle-sidebar']);

	const { isDesktop } = useSidebar();

	// Closed on desktop means the icon rail; closed on mobile means off-canvas,
	// where the full labelled menu is what slides back in.
	const collapsed = computed(() => isDesktop.value && !props.sidebarOpen);

	const router       = useRouter();
	const route        = useRoute();
	const pendingCount = ref(0);
	const dataSources  = ref<BrowsableDatasource[]>([]);

	const menuItems = [
		{ label: 'Dashboard', icon: 'pi pi-chart-line',  path: '/dashboard'  },
		{ label: 'My Tasks',  icon: 'pi pi-list-check',  path: '/my-tasks'   },
		{ label: 'Processes', icon: 'pi pi-sitemap',     path: '/processes'  },
		{ label: 'Documents', icon: 'pi pi-folder-open', path: '/documents'  },
	];

	/**
	 * The Data menu, split into one section per `group` (§3). Ungrouped datasources
	 * keep the plain "Data" heading and lead, so a tenant that never sets a group
	 * sees exactly the menu it saw before. `browsable` already returns them ordered
	 * by group then name, so insertion order is the display order.
	 */
	const dataSections = computed(() => {
		const sections: { label: string; items: BrowsableDatasource[] }[] = [];
		const byLabel = new Map<string, { label: string; items: BrowsableDatasource[] }>();

		for (const ds of dataSources.value) {
			const label = ds.group?.trim() || 'Data';
			let section = byLabel.get(label);
			if (!section) {
				section = { label, items: [] };
				byLabel.set(label, section);
				// "Data" first regardless of where the first ungrouped datasource lands.
				if (label === 'Data') sections.unshift(section);
				else sections.push(section);
			}
			section.items.push(ds);
		}

		return sections;
	});

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

	async function loadDataSources() {
		try {
			dataSources.value = await new DatasourcesService().browsable();
		} catch {
			// informational — the "Data" section simply doesn't appear
		}
	}

	onMounted(() => {
		refreshPendingCount();
		loadDataSources();
		pollTimer = setInterval(refreshPendingCount, 60_000);
	});

	onUnmounted(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	function go(path: string) {
		router.push(path);
	}
</script>
