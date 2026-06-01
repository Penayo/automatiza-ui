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
					<a v-ripple class="flex items-center px-4 py-2 cursor-pointer group" @click="item.command?.()">
						<span :class="[item.icon, 'text-primary group-hover:text-inherit']" />
						<span :class="['ml-2', { 'font-semibold': item.items }]">{{ item.label }}</span>
						<!-- Dynamic failed-instances badge on Process Instances item -->
						<Badge
							v-if="item.label === 'Process Instances' && failedCount > 0"
							:value="failedCount"
							severity="danger"
							class="ml-auto"
						/>
						<Badge v-else-if="item.badge" class="ml-auto" :value="item.badge" />
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
	import { Badge, PanelMenu } from 'primevue';
	import { onMounted, onUnmounted, ref } from 'vue';
	import { useRouter } from 'vue-router';
	import { DashboardService } from '@services/DashboardService';

	defineProps({ sidebarOpen: Boolean });
	const emit = defineEmits(['toggle-sidebar']);

	const router      = useRouter();
	const currentMenu = ref('dashboard');
	const failedCount = ref(0);

	// Poll every 60 seconds so the badge stays fresh without a full page reload
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	async function refreshFailedCount() {
		try {
			failedCount.value = await DashboardService.getFailedInstancesCount();
		} catch {
			// silently ignore — badge is informational, not critical
		}
	}

	onMounted(() => {
		refreshFailedCount();
		pollTimer = setInterval(refreshFailedCount, 60_000);
	});

	onUnmounted(() => {
		if (pollTimer) clearInterval(pollTimer);
	});

	const nav = (path: string) => { currentMenu.value = path; router.push(path); };

	const menuItems = ref([
		{
			label: 'Dashboards',
			icon: 'pi pi-chart-pie',
			items: [
				{ label: 'Task Dashboard',    icon: 'pi pi-chart-line', command: () => nav('/admin/dashboard') },
				{ label: 'Process Dashboard', icon: 'pi pi-chart-bar',  command: () => nav('/admin/process-dashboard') },
			]
		},
		{
			label: 'Processes',
			icon: 'pi pi-sitemap',
			items: [
				{ label: 'All Processes',      icon: 'pi pi-sitemap', command: () => nav('/admin/processes') },
				{ label: 'Process Instances',  icon: 'pi pi-server',  command: () => nav('/admin/process-instances') },
			]
		},
		{
			label: 'Tasks',
			icon: 'pi pi-list',
			items: [
				{ label: 'All Tasks', icon: 'pi pi-list-check', command: () => nav('/admin/tasks') },
			]
		},
		{
			label: 'Design',
			icon: 'pi pi-palette',
			items: [
				{ label: 'Process',   icon: 'pi pi-palette',   command: () => nav('/admin/modeler') },
				{ label: 'Form',      icon: 'pi pi-file-edit', command: () => nav('/admin/formbuilder') },
				{ label: 'Decision',      icon: 'pi pi-table',     command: () => nav('/admin/decisions') },
				{ label: 'Form Variables', icon: 'pi pi-list',      command: () => nav('/admin/form-variables') },
				{ label: 'Reports',        icon: 'pi pi-file-pdf',  command: () => nav('/admin/reports') },
				{ label: 'Email Templates', icon: 'pi pi-envelope',  command: () => nav('/admin/email-templates') },
			]
		},
		{
			label: 'Documentation',
			icon: 'pi pi-book',
			items: [
				{ label: 'FEEL Expressions',   icon: 'pi pi-code',     command: () => nav('/admin/docs/feel-expressions') },
				{ label: 'Timer Events',        icon: 'pi pi-clock',    command: () => nav('/admin/docs/timer-events') },
				{ label: 'Process Variables',   icon: 'pi pi-database', command: () => nav('/admin/docs/process-variables') },
				{ label: 'Service Tasks',       icon: 'pi pi-cog',      command: () => nav('/admin/docs/service-tasks') },
			]
		},
		{
			label: 'System',
			icon: 'pi pi-cog',
			items: [
				{ label: 'Audit Logs',  icon: 'pi pi-eye',          command: () => nav('/admin/audit') },
				{ label: 'Messages',    icon: 'pi pi-envelope',     command: () => nav('/admin/messages') },
				{ label: 'Users',       icon: 'pi pi-users',   command: () => nav('/admin/users') },
				{ label: 'Roles',       icon: 'pi pi-users',   command: () => nav('/admin/roles') },
				{ label: 'Permissions', icon: 'pi pi-shield',  command: () => nav('/admin/permissions') },
				{ label: 'Variables',   icon: 'pi pi-wrench',  command: () => nav('/admin/variables') },
				{ label: 'Secrets',     icon: 'pi pi-wrench',  command: () => nav('/admin/secrets') },
				{ label: 'API Keys',    icon: 'pi pi-key',     command: () => nav('/admin/api-keys') },
			]
		},
	]);
</script>
