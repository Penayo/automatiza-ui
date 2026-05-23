<script setup lang="ts">
import { useTheme } from '@/composables/useTheme';

defineProps({ sidebarOpen: Boolean })
defineEmits(['toggle-sidebar'])

const { isDark, toggle } = useTheme();
</script>

<template>
	<header
		class="flex items-center justify-between px-4 py-2 shadow-sm relative border-b"
		style="
			background-color: var(--layout-header-bg);
			color: var(--layout-header-text);
			border-color: var(--layout-header-border);
		"
	>
		<!-- Hamburger (mobile) -->
		<button
			class="md:hidden mr-2 opacity-70 hover:opacity-100"
			style="color: var(--layout-header-text);"
			@click="$emit('toggle-sidebar', !sidebarOpen)"
			aria-label="Open sidebar"
		>
			<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
			</svg>
		</button>

		<!-- Logo -->
		<div class="flex-1 flex md:justify-start justify-center items-center">
			<img src="/logo.png" alt="Logo" class="h-10" />
		</div>

		<!-- Right side -->
		<div class="flex items-center gap-3 ml-auto">
			<!-- Dark / light toggle -->
			<button
				@click="toggle"
				class="w-9 h-9 flex items-center justify-center rounded-full opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
				style="color: var(--layout-header-text);"
				:aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
			>
				<i :class="isDark ? 'pi pi-sun text-lg' : 'pi pi-moon text-lg'" />
			</button>

			<!-- User info -->
			<span class="font-semibold hidden sm:block" style="color: var(--layout-header-text);">John Doe</span>
			<img
				src="https://randomuser.me/api/portraits/men/32.jpg"
				alt="Avatar"
				class="w-9 h-9 rounded-full border-2 border-gray-300 dark:border-gray-600"
			/>
		</div>
	</header>
</template>
